import * as Phaser from 'phaser';
import { Projectile } from '@/game/objects/Projectile';
import type { Enemy } from '@/game/objects/Enemy';
import type { ProjectileConfig } from '@/types/towerTypes';
import { ProjectileEvents } from '@/types/towerEvents';
import { EffectSystem } from './EffectSystem';

/**
 * Система управления проектилями с пулом объектов
 */
export class ProjectileSystem extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private effectSystem: EffectSystem;
  private projectiles: Projectile[] = [];
  private projectilePool: Projectile[] = [];

  constructor(scene: Phaser.Scene, effectSystem: EffectSystem) {
    super();
    this.scene = scene;
    this.effectSystem = effectSystem;
  }

  /**
   * Создает новый проектиль
   */
  createProjectile(
    x: number,
    y: number,
    config: ProjectileConfig,
    damage: number,
    target: Enemy | null,
    effects?: {
      slowAmount?: number;
      slowDuration?: number;
      splashRadius?: number;
      splashDamage?: number;
      poisonDamage?: number;
      poisonDuration?: number;
      poisonStacks?: boolean;
    }
  ): Projectile {
    // Пытаемся переиспользовать проектиль из пула
    let projectile = this.projectilePool.pop();

    if (!projectile) {
      projectile = new Projectile(this.scene, x, y, config, damage, target);
      this.scene.add.existing(projectile);
    } else {
      // Переиспользуем существующий
      projectile.setPosition(x, y);
      (projectile as any).config = config;
      (projectile as any).damage = damage;
      (projectile as any).target = target;
      projectile.setVisible(true);
      projectile.setActive(true);
    }

    this.projectiles.push(projectile);
    this.emit(ProjectileEvents.PROJECTILE_FIRED, projectile);

    // Для мгновенных проектилей сразу применяем урон
    if (config.type === 'instant' && target) {
      this.handleInstantHit(projectile, target, effects);
      return projectile;
    }

    return projectile;
  }

  /**
   * Обрабатывает мгновенное попадание (ice tower)
   */
  private handleInstantHit(
    projectile: Projectile,
    target: Enemy,
    effects?: {
      slowAmount?: number;
      slowDuration?: number;
    }
  ): void {
    // Наносим урон
    const killed = target.takeDamage(projectile.getDamage());

    // Применяем эффекты
    if (effects?.slowAmount && effects?.slowDuration) {
      const slowEffect = {
        type: 'slow' as const,
        amount: effects.slowAmount,
        duration: effects.slowDuration,
        endTime: this.scene.time.now + effects.slowDuration * 1000,
      };
      this.effectSystem.applyEffect(target, slowEffect);
    }

    this.emit(ProjectileEvents.PROJECTILE_HIT, { projectile, target });

    // Удаляем проектиль сразу
    this.removeProjectile(projectile);

    if (killed) {
      // Враг убит
      return;
    }
  }

  /**
   * Обновляет все проектили
   */
  update(delta: number): void {
    const enemies = this.scene.children.getAll('enemy') as Enemy[];

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      if (!projectile.active) {
        this.removeProjectile(projectile);
        continue;
      }

      // Обновляем движение проектиля
      const hit = (projectile as any).update(delta);

      if (hit) {
        const target = (projectile as any).target;
        
        if (target && target.active) {
          this.handleProjectileHit(projectile, target);
        } else {
          // Цель уничтожена, проектиль промахивается
          this.emit(ProjectileEvents.PROJECTILE_MISSED, projectile);
          this.removeProjectile(projectile);
        }
      }
    }
  }

  /**
   * Обрабатывает попадание проектиля
   */
  private handleProjectileHit(projectile: Projectile, target: Enemy): void {
    const config = (projectile as any).config as ProjectileConfig;
    const damage = (projectile as any).damage as number;
    const effects = (projectile as any).effects;

    // Обработка splash урона
    if (effects?.splashRadius && effects?.splashRadius > 0) {
      this.handleSplashDamage(projectile, target, damage, effects);
    } else {
      // Обычный урон
      target.takeDamage(damage);
    }

    // Применяем эффекты
    if (effects?.slowAmount && effects?.slowDuration) {
      const slowEffect = {
        type: 'slow' as const,
        amount: effects.slowAmount,
        duration: effects.slowDuration,
        endTime: this.scene.time.now + effects.slowDuration * 1000,
      };
      this.effectSystem.applyEffect(target, slowEffect);
    }

    if (effects?.poisonDamage && effects?.poisonDuration) {
      const poisonEffect = {
        type: 'poison' as const,
        damagePerSecond: effects.poisonDamage,
        duration: effects.poisonDuration,
        endTime: this.scene.time.now + effects.poisonDuration * 1000,
        stacks: effects.poisonStacks ? 1 : undefined,
      };
      this.effectSystem.applyEffect(target, poisonEffect);
    }

    this.emit(ProjectileEvents.PROJECTILE_HIT, { projectile, target });

    // Визуальный эффект попадания
    this.createHitEffect(projectile.x, projectile.y, config.type);

    // Удаляем проектиль
    this.removeProjectile(projectile);
  }

  /**
   * Обрабатывает площадной урон (splash)
   */
  private handleSplashDamage(
    projectile: Projectile,
    centerTarget: Enemy,
    baseDamage: number,
    effects: {
      splashRadius: number;
      splashDamage: number;
    }
  ): void {
    // Урон по основной цели
    centerTarget.takeDamage(baseDamage);

    // Ищем врагов в радиусе splash
    const enemies = this.scene.children.getAll('enemy') as Enemy[];
    const splashDamage = baseDamage * effects.splashDamage;

    enemies.forEach(enemy => {
      if (!enemy.active || enemy === centerTarget) return;

      const distance = Phaser.Math.Distance.Between(
        projectile.x,
        projectile.y,
        enemy.x,
        enemy.y
      );

      if (distance <= effects.splashRadius) {
        // Наносим урон с учетом расстояния (ближе = больше урон)
        const distanceFactor = 1 - (distance / effects.splashRadius) * 0.5;
        const finalDamage = splashDamage * distanceFactor;
        enemy.takeDamage(finalDamage);
      }
    });

    // Визуальный эффект взрыва
    this.createSplashEffect(projectile.x, projectile.y, effects.splashRadius);
  }

  /**
   * Создает визуальный эффект попадания
   */
  private createHitEffect(x: number, y: number, type: string): void {
    const graphics = this.scene.add.graphics();
    
    switch (type) {
      case 'bullet':
        graphics.fillStyle(0xffff00, 1);
        graphics.fillCircle(x, y, 5);
        break;
      case 'rocket':
        graphics.fillStyle(0xff6600, 1);
        graphics.fillCircle(x, y, 10);
        break;
      case 'laser':
        graphics.lineStyle(2, 0x00ffff, 1);
        graphics.strokeCircle(x, y, 8);
        break;
    }

    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 200,
      onComplete: () => graphics.destroy(),
    });
  }

  /**
   * Создает визуальный эффект взрыва
   */
  private createSplashEffect(x: number, y: number, radius: number): void {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(3, 0xff6600, 0.8);
    graphics.strokeCircle(x, y, radius);

    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 300,
      onComplete: () => graphics.destroy(),
    });
  }

  /**
   * Удаляет проектиль и возвращает в пул
   */
  private removeProjectile(projectile: Projectile): void {
    const index = this.projectiles.indexOf(projectile);
    if (index > -1) {
      this.projectiles.splice(index, 1);
    }

    projectile.setVisible(false);
    projectile.setActive(false);
    this.projectilePool.push(projectile);
  }

  /**
   * Очищает все проектили
   */
  clear(): void {
    this.projectiles.forEach(projectile => projectile.destroy());
    this.projectiles = [];
    this.projectilePool.forEach(projectile => projectile.destroy());
    this.projectilePool = [];
  }

  /**
   * Уничтожает систему
   */
  destroy(): void {
    this.clear();
  }
}

