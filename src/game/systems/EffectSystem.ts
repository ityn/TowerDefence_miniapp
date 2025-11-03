import * as Phaser from 'phaser';
import type { Enemy } from '@/game/objects/Enemy';
import type { EnemyEffect, SlowEffect, PoisonEffect } from '@/types/towerTypes';
import { EffectEvents } from '@/types/towerEvents';

/**
 * Система управления эффектами для врагов
 */
export class EffectSystem extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private enemyEffects: Map<Enemy, EnemyEffect[]> = new Map();

  // Таймеры для эффектов
  private effectTimers: Phaser.Time.TimerEvent[] = [];

  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
    this.startEffectLoop();
  }

  /**
   * Запускает основной цикл обновления эффектов
   */
  private startEffectLoop(): void {
    this.scene.time.addEvent({
      delay: 100, // Обновление каждые 100мс
      callback: this.updateEffects,
      callbackScope: this,
      loop: true,
    });
  }

  /**
   * Применяет эффект к врагу
   */
  applyEffect(enemy: Enemy, effect: EnemyEffect): void {
    if (!enemy.active) return;

    let effects = this.enemyEffects.get(enemy) || [];

    // Обработка стаков для яда
    if (effect.type === 'poison' && effect.stacks !== undefined) {
      const existingPoison = effects.find(e => e.type === 'poison') as PoisonEffect | undefined;
      if (existingPoison && effect.stacks > 0) {
        // Стакаем урон
        existingPoison.damagePerSecond += effect.damagePerSecond;
        existingPoison.endTime = Math.max(existingPoison.endTime, effect.endTime);
        existingPoison.stacks = (existingPoison.stacks || 1) + 1;
        this.emit(EffectEvents.EFFECT_TICK, { effect: existingPoison, enemy });
        return;
      }
    }

    // Для замедления - заменяем если новый эффект сильнее
    if (effect.type === 'slow') {
      const existingSlow = effects.find(e => e.type === 'slow') as SlowEffect | undefined;
      if (existingSlow) {
        if (effect.amount < existingSlow.amount) {
          // Новое замедление сильнее
          effects = effects.filter(e => e.type !== 'slow');
        } else {
          // Существующее замедление сильнее или равное
          return;
        }
      }
    }

    effects.push(effect);
    this.enemyEffects.set(enemy, effects);

    this.emit(EffectEvents.EFFECT_APPLIED, { effect, enemy });
    this.applyEffectToEnemy(enemy, effect);
  }

  /**
   * Применяет эффект к врагу (визуально и логически)
   */
  private applyEffectToEnemy(enemy: Enemy, effect: EnemyEffect): void {
    if (effect.type === 'slow') {
      // Замедляем врага
      const slowEffect = effect as SlowEffect;
      enemy.enemyData.speed *= slowEffect.amount;

      // Визуальный эффект - голубая подсветка (изменяем цвет)
      if (enemy.sprite && enemy.sprite instanceof Phaser.GameObjects.Rectangle) {
        const originalColor = (enemy.sprite as any).originalColor || enemy.sprite.fillColor;
        (enemy.sprite as any).originalColor = originalColor;
        enemy.sprite.setFillStyle(0x00ffff, 0.8);
      }
    } else if (effect.type === 'poison') {
      // Визуальный эффект - зеленая подсветка
      if (enemy.sprite && enemy.sprite instanceof Phaser.GameObjects.Rectangle) {
        const originalColor = (enemy.sprite as any).originalColor || enemy.sprite.fillColor;
        (enemy.sprite as any).originalColor = originalColor;
        enemy.sprite.setFillStyle(0x00ff00, 0.8);
      }
    }
  }

  /**
   * Обновляет все эффекты
   */
  private updateEffects(): void {
    const currentTime = this.scene.time.now;

    this.enemyEffects.forEach((effects, enemy) => {
      if (!enemy.active) {
        this.enemyEffects.delete(enemy);
        return;
      }

      const activeEffects: EnemyEffect[] = [];

      effects.forEach(effect => {
        // Проверяем истечение эффекта
        if (currentTime >= effect.endTime) {
          this.removeEffectFromEnemy(enemy, effect);
          this.emit(EffectEvents.EFFECT_EXPIRED, { effect, enemy });
        } else {
          activeEffects.push(effect);

          // Обрабатываем эффекты с тиками урона (poison)
          if (effect.type === 'poison') {
            const poisonEffect = effect as PoisonEffect;
            const lastTick = (effect as any).lastTick || effect.endTime - poisonEffect.duration * 1000;

            if (currentTime - lastTick >= 1000) {
              // Наносим урон каждую секунду
              const killed = enemy.takeDamage(poisonEffect.damagePerSecond);
              (effect as any).lastTick = currentTime;
              
              this.emit(EffectEvents.EFFECT_TICK, { effect, enemy });

              if (killed) {
                // Враг убит, удаляем эффекты
                this.enemyEffects.delete(enemy);
                return;
              }
            }
          }
        }
      });

      if (activeEffects.length > 0) {
        this.enemyEffects.set(enemy, activeEffects);
      } else {
        this.enemyEffects.delete(enemy);
        this.resetEnemyVisuals(enemy);
      }
    });
  }

  /**
   * Удаляет эффект с врага
   */
  private removeEffectFromEnemy(enemy: Enemy, effect: EnemyEffect): void {
    if (effect.type === 'slow') {
      // Восстанавливаем скорость
      const slowEffect = effect as SlowEffect;
      enemy.enemyData.speed /= slowEffect.amount;
    }

    // Проверяем, есть ли еще эффекты того же типа
    const remainingEffects = this.enemyEffects.get(enemy) || [];
    const hasSlow = remainingEffects.some(e => e.type === 'slow');
    const hasPoison = remainingEffects.some(e => e.type === 'poison');

    if (!hasSlow && !hasPoison) {
      this.resetEnemyVisuals(enemy);
    }
  }

  /**
   * Сбрасывает визуальные эффекты врага
   */
  private resetEnemyVisuals(enemy: Enemy): void {
    if (enemy.sprite && enemy.sprite instanceof Phaser.GameObjects.Rectangle) {
      const originalColor = (enemy.sprite as any).originalColor;
      if (originalColor !== undefined) {
        enemy.sprite.setFillStyle(originalColor);
      }
    }
  }

  /**
   * Получает все эффекты врага
   */
  getEnemyEffects(enemy: Enemy): EnemyEffect[] {
    return this.enemyEffects.get(enemy) || [];
  }

  /**
   * Удаляет все эффекты с врага
   */
  clearEnemyEffects(enemy: Enemy): void {
    const effects = this.enemyEffects.get(enemy) || [];
    effects.forEach(effect => {
      this.removeEffectFromEnemy(enemy, effect);
    });
    this.enemyEffects.delete(enemy);
    this.resetEnemyVisuals(enemy);
  }

  /**
   * Очищает все эффекты (при уничтожении системы)
   */
  destroy(): void {
    this.enemyEffects.forEach((effects, enemy) => {
      this.resetEnemyVisuals(enemy);
    });
    this.enemyEffects.clear();
    this.effectTimers.forEach(timer => timer.destroy());
    this.effectTimers = [];
  }
}

