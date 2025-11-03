import * as Phaser from 'phaser';
import type { Waypoint, Path } from '@/types/mapTypes';
import { EnemyType } from '@/types/gameTypes';

/**
 * Интерфейс для данных врага
 */
export interface EnemyData {
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  currentWaypointIndex: number;
  path: Path;
}

/**
 * Класс врага с поддержкой движения по waypoints
 */
export class Enemy extends Phaser.GameObjects.Container {
  public enemyData: EnemyData;
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private healthBar!: Phaser.GameObjects.Graphics;
  public sprite!: Phaser.GameObjects.Rectangle; // Временно, позже заменим на спрайт

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: EnemyType,
    health: number,
    speed: number,
    path: Path
  ) {
    super(scene, x, y);

    this.enemyData = {
      type,
      health,
      maxHealth: health,
      speed,
      currentWaypointIndex: 0,
      path,
    };

    this.init();
  }

  private init(): void {
    // Создаем визуальное представление врага
    const size = 30;
    const color = this.getEnemyColor(this.enemyData.type);
    
    this.sprite = this.scene.add.rectangle(0, 0, size, size, color);
    this.add(this.sprite);

    // Создаем health bar
    this.createHealthBar();

    // Начинаем движение к первому waypoint
    this.moveToNextWaypoint();
  }

  private getEnemyColor(type: EnemyType): number {
    switch (type) {
      case EnemyType.FAST:
        return 0xff6b6b; // Красный
      case EnemyType.SLOW:
        return 0x4ecdc4; // Бирюзовый
      case EnemyType.TANK:
        return 0x95a5a6; // Серый
      default:
        return 0xff0000;
    }
  }

  private createHealthBar(): void {
    const barWidth = 30;
    const barHeight = 4;
    const barOffsetY = -20;

    // Фон health bar
    this.healthBarBg = this.scene.add.graphics();
    this.healthBarBg.fillStyle(0x000000, 0.5);
    this.healthBarBg.fillRect(-barWidth / 2, barOffsetY, barWidth, barHeight);
    this.add(this.healthBarBg);

    // Здоровье
    this.healthBar = this.scene.add.graphics();
    this.updateHealthBar();
    this.add(this.healthBar);
  }

  private updateHealthBar(): void {
    const barWidth = 30;
    const barHeight = 4;
    const barOffsetY = -20;

    this.healthBar.clear();
    
    const healthPercent = this.enemyData.health / this.enemyData.maxHealth;
    const healthWidth = barWidth * healthPercent;

    // Цвет зависит от здоровья
    const color = healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000;
    
    this.healthBar.fillStyle(color);
    this.healthBar.fillRect(-barWidth / 2, barOffsetY, healthWidth, barHeight);
  }

  /**
   * Начинает движение к следующему waypoint
   */
  private moveToNextWaypoint(): void {
    const { path, currentWaypointIndex } = this.enemyData;

    // Проверяем, достиг ли враг конца пути
    if (currentWaypointIndex >= path.waypoints.length - 1) {
      this.reachedEnd();
      return;
    }

    const currentWaypoint = path.waypoints[currentWaypointIndex];
    const nextWaypoint = path.waypoints[currentWaypointIndex + 1];

    // Вычисляем расстояние и время движения
    const distance = Phaser.Math.Distance.Between(
      currentWaypoint.x,
      currentWaypoint.y,
      nextWaypoint.x,
      nextWaypoint.y
    );

    const duration = (distance / this.enemyData.speed) * 1000; // в миллисекундах

    // Анимация движения
    this.scene.tweens.add({
      targets: this,
      x: nextWaypoint.x,
      y: nextWaypoint.y,
      duration,
      ease: 'Linear',
      onComplete: () => {
        this.enemyData.currentWaypointIndex++;
        this.moveToNextWaypoint();
      },
    });
  }

  /**
   * Вызывается когда враг достиг конца пути
   */
  private reachedEnd(): void {
    this.emit('reachedEnd', this);
  }

  /**
   * Наносит урон врагу
   */
  takeDamage(damage: number): boolean {
    this.enemyData.health -= damage;
    this.updateHealthBar();

    if (this.enemyData.health <= 0) {
      this.die();
      return true; // Враг убит
    }

    return false; // Враг жив
  }

  /**
   * Убивает врага
   */
  private die(): void {
    // Останавливаем все твины
    this.scene.tweens.killTweensOf(this);
    
    // Анимация смерти
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 200,
      onComplete: () => {
        this.emit('died', this);
        this.destroy();
      },
    });
  }

  /**
   * Получает текущую позицию врага
   */
  getPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  /**
   * Уничтожает объект
   */
  destroy(): void {
    this.scene.tweens.killTweensOf(this);
    super.destroy(true);
  }
}

