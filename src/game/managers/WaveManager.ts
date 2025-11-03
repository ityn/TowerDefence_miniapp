import * as Phaser from 'phaser';
import type { WaveConfig, WaveProgress } from '@/types/gameTypes';
import type { WaveStartedEvent, WaveCompletedEvent } from '@/types/waveTypes';
import { WaveEvents } from '@/types/waveTypes';
import { EnemyManager } from './EnemyManager';
import type { Path } from '@/types/mapTypes';

/**
 * Менеджер для управления волнами врагов
 */
export class WaveManager extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private enemyManager: EnemyManager;
  private waves: WaveConfig[] = [];
  private currentWaveIndex: number = -1;
  private waveProgress: WaveProgress;
  private path: Path | null = null;

  // Таймеры
  private waveStartTimer: Phaser.Time.TimerEvent | null = null;
  private spawnTimers: Phaser.Time.TimerEvent[] = [];

  // Состояние
  private isWaveInProgress: boolean = false;
  private totalEnemiesInWave: number = 0;
  private enemiesSpawned: number = 0;

  constructor(scene: Phaser.Scene, enemyManager: EnemyManager) {
    super();
    this.scene = scene;
    this.enemyManager = enemyManager;

    this.waveProgress = {
      currentWave: 0,
      totalWaves: 0,
      enemiesSpawned: 0,
      enemiesTotal: 0,
      enemiesAlive: 0,
      timeUntilNextWave: 0,
      isWaveInProgress: false,
    };

    // Подписываемся на события EnemyManager
    this.enemyManager.on(WaveEvents.ENEMY_DIED, () => {
      this.updateWaveProgress();
    });

    this.enemyManager.on(WaveEvents.ENEMY_REACHED_END, () => {
      this.updateWaveProgress();
    });
  }

  /**
   * Загружает конфигурацию волн для указанной карты
   */
  async loadWaves(mapId: string): Promise<void> {
    try {
      const response = await fetch('/data/waves-config.json');
      
      if (!response.ok) {
        throw new Error('Failed to load waves config');
      }

      const configs: Record<string, WaveConfig[]> = await response.json();
      const waveKey = `map_${mapId}`;
      
      if (!configs[waveKey]) {
        throw new Error(`No waves found for map: ${waveKey}`);
      }

      this.waves = configs[waveKey];
      this.waveProgress.totalWaves = this.waves.length;
      this.waveProgress.currentWave = 0;

      console.log(`Loaded ${this.waves.length} waves for map ${mapId}`);
    } catch (error) {
      console.error('Error loading waves:', error);
      throw error;
    }
  }

  /**
   * Устанавливает путь для движения врагов
   */
  setPath(path: Path): void {
    this.path = path;
  }

  /**
   * Начинает следующую волну
   */
  startNextWave(): boolean {
    if (this.isWaveInProgress) {
      console.warn('Wave already in progress');
      return false;
    }

    if (!this.path) {
      console.error('Path not set for wave manager');
      return false;
    }

    this.currentWaveIndex++;

    if (this.currentWaveIndex >= this.waves.length) {
      this.emit(WaveEvents.ALL_WAVES_COMPLETED);
      return false;
    }

    const wave = this.waves[this.currentWaveIndex];
    this.prepareWave(wave);

    // Если есть задержка до начала волны, устанавливаем таймер
    if (wave.preWaveDelay > 0 && this.currentWaveIndex > 0) {
      this.scheduleWaveStart(wave);
    } else {
      this.executeWaveStart(wave);
    }

    return true;
  }

  /**
   * Подготавливает волну
   */
  private prepareWave(wave: WaveConfig): void {
    // Подсчитываем общее количество врагов в волне
    this.totalEnemiesInWave = wave.enemies.reduce(
      (total, enemy) => total + enemy.count,
      0
    );
    
    this.enemiesSpawned = 0;
    this.isWaveInProgress = true;

    this.updateWaveProgress();
  }

  /**
   * Планирует начало волны с задержкой
   */
  private scheduleWaveStart(wave: WaveConfig): void {
    let timeRemaining = wave.preWaveDelay * 1000; // Конвертируем в миллисекунды

    // Обновляем прогресс каждую секунду
    const progressUpdate = this.scene.time.addEvent({
      delay: 1000,
      callback: () => {
        timeRemaining -= 1000;
        this.waveProgress.timeUntilNextWave = Math.max(0, timeRemaining / 1000);
        this.updateWaveProgress();
      },
      callbackScope: this,
      repeat: Math.floor(wave.preWaveDelay) - 1,
    });

    // Запускаем волну после задержки
    this.waveStartTimer = this.scene.time.addEvent({
      delay: wave.preWaveDelay * 1000,
      callback: () => {
        progressUpdate.destroy();
        this.executeWaveStart(wave);
      },
      callbackScope: this,
    });
  }

  /**
   * Выполняет начало волны (без задержки)
   */
  private executeWaveStart(wave: WaveConfig): void {
    this.waveProgress.timeUntilNextWave = 0;
    this.waveProgress.isWaveInProgress = true;

    const eventData: WaveStartedEvent = {
      waveNumber: wave.waveNumber,
      description: wave.description,
    };

    this.emit(WaveEvents.WAVE_STARTED, eventData);

    // Спавним всех врагов волны
    this.spawnWaveEnemies(wave);
  }

  /**
   * Спавнит всех врагов волны с соответствующими задержками
   */
  private spawnWaveEnemies(wave: WaveConfig): void {
    let totalDelay = 0;

    wave.enemies.forEach((waveEnemy) => {
      for (let i = 0; i < waveEnemy.count; i++) {
        const spawnTimer = this.scene.time.addEvent({
          delay: totalDelay * 1000, // Конвертируем в миллисекунды
          callback: () => {
            if (this.path) {
              this.enemyManager.createEnemy(
                waveEnemy.type,
                this.path
              );
              this.enemiesSpawned++;
              this.updateWaveProgress();
            }
          },
          callbackScope: this,
        });

        this.spawnTimers.push(spawnTimer);
        totalDelay += waveEnemy.spawnDelay;
      }
    });
  }

  /**
   * Ускоряет начало следующей волны (пропускает таймер)
   */
  skipWaveDelay(): void {
    if (this.waveStartTimer && !this.waveStartTimer.hasDispatched) {
      this.waveStartTimer.destroy();
      this.waveStartTimer = null;

      if (this.currentWaveIndex >= 0 && this.currentWaveIndex < this.waves.length) {
        const wave = this.waves[this.currentWaveIndex];
        this.executeWaveStart(wave);
      }
    }
  }

  /**
   * Обновляет прогресс волны
   */
  private updateWaveProgress(): void {
    this.waveProgress.currentWave = this.currentWaveIndex + 1;
    this.waveProgress.enemiesSpawned = this.enemiesSpawned;
    this.waveProgress.enemiesTotal = this.totalEnemiesInWave;
    this.waveProgress.enemiesAlive = this.enemyManager.getEnemyCount();
    this.waveProgress.isWaveInProgress = this.isWaveInProgress;

    // Проверяем, завершена ли волна
    if (
      this.isWaveInProgress &&
      this.enemiesSpawned >= this.totalEnemiesInWave &&
      this.enemyManager.getEnemyCount() === 0
    ) {
      this.completeWave();
    }

    this.emit(WaveEvents.WAVE_PROGRESS_UPDATED, { ...this.waveProgress });
  }

  /**
   * Завершает текущую волну
   */
  private completeWave(): void {
    if (!this.isWaveInProgress) return;

    this.isWaveInProgress = false;
    const wave = this.waves[this.currentWaveIndex];
    
    // Начисляем награду
    const eventData: WaveCompletedEvent = {
      waveNumber: wave.waveNumber,
      reward: wave.reward,
    };

    this.emit(WaveEvents.WAVE_COMPLETED, eventData);
    
    // Очищаем таймеры спавна
    this.spawnTimers.forEach(timer => {
      if (timer && !timer.hasDispatched) {
        timer.destroy();
      }
    });
    this.spawnTimers = [];

    this.updateWaveProgress();
  }

  /**
   * Получает текущий прогресс волны
   */
  getWaveProgress(): WaveProgress {
    return { ...this.waveProgress };
  }

  /**
   * Проверяет, идет ли волна
   */
  isWaveActive(): boolean {
    return this.isWaveInProgress;
  }

  /**
   * Сбрасывает менеджер волн
   */
  reset(): void {
    this.currentWaveIndex = -1;
    this.isWaveInProgress = false;
    this.totalEnemiesInWave = 0;
    this.enemiesSpawned = 0;

    // Очищаем таймеры
    if (this.waveStartTimer) {
      this.waveStartTimer.destroy();
      this.waveStartTimer = null;
    }

    this.spawnTimers.forEach(timer => timer.destroy());
    this.spawnTimers = [];

    this.waveProgress = {
      currentWave: 0,
      totalWaves: this.waves.length,
      enemiesSpawned: 0,
      enemiesTotal: 0,
      enemiesAlive: 0,
      timeUntilNextWave: 0,
      isWaveInProgress: false,
    };
  }

  /**
   * Обновляет менеджер (вызывается каждый кадр)
   */
  update(): void {
    // Обновление происходит через события
  }
}

