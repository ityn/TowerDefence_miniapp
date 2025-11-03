import * as Phaser from 'phaser';
import { UI_STYLES } from '@/game/constants/gameConstants';

/**
 * UI экрана поражения
 */
export class DefeatScreenUI {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private onRetryCallback?: () => void;
  private onMenuCallback?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
    this.hide();
  }

  private createUI(): void {
    const centerX = 400;
    const centerY = 300;

    this.container = this.scene.add.container(centerX, centerY);

    // Фон
    const bg = this.scene.add.rectangle(0, 0, 800, 600, 0x000000, 0.8);
    this.container.add(bg);

    // Панель
    const panel = this.scene.add.rectangle(0, 0, 500, 400, 0x5a1a1a, 0.95);
    panel.setStrokeStyle(4, 0xff0000);
    this.container.add(panel);

    // Заголовок
    const title = this.scene.add.text(0, -150, 'DEFEAT', {
      ...UI_STYLES.gameOver,
      fontSize: '56px',
      color: '#ff0000',
    }).setOrigin(0.5);
    this.container.add(title);

    // Статистика
    const statsText = this.scene.add.text(0, -30, '', {
      ...UI_STYLES.text,
      fontSize: '18px',
      align: 'center',
    }).setOrigin(0.5);
    this.container.add(statsText);

    (statsText as any).updateStats = (data: any) => {
      statsText.setText(
        `Score: ${data.score.toLocaleString()}\n` +
        `Wave: ${data.wave}\n` +
        `Enemies Killed: ${data.stats.enemiesKilled}\n` +
        `Time: ${Math.floor(data.playTime / 60)}:${Math.floor(data.playTime % 60).toString().padStart(2, '0')}`
      );
    };

    // Кнопки
    const buttonY = 100;
    
    // Retry
    this.createButton(-80, buttonY, 'Retry', 0xff9900, () => {
      this.hide();
      if (this.onRetryCallback) this.onRetryCallback();
    });

    // Menu
    this.createButton(80, buttonY, 'Menu', 0xcc0000, () => {
      this.hide();
      if (this.onMenuCallback) this.onMenuCallback();
    });
  }

  private createButton(x: number, y: number, text: string, color: number, callback: () => void): void {
    const button = this.scene.add.rectangle(x, y, 150, 50, color)
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

  show(defeatData: any): void {
    this.container.setVisible(true);
    
    const statsText = this.container.list.find(
      (obj: any) => obj.updateStats
    ) as any;
    if (statsText) {
      statsText.updateStats(defeatData);
    }
  }

  hide(): void {
    this.container.setVisible(false);
  }

  setOnRetryCallback(callback: () => void): void {
    this.onRetryCallback = callback;
  }

  setOnMenuCallback(callback: () => void): void {
    this.onMenuCallback = callback;
  }
}

