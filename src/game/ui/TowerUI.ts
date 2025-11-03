import * as Phaser from 'phaser';
import type { Tower } from '@/game/objects/Tower';
import { UI_STYLES } from '@/game/constants/gameConstants';

/**
 * UI компонент для отображения информации о башне
 */
export class TowerUI {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private nameText!: Phaser.GameObjects.Text;
  private damageText!: Phaser.GameObjects.Text;
  private rangeText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  
  private upgradeButton!: Phaser.GameObjects.Rectangle;
  private upgradeText!: Phaser.GameObjects.Text;
  private sellButton!: Phaser.GameObjects.Rectangle;
  private sellText!: Phaser.GameObjects.Text;

  private onUpgradeCallback?: (tower: Tower) => void;
  private onSellCallback?: (tower: Tower) => void;

  private currentTower: Tower | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
    this.hide();
  }

  private createUI(): void {
    const x = 600;
    const y = 100;
    const width = 180;
    const height = 250;

    // Контейнер для всего UI
    this.container = this.scene.add.container(x, y);

    // Фон панели
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x2d2d2d, 0.9);
    bg.setStrokeStyle(2, 0xffffff);
    this.container.add(bg);

    // Заголовок
    const title = this.scene.add.text(0, -100, 'Tower Info', {
      ...UI_STYLES.text,
      fontSize: '18px',
    }).setOrigin(0.5);
    this.container.add(title);

    // Название башни
    this.nameText = this.scene.add.text(0, -70, '', {
      ...UI_STYLES.text,
      fontSize: '16px',
      color: '#ffff00',
    }).setOrigin(0.5);
    this.container.add(this.nameText);

    // Уровень
    this.levelText = this.scene.add.text(0, -50, '', {
      ...UI_STYLES.text,
      fontSize: '14px',
    }).setOrigin(0.5);
    this.container.add(this.levelText);

    // Урон
    this.damageText = this.scene.add.text(0, -25, '', {
      ...UI_STYLES.text,
      fontSize: '14px',
    }).setOrigin(0, 0.5);
    this.container.add(this.damageText);

    // Радиус
    this.rangeText = this.scene.add.text(0, -5, '', {
      ...UI_STYLES.text,
      fontSize: '14px',
    }).setOrigin(0, 0.5);
    this.container.add(this.rangeText);

    // Скорость атаки
    this.speedText = this.scene.add.text(0, 15, '', {
      ...UI_STYLES.text,
      fontSize: '14px',
    }).setOrigin(0, 0.5);
    this.container.add(this.speedText);

    // Кнопка улучшения
    this.createUpgradeButton(0, 50);
    
    // Кнопка продажи
    this.createSellButton(0, 95);
  }

  private createUpgradeButton(x: number, y: number): void {
    const buttonWidth = 150;
    const buttonHeight = 35;

    this.upgradeButton = this.scene.add.rectangle(
      x,
      y,
      buttonWidth,
      buttonHeight,
      0x4a86e8
    )
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffffff);

    this.upgradeText = this.scene.add.text(x, y, 'Upgrade (0g)', {
      ...UI_STYLES.button,
      fontSize: '14px',
    })
      .setOrigin(0.5);

    this.container.add([this.upgradeButton, this.upgradeText]);

    this.upgradeButton.on('pointerdown', () => {
      if (this.currentTower && this.onUpgradeCallback) {
        this.onUpgradeCallback(this.currentTower);
      }
    });

    this.upgradeButton.on('pointerover', () => {
      this.upgradeButton.setFillStyle(0x5a96f8);
    });

    this.upgradeButton.on('pointerout', () => {
      this.upgradeButton.setFillStyle(0x4a86e8);
    });
  }

  private createSellButton(x: number, y: number): void {
    const buttonWidth = 150;
    const buttonHeight = 35;

    this.sellButton = this.scene.add.rectangle(
      x,
      y,
      buttonWidth,
      buttonHeight,
      0xff4444
    )
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffffff);

    this.sellText = this.scene.add.text(x, y, 'Sell (0g)', {
      ...UI_STYLES.button,
      fontSize: '14px',
    })
      .setOrigin(0.5);

    this.container.add([this.sellButton, this.sellText]);

    this.sellButton.on('pointerdown', () => {
      if (this.currentTower && this.onSellCallback) {
        this.onSellCallback(this.currentTower);
      }
    });

    this.sellButton.on('pointerover', () => {
      this.sellButton.setFillStyle(0xff6666);
    });

    this.sellButton.on('pointerout', () => {
      this.sellButton.setFillStyle(0xff4444);
    });
  }

  /**
   * Обновляет UI на основе данных башни
   */
  updateTowerInfo(tower: Tower | null): void {
    this.currentTower = tower;

    if (!tower) {
      this.hide();
      return;
    }

    this.show();

    const config = tower.towerData.config;

    // Обновляем информацию
    this.nameText.setText(config.name);
    this.levelText.setText(`Level ${tower.towerData.level}`);
    this.damageText.setText(`Damage: ${tower.getDamage()}`);
    this.rangeText.setText(`Range: ${tower.getRange()}`);
    this.speedText.setText(`Speed: ${tower.getAttackSpeed().toFixed(1)}/s`);

    // Обновляем кнопки
    const upgradeCost = tower.getUpgradeCost();
    if (upgradeCost > 0) {
      this.upgradeText.setText(`Upgrade (${upgradeCost}g)`);
      this.upgradeButton.setFillStyle(0x4a86e8);
      this.upgradeButton.setInteractive(true);
    } else {
      this.upgradeText.setText('Max Level');
      this.upgradeButton.setFillStyle(0x666666);
      this.upgradeButton.disableInteractive();
    }

    const sellPrice = tower.getSellPrice();
    this.sellText.setText(`Sell (${sellPrice}g)`);
  }

  /**
   * Показывает UI
   */
  show(): void {
    this.container.setVisible(true);
  }

  /**
   * Скрывает UI
   */
  hide(): void {
    this.container.setVisible(false);
  }

  /**
   * Устанавливает callback для улучшения
   */
  setOnUpgradeCallback(callback: (tower: Tower) => void): void {
    this.onUpgradeCallback = callback;
  }

  /**
   * Устанавливает callback для продажи
   */
  setOnSellCallback(callback: (tower: Tower) => void): void {
    this.onSellCallback = callback;
  }

  /**
   * Уничтожает UI
   */
  destroy(): void {
    this.container.destroy();
  }
}

