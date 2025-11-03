import * as Phaser from 'phaser';
import type { Enemy } from './Enemy';
import type { ProjectileConfig } from '@/types/towerTypes';

/**
 * Класс проектиля
 */
export class Projectile extends Phaser.GameObjects.Container {
  private config: ProjectileConfig;
  private target: Enemy | null = null;
  private damage: number;
  private speed: number;
  private sprite!: Phaser.GameObjects.Rectangle; // Временно, позже спрайт
  private trailGraphics!: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: ProjectileConfig,
    damage: number,
    target: Enemy | null
  ) {
    super(scene, x, y);
    this.config = config;
    this.damage = damage;
    this.target = target;
    this.speed = config.speed || 300;

    this.init();
  }

  private init(): void {
    // Создаем визуальное представление проектиля
    const size = this.getProjectileSize();
    const color = this.getProjectileColor();

    this.sprite = this.scene.add.rectangle(0, 0, size, size, color);
    this.add(this.sprite);

    // Для пуль и ракет добавляем trail эффект
    if (this.config.type === 'bullet' || this.config.type === 'rocket') {
      this.createTrail();
    }
  }

  private getProjectileSize(): number {
    switch (this.config.type) {
      case 'bullet':
        return 8;
      case 'rocket':
        return 16;
      case 'laser':
        return 12;
      default:
        return 10;
    }
  }

  private getProjectileColor(): number {
    switch (this.config.type) {
      case 'bullet':
        return 0xffff00; // Желтый
      case 'rocket':
        return 0xff6600; // Оранжевый
      case 'laser':
        return 0x00ffff; // Голубой
      default:
        return 0xffffff;
    }
  }

  private createTrail(): void {
    this.trailGraphics = this.scene.add.graphics();
    this.trailGraphics.setDepth(99);
  }

  /**
   * Обновляет движение проектиля
   */
  update(delta: number): boolean {
    // Мгновенные проектили (ice) не двигаются
    if (this.config.type === 'instant') {
      return true; // Готов к применению урона
    }

    // Если цель уничтожена, удаляем проектиль
    if (!this.target || !this.target.active) {
      this.destroy();
      return false;
    }

    // Двигаемся к цели
    const targetX = this.target.x;
    const targetY = this.target.y;

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      targetX,
      targetY
    );

    // Проверяем попадание
    if (distance < 20) {
      return true; // Попал в цель
    }

    // Вычисляем направление
    const angle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      targetX,
      targetY
    );

    // Обновляем позицию
    const moveDistance = (this.speed * delta) / 1000;
    this.x += Math.cos(angle) * moveDistance;
    this.y += Math.sin(angle) * moveDistance;

    // Обновляем rotation для визуального эффекта
    this.setRotation(angle);

    // Обновляем trail
    if (this.trailGraphics) {
      this.updateTrail();
    }

    return false;
  }

  private updateTrail(): void {
    // Простой trail эффект
    this.trailGraphics.clear();
    this.trailGraphics.lineStyle(2, this.getProjectileColor(), 0.5);
    this.trailGraphics.beginPath();
    this.trailGraphics.moveTo(this.x - Math.cos(this.rotation) * 10, this.y - Math.sin(this.rotation) * 10);
    this.trailGraphics.lineTo(this.x, this.y);
    this.trailGraphics.strokePath();
  }

  /**
   * Получает урон проектиля
   */
  getDamage(): number {
    return this.damage;
  }

  /**
   * Получает цель
   */
  getTarget(): Enemy | null {
    return this.target;
  }

  /**
   * Уничтожает проектиль
   */
  destroy(): void {
    if (this.trailGraphics) {
      this.trailGraphics.destroy();
    }
    super.destroy(true);
  }
}

