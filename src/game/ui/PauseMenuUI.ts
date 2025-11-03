import * as Phaser from 'phaser';
import { UI_STYLES } from '@/game/constants/gameConstants';
import type { PlayerSettings } from '@/types/profileTypes';

/**
 * UI меню паузы
 */
export class PauseMenuUI {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private onResumeCallback?: () => void;
  private onRestartCallback?: () => void;
  private onMenuCallback?: () => void;
  private onSettingsCallback?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
    this.hide();
  }

  private createUI(): void {
    const centerX = 400;
    const centerY = 300;

    this.container = this.scene.add.container(centerX, centerY);

    // Фон с прозрачностью
    const bg = this.scene.add.rectangle(0, 0, 800, 600, 0x000000, 0.7);
    this.container.add(bg);

    // Панель меню
    const panel = this.scene.add.rectangle(0, 0, 400, 400, 0x2d2d2d, 0.95);
    panel.setStrokeStyle(3, 0xffffff);
    this.container.add(panel);

    // Заголовок
    const title = this.scene.add.text(0, -150, 'PAUSED', {
      ...UI_STYLES.text,
      fontSize: '36px',
      color: '#ffff00',
    }).setOrigin(0.5);
    this.container.add(title);

    // Кнопки
    const buttonY = -50;
    const buttonSpacing = 70;

    // Resume
    this.createButton(0, buttonY, 'Resume', 0x00aa00, () => {
      this.hide();
      if (this.onResumeCallback) this.onResumeCallback();
    });

    // Settings
    this.createButton(0, buttonY + buttonSpacing, 'Settings', 0x4a86e8, () => {
      if (this.onSettingsCallback) this.onSettingsCallback();
    });

    // Restart
    this.createButton(0, buttonY + buttonSpacing * 2, 'Restart', 0xff9900, () => {
      if (this.onRestartCallback) {
        this.scene.events.emit('pauseMenuRestart');
        this.onRestartCallback();
      }
    });

    // Main Menu
    this.createButton(0, buttonY + buttonSpacing * 3, 'Main Menu', 0xcc0000, () => {
      if (this.onMenuCallback) {
        this.scene.events.emit('pauseMenuMainMenu');
        this.onMenuCallback();
      }
    });
  }

  private createButton(x: number, y: number, text: string, color: number, callback: () => void): void {
    const button = this.scene.add.rectangle(x, y, 250, 50, color)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffffff);

    const buttonText = this.scene.add.text(x, y, text, {
      ...UI_STYLES.button,
      fontSize: '18px',
    }).setOrigin(0.5);

    this.container.add([button, buttonText]);

    button.on('pointerdown', callback);
    button.on('pointerover', () => button.setFillStyle(color + 0x222222));
    button.on('pointerout', () => button.setFillStyle(color));
  }

  show(): void {
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  setOnResumeCallback(callback: () => void): void {
    this.onResumeCallback = callback;
  }

  setOnRestartCallback(callback: () => void): void {
    this.onRestartCallback = callback;
  }

  setOnMenuCallback(callback: () => void): void {
    this.onMenuCallback = callback;
  }

  setOnSettingsCallback(callback: () => void): void {
    this.onSettingsCallback = callback;
  }
}

