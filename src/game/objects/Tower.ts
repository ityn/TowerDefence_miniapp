import * as Phaser from 'phaser';
import type { Enemy } from './Enemy';
import type { TowerConfig, TowerInstance, TargetStrategy } from '@/types/towerTypes';
import { TargetStrategy as TS } from '@/types/towerTypes';
import { TowerEvents } from '@/types/towerEvents';
import { ProjectileSystem } from '@/game/systems/ProjectileSystem';

/**
 * Класс башни
 */
export class Tower extends Phaser.GameObjects.Container {
  public towerData: TowerInstance;
  private sprite!: Phaser.GameObjects.Rectangle; // Временно, позже спрайт
  private rangeCircle!: Phaser.GameObjects.Graphics;
  private levelIndicator!: Phaser.GameObjects.Text;
  private projectileSystem: ProjectileSystem;
  private isRangeVisible: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: string,
    config: TowerConfig,
    projectileSystem: ProjectileSystem
  ) {
    super(scene, x, y);

    this.projectileSystem = projectileSystem;

    this.towerData = {
      id: `tower_${Date.now()}_${Math.random()}`,
      type: type as any,
      level: 1,
      x,
      y,
      currentTarget: null,
      lastAttackTime: 0,
      config,
    };

    this.init();
  }

  private init(): void {
    // Создаем визуальное представление башни
    const size = 40;
    const color = this.getTowerColor(this.towerData.type);

    this.sprite = this.scene.add.rectangle(0, 0, size, size, color);
    this.add(this.sprite);

    // Индикатор уровня
    this.levelIndicator = this.scene.add.text(0, -25, `Lv${this.towerData.level}`, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
    this.add(this.levelIndicator);

    // Создаем круг радиуса (изначально скрыт)
    this.createRangeCircle();
  }

  private getTowerColor(type: string): number {
    switch (type) {
      case 'cannon':
        return 0xff6d6d; // Красный
      case 'ice':
        return 0x6dc2ff; // Голубой
      case 'splash':
        return 0xff9900; // Оранжевый
      case 'sniper':
        return 0x00ff00; // Зеленый
      case 'poison':
        return 0x9900ff; // Фиолетовый
      default:
        return 0xffffff;
    }
  }

  private createRangeCircle(): void {
    this.rangeCircle = this.scene.add.graphics();
    this.rangeCircle.lineStyle(2, 0x00ff00, 0.3);
    this.rangeCircle.strokeCircle(0, 0, this.getRange());
    this.rangeCircle.setVisible(false);
    this.add(this.rangeCircle);
  }

  /**
   * Обновляет башню (вызывается каждый кадр)
   */
  update(enemies: Enemy[], currentTime: number): void {
    // Проверяем, можно ли атаковать
    const attackCooldown = (1 / this.getAttackSpeed()) * 1000;
    const timeSinceLastAttack = currentTime - this.towerData.lastAttackTime;

    if (timeSinceLastAttack < attackCooldown) {
      return; // Башня еще перезаряжается
    }

    // Ищем цель
    const target = this.findTarget(enemies, TS.CLOSEST);

    if (target) {
      this.towerData.currentTarget = target;
      this.attack(target, currentTime);
    } else {
      this.towerData.currentTarget = null;
    }
  }

  /**
   * Ищет цель с учетом стратегии
   */
  findTarget(enemies: Enemy[], strategy: TargetStrategy = TS.CLOSEST): Enemy | null {
    const range = this.getRange();
    const enemiesInRange: Enemy[] = [];

    // Фильтруем врагов в радиусе
    enemies.forEach(enemy => {
      if (!enemy.active) return;

      const distance = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        enemy.x,
        enemy.y
      );

      if (distance <= range) {
        enemiesInRange.push(enemy);
      }
    });

    if (enemiesInRange.length === 0) {
      return null;
    }

    // Выбираем цель по стратегии
    switch (strategy) {
      case TS.CLOSEST:
        return this.findClosestEnemy(enemiesInRange);
      case TS.STRONGEST:
        return this.findStrongestEnemy(enemiesInRange);
      case TS.FIRST:
        return this.findFirstEnemy(enemiesInRange);
      case TS.WEAKEST:
        return this.findWeakestEnemy(enemiesInRange);
      default:
        return this.findClosestEnemy(enemiesInRange);
    }
  }

  private findClosestEnemy(enemies: Enemy[]): Enemy | null {
    let closest: Enemy | null = null;
    let minDistance = Infinity;

    enemies.forEach(enemy => {
      const distance = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        enemy.x,
        enemy.y
      );

      if (distance < minDistance) {
        minDistance = distance;
        closest = enemy;
      }
    });

    return closest;
  }

  private findStrongestEnemy(enemies: Enemy[]): Enemy | null {
    let strongest: Enemy | null = null;
    let maxHealth = 0;

    enemies.forEach(enemy => {
      if (enemy.enemyData.health > maxHealth) {
        maxHealth = enemy.enemyData.health;
        strongest = enemy;
      }
    });

    return strongest;
  }

  private findFirstEnemy(enemies: Enemy[]): Enemy | null {
    // Враг, который прошел дальше всего по пути
    let first: Enemy | null = null;
    let maxProgress = -1;

    enemies.forEach(enemy => {
      const progress = enemy.enemyData.currentWaypointIndex;
      if (progress > maxProgress) {
        maxProgress = progress;
        first = enemy;
      }
    });

    return first;
  }

  private findWeakestEnemy(enemies: Enemy[]): Enemy | null {
    let weakest: Enemy | null = null;
    let minHealth = Infinity;

    enemies.forEach(enemy => {
      if (enemy.enemyData.health < minHealth) {
        minHealth = enemy.enemyData.health;
        weakest = enemy;
      }
    });

    return weakest;
  }

  /**
   * Атакует цель
   */
  private attack(target: Enemy, currentTime: number): void {
    const damage = this.getDamage();

    // Поворачиваем башню к цели
    const angle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      target.x,
      target.y
    );
    this.setRotation(angle);

    // Создаем проектиль
    const effects = this.getTowerEffects();
    this.projectileSystem.createProjectile(
      this.x,
      this.y,
      this.towerData.config.projectile,
      damage,
      target,
      effects
    );

    this.towerData.lastAttackTime = currentTime;

    // Эмитим событие атаки
    this.scene.events.emit(TowerEvents.TOWER_ATTACK, {
      towerId: this.towerData.id,
      targetId: (target as any).id || 'unknown',
      damage,
    });
  }

  /**
   * Получает эффекты башни для передачи проектилю
   */
  private getTowerEffects(): any {
    const config = this.towerData.config;
    const effects: any = {};

    if (config.effects?.includes('slow')) {
      effects.slowAmount = config.slowAmount;
      effects.slowDuration = config.slowDuration;
    }

    if (config.effects?.includes('splash')) {
      effects.splashRadius = config.splashRadius;
      effects.splashDamage = config.splashDamage;
    }

    if (config.effects?.includes('poison')) {
      effects.poisonDamage = config.poisonDamage;
      effects.poisonDuration = config.poisonDuration;
      effects.poisonStacks = config.poisonStacks;
    }

    return effects;
  }

  /**
   * Улучшает башню
   */
  upgrade(): boolean {
    const upgrades = this.towerData.config.upgrades || [];
    const nextLevel = this.towerData.level + 1;
    const upgrade = upgrades.find(u => u.level === nextLevel);

    if (!upgrade) {
      return false; // Максимальный уровень достигнут
    }

    const oldLevel = this.towerData.level;
    this.towerData.level = nextLevel;

    // Применяем улучшения
    if (upgrade.damage !== undefined) {
      this.towerData.config.damage = upgrade.damage;
    }
    if (upgrade.range !== undefined) {
      this.towerData.config.range = upgrade.range;
      this.updateRangeCircle();
    }
    if (upgrade.attackSpeed !== undefined) {
      this.towerData.config.attackSpeed = upgrade.attackSpeed;
    }

    // Обновляем визуальный индикатор
    this.levelIndicator.setText(`Lv${this.towerData.level}`);

    // Эмитим событие
    this.scene.events.emit(TowerEvents.TOWER_UPGRADED, {
      towerId: this.towerData.id,
      oldLevel,
      newLevel: nextLevel,
      cost: upgrade.cost,
    });

    return true;
  }

  /**
   * Получает стоимость улучшения
   */
  getUpgradeCost(): number {
    const upgrades = this.towerData.config.upgrades || [];
    const nextLevel = this.towerData.level + 1;
    const upgrade = upgrades.find(u => u.level === nextLevel);
    return upgrade?.cost || 0;
  }

  /**
   * Получает стоимость продажи (50% от затрат)
   */
  getSellPrice(): number {
    const baseCost = this.towerData.config.cost;
    const upgradeCosts = this.towerData.config.upgrades
      ?.filter(u => u.level <= this.towerData.level)
      .reduce((sum, u) => sum + u.cost, 0) || 0;

    return Math.floor((baseCost + upgradeCosts) * 0.5);
  }

  /**
   * Показывает радиус атаки
   */
  showRange(): void {
    this.isRangeVisible = true;
    this.rangeCircle.setVisible(true);
  }

  /**
   * Скрывает радиус атаки
   */
  hideRange(): void {
    this.isRangeVisible = false;
    this.rangeCircle.setVisible(false);
  }

  /**
   * Обновляет круг радиуса
   */
  private updateRangeCircle(): void {
    this.rangeCircle.clear();
    this.rangeCircle.lineStyle(2, 0x00ff00, 0.3);
    this.rangeCircle.strokeCircle(0, 0, this.getRange());
  }

  /**
   * Получает текущий урон
   */
  getDamage(): number {
    return this.towerData.config.damage;
  }

  /**
   * Получает текущий радиус
   */
  getRange(): number {
    return this.towerData.config.range;
  }

  /**
   * Получает текущую скорость атаки
   */
  getAttackSpeed(): number {
    return this.towerData.config.attackSpeed;
  }

  /**
   * Уничтожает башню
   */
  destroy(): void {
    if (this.rangeCircle) {
      this.rangeCircle.destroy();
    }
    super.destroy(true);
  }
}

