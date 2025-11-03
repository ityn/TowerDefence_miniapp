import * as Phaser from 'phaser';
import { Enemy } from '@/game/objects/Enemy';
import type { EnemyConfigData } from '@/types/gameTypes';
import { EnemyType } from '@/types/gameTypes';
import type { Path } from '@/types/mapTypes';
import type { EnemyDiedEvent } from '@/types/waveTypes';
import { WaveEvents } from '@/types/waveTypes';

/**
 * Менеджер для создания и управления врагами
 */
export class EnemyManager extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private enemies: Enemy[] = [];
  private enemyConfigs: Map<string, EnemyConfigData> = new Map();

  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
  }

  /**
   * Загружает конфигурации врагов из JSON
   */
  async loadEnemyConfigs(): Promise<void> {
    try {
      const response = await fetch('/data/enemies-config.json');
      
      if (!response.ok) {
        throw new Error('Failed to load enemy configs');
      }

      const configs: Record<string, EnemyConfigData> = await response.json();
      
      // Сохраняем конфиги в Map
      Object.entries(configs).forEach(([type, config]) => {
        this.enemyConfigs.set(type, config);
      });

      console.log(`Loaded ${this.enemyConfigs.size} enemy types`);
    } catch (error) {
      console.error('Error loading enemy configs:', error);
      throw error;
    }
  }

  /**
   * Создает врага указанного типа
   */
  createEnemy(
    type: string,
    path: Path,
    x?: number,
    y?: number
  ): Enemy | null {
    const config = this.enemyConfigs.get(type);
    
    if (!config) {
      console.error(`Enemy config not found for type: ${type}`);
      return null;
    }

    // Используем первую точку пути если позиция не указана
    const startX = x ?? path.waypoints[0].x;
    const startY = y ?? path.waypoints[0].y;

    // Преобразуем строковый тип в EnemyType enum
    const enemyType = this.stringToEnemyType(type);

    const enemy = new Enemy(
      this.scene,
      startX,
      startY,
      enemyType,
      config.health,
      config.speed,
      path
    );

    // Подписываемся на события врага
    enemy.on('reachedEnd', () => {
      this.handleEnemyReachedEnd(enemy);
    });

    enemy.on('died', () => {
      this.handleEnemyDied(enemy, config.bounty);
    });

    this.enemies.push(enemy);
    this.scene.add.existing(enemy);

    // Эмитим событие создания врага
    this.emit(WaveEvents.ENEMY_SPAWNED, enemy);

    return enemy;
  }

  /**
   * Преобразует строковый тип в EnemyType enum
   */
  private stringToEnemyType(type: string): EnemyType {
    switch (type.toLowerCase()) {
      case 'slow':
        return EnemyType.SLOW;
      case 'fast':
        return EnemyType.FAST;
      case 'tank':
        return EnemyType.TANK;
      case 'swarm':
        return EnemyType.SWARM;
      default:
        console.warn(`Unknown enemy type: ${type}, using SLOW`);
        return EnemyType.SLOW;
    }
  }

  /**
   * Обработчик события достижения врагом конца пути
   */
  private handleEnemyReachedEnd(enemy: Enemy): void {
    this.removeEnemy(enemy);
    this.emit(WaveEvents.ENEMY_REACHED_END, enemy);
  }

  /**
   * Обработчик события смерти врага
   */
  private handleEnemyDied(enemy: Enemy, bounty: number): void {
    const eventData: EnemyDiedEvent = {
      enemyType: enemy.enemyData.type,
      bounty,
    };

    this.removeEnemy(enemy);
    this.emit(WaveEvents.ENEMY_DIED, eventData);
  }

  /**
   * Удаляет врага из списка
   */
  private removeEnemy(enemy: Enemy): void {
    this.enemies = this.enemies.filter(e => e !== enemy);
  }

  /**
   * Получает всех живых врагов
   */
  getEnemies(): Enemy[] {
    return this.enemies.filter(enemy => enemy.active);
  }

  /**
   * Получает количество живых врагов
   */
  getEnemyCount(): number {
    return this.getEnemies().length;
  }

  /**
   * Обновляет все враги (для health bars и т.д.)
   */
  update(): void {
    // Health bars обновляются автоматически в Enemy классе
    // Здесь можно добавить дополнительную логику обновления
  }

  /**
   * Очищает всех врагов
   */
  clearAll(): void {
    this.enemies.forEach(enemy => {
      if (enemy.active) {
        enemy.destroy();
      }
    });
    this.enemies = [];
  }

  /**
   * Получает конфиг врага по типу
   */
  getEnemyConfig(type: string): EnemyConfigData | undefined {
    return this.enemyConfigs.get(type);
  }
}

