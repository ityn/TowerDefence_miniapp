import * as Phaser from 'phaser';
import type { PerformanceConfig, PerformanceMetrics } from '@/types/performanceTypes';
import { ObjectPool } from './ObjectPool';
import { Enemy } from '@/game/objects/Enemy';
import { Projectile } from '@/game/objects/Projectile';

/**
 * Менеджер производительности - контролирует все аспекты оптимизации
 */
export class PerformanceManager {
  private scene: Phaser.Scene;
  private config!: PerformanceConfig;
  private metrics!: PerformanceMetrics;

  // Object pools
  private enemyPool: ObjectPool<Enemy> | null = null;
  private projectilePool: ObjectPool<Projectile> | null = null;

  // Memory management
  private gcTimer: Phaser.Time.TimerEvent | null = null;
  private lastGCTime: number = 0;

  // FPS tracking
  private fpsHistory: number[] = [];
  private frameTimeHistory: number[] = [];
  private lastFrameTime: number = 0;

  // Mobile detection
  private isMobile: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.config = this.getDefaultConfig();
    this.metrics = this.createInitialMetrics();
    this.detectDevice();
    this.loadConfig().then(() => {
      this.initialize();
    });
  }

  /**
   * Загружает конфигурацию
   */
  private async loadConfig(): Promise<void> {
    try {
      const response = await fetch('/data/performance-config.json');
      if (response.ok) {
        const loaded = await response.json();
        this.config = { ...this.config, ...loaded };
      }
    } catch (error) {
      console.error('Error loading performance config:', error);
    }
  }

  /**
   * Получает дефолтную конфигурацию
   */
  private getDefaultConfig(): PerformanceConfig {
    return {
      objectPooling: {
        enemies: { initial: 50, max: 100 },
        projectiles: { initial: 30, max: 60 },
        particles: { initial: 100, max: 200 },
        effects: { initial: 20, max: 40 },
      },
      memoryManagement: {
        autoCleanup: true,
        gcInterval: 30000,
        textureAtlas: true,
        maxCacheSize: 100,
        clearUnusedTextures: true,
      },
      mobileOptimization: {
        maxFPS: 60,
        textureCompression: true,
        reducedEffects: false,
        adaptiveQuality: true,
        batterySaver: false,
      },
      debugMode: false,
    };
  }

  /**
   * Создает начальные метрики
   */
  private createInitialMetrics(): PerformanceMetrics {
    return {
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      activeObjects: {
        enemies: 0,
        projectiles: 0,
        particles: 0,
      },
      poolUtilization: {
        enemies: 0,
        projectiles: 0,
        particles: 0,
      },
    };
  }

  /**
   * Определяет устройство
   */
  private detectDevice(): void {
    const ua = navigator.userAgent;
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

    // Применяем мобильные настройки
    if (this.isMobile && this.config.mobileOptimization.batterySaver) {
      this.config.mobileOptimization.reducedEffects = true;
      this.config.mobileOptimization.maxFPS = 30;
    }
  }

  /**
   * Инициализирует системы
   */
  private initialize(): void {
    this.initializeObjectPools();
    this.initializeMemoryManagement();
    this.initializePerformanceTracking();
  }

  /**
   * Инициализирует пулы объектов
   */
  private initializeObjectPools(): void {
    // Enemy pool будет инициализирован в EnemyManager
    // Projectile pool уже есть в ProjectileSystem
    // Здесь только настраиваем конфигурацию
  }

  /**
   * Инициализирует управление памятью
   */
  private initializeMemoryManagement(): void {
    if (this.config.memoryManagement.autoCleanup) {
      this.gcTimer = this.scene.time.addEvent({
        delay: this.config.memoryManagement.gcInterval,
        callback: this.performGarbageCollection,
        callbackScope: this,
        loop: true,
      });
    }
  }

  /**
   * Инициализирует отслеживание производительности
   */
  private initializePerformanceTracking(): void {
    this.lastFrameTime = this.scene.time.now;
  }

  /**
   * Обновляет метрики производительности
   */
  update(delta: number): void {
    // Обновляем FPS
    const currentTime = this.scene.time.now;
    const frameTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }

    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    this.metrics.frameTime = avgFrameTime;
    this.metrics.fps = Math.round(1000 / avgFrameTime);

    // Обновляем метрики пулов
    if (this.enemyPool) {
      this.metrics.activeObjects.enemies = this.enemyPool.getActiveCount();
      this.metrics.poolUtilization.enemies = this.enemyPool.getUtilization();
    }

    if (this.projectilePool) {
      this.metrics.activeObjects.projectiles = this.projectilePool.getActiveCount();
      this.metrics.poolUtilization.projectiles = this.projectilePool.getUtilization();
    }

    // Адаптивная оптимизация
    if (this.config.mobileOptimization.adaptiveQuality) {
      this.adaptiveOptimization();
    }

    // Проверка памяти (если доступно)
    if ('memory' in performance) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
  }

  /**
   * Адаптивная оптимизация на основе производительности
   */
  private adaptiveOptimization(): void {
    const targetFPS = this.config.mobileOptimization.maxFPS;
    const currentFPS = this.metrics.fps;
    const threshold = targetFPS * 0.8; // 80% от целевого FPS

    if (currentFPS < threshold && !this.config.mobileOptimization.reducedEffects) {
      // Снижаем качество эффектов
      this.config.mobileOptimization.reducedEffects = true;
      console.log('Performance warning: Reduced effects enabled');
    } else if (currentFPS > targetFPS * 1.1 && this.config.mobileOptimization.reducedEffects) {
      // Восстанавливаем качество
      this.config.mobileOptimization.reducedEffects = false;
      console.log('Performance good: Effects restored');
    }
  }

  /**
   * Выполняет сборку мусора
   */
  private performGarbageCollection(): void {
    const now = Date.now();
    if (now - this.lastGCTime < this.config.memoryManagement.gcInterval) {
      return;
    }

    this.lastGCTime = now;

    // Очистка неиспользуемых текстур
    if (this.config.memoryManagement.clearUnusedTextures) {
      // В Phaser нет removeAll, очищаем по-другому
      // Можно очистить через textureManager.remove или оставить как есть
      // this.scene.textures.remove('texture_key');
    }

    // Принудительная сборка мусора (если доступно)
    if ('gc' in window && this.config.debugMode) {
      (window as any).gc();
    }

    console.log('Garbage collection performed');
  }

  /**
   * Устанавливает пул врагов
   */
  setEnemyPool(pool: ObjectPool<Enemy>): void {
    this.enemyPool = pool;
  }

  /**
   * Устанавливает пул снарядов
   */
  setProjectilePool(pool: ObjectPool<Projectile>): void {
    this.projectilePool = pool;
  }

  /**
   * Получает метрики производительности
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Получает конфигурацию
   */
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  /**
   * Проверяет, нужно ли снизить качество эффектов
   */
  shouldReduceEffects(): boolean {
    return this.config.mobileOptimization.reducedEffects;
  }

  /**
   * Проверяет, мобильное ли устройство
   */
  isMobileDevice(): boolean {
    return this.isMobile;
  }

  /**
   * Уничтожает менеджер
   */
  destroy(): void {
    if (this.gcTimer) {
      this.gcTimer.remove();
    }

    if (this.enemyPool) {
      this.enemyPool.clear();
    }

    if (this.projectilePool) {
      this.projectilePool.clear();
    }
  }
}

