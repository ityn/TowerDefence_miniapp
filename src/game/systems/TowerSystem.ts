import * as Phaser from 'phaser';
import { Tower } from '@/game/objects/Tower';
import type { Enemy } from '@/game/objects/Enemy';
import type { TowerConfig } from '@/types/towerTypes';
import { TowerEvents } from '@/types/towerEvents';
import { ProjectileSystem } from './ProjectileSystem';

/**
 * Система управления всеми башнями на карте
 */
export class TowerSystem extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private towers: Tower[] = [];
  private towerConfigs: Map<string, TowerConfig> = new Map();
  private selectedTower: Tower | null = null;
  private projectileSystem: ProjectileSystem;

  constructor(scene: Phaser.Scene, projectileSystem: ProjectileSystem) {
    super();
    this.scene = scene;
    this.projectileSystem = projectileSystem;
    this.setupInputHandlers();
  }

  /**
   * Загружает конфигурации башен из JSON
   */
  async loadTowerConfigs(): Promise<void> {
    try {
      const response = await fetch('/data/towers-config.json');
      
      if (!response.ok) {
        throw new Error('Failed to load tower configs');
      }

      const configs: Record<string, TowerConfig> = await response.json();
      
      // Сохраняем конфиги в Map
      Object.entries(configs).forEach(([type, config]) => {
        this.towerConfigs.set(type, config);
      });

      console.log(`Loaded ${this.towerConfigs.size} tower types`);
    } catch (error) {
      console.error('Error loading tower configs:', error);
      throw error;
    }
  }

  /**
   * Создает башню на указанной позиции
   */
  buildTower(type: string, x: number, y: number): Tower | null {
    const config = this.towerConfigs.get(type);
    
    if (!config) {
      console.error(`Tower config not found for type: ${type}`);
      return null;
    }

    // Проверяем, можно ли строить здесь (нет пересечений с другими башнями)
    if (!this.canBuildAt(x, y)) {
      return null;
    }

    const tower = new Tower(
      this.scene,
      x,
      y,
      type,
      config,
      this.projectileSystem
    );

    this.scene.add.existing(tower);
    this.towers.push(tower);

    // Эмитим событие постройки
    this.emit(TowerEvents.TOWER_BUILT, {
      towerId: tower.towerData.id,
      type,
      x,
      y,
      cost: config.cost,
    });

    return tower;
  }

  /**
   * Проверяет, можно ли строить башню на позиции
   */
  canBuildAt(x: number, y: number): boolean {
    const buildRadius = 30; // Минимальное расстояние между башнями

    for (const tower of this.towers) {
      const distance = Phaser.Math.Distance.Between(
        x,
        y,
        tower.x,
        tower.y
      );

      if (distance < buildRadius) {
        return false; // Слишком близко к другой башне
      }
    }

    return true;
  }

  /**
   * Улучшает выбранную башню
   */
  upgradeTower(tower: Tower): boolean {
    if (!tower) return false;

    const upgraded = tower.upgrade();
    
    if (upgraded) {
      this.emit(TowerEvents.TOWER_UPGRADED, {
        towerId: tower.towerData.id,
        oldLevel: tower.towerData.level - 1,
        newLevel: tower.towerData.level,
        cost: tower.getUpgradeCost(),
      });
    }

    return upgraded;
  }

  /**
   * Продает башню
   */
  sellTower(tower: Tower): number {
    if (!tower) return 0;

    const refund = tower.getSellPrice();
    const index = this.towers.indexOf(tower);

    if (index > -1) {
      this.towers.splice(index, 1);
    }

    if (this.selectedTower === tower) {
      this.selectedTower = null;
    }

    tower.destroy();

    this.emit(TowerEvents.TOWER_SOLD, {
      towerId: tower.towerData.id,
      refund,
    });

    return refund;
  }

  /**
   * Выбирает башню (для отображения UI)
   */
  selectTower(tower: Tower | null): void {
    // Скрываем радиус предыдущей башни
    if (this.selectedTower) {
      this.selectedTower.hideRange();
    }

    this.selectedTower = tower;

    // Показываем радиус новой башни
    if (this.selectedTower) {
      this.selectedTower.showRange();
    }
  }

  /**
   * Получает башню по координатам (для клика)
   */
  getTowerAt(x: number, y: number): Tower | null {
    const clickRadius = 25;

    for (const tower of this.towers) {
      const distance = Phaser.Math.Distance.Between(
        x,
        y,
        tower.x,
        tower.y
      );

      if (distance < clickRadius) {
        return tower;
      }
    }

    return null;
  }

  /**
   * Настраивает обработчики ввода
   */
  private setupInputHandlers(): void {
    // Обработка клика по карте
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const tower = this.getTowerAt(pointer.x, pointer.y);
      
      if (tower) {
        this.selectTower(tower);
      } else {
        this.selectTower(null);
      }
    });
  }

  /**
   * Обновляет все башни
   */
  update(enemies: Enemy[]): void {
    const currentTime = this.scene.time.now;

    this.towers.forEach(tower => {
      tower.update(enemies, currentTime);
    });
  }

  /**
   * Получает все башни
   */
  getTowers(): Tower[] {
    return this.towers;
  }

  /**
   * Получает выбранную башню
   */
  getSelectedTower(): Tower | null {
    return this.selectedTower;
  }

  /**
   * Получает конфиг башни по типу
   */
  getTowerConfig(type: string): TowerConfig | undefined {
    return this.towerConfigs.get(type);
  }

  /**
   * Получает все типы доступных башен
   */
  getAvailableTowerTypes(): string[] {
    return Array.from(this.towerConfigs.keys());
  }

  /**
   * Очищает все башни
   */
  clearAll(): void {
    this.towers.forEach(tower => tower.destroy());
    this.towers = [];
    this.selectedTower = null;
  }
}

