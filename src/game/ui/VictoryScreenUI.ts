import * as Phaser from 'phaser';
import { UI_STYLES } from '@/game/constants/gameConstants';

/**
 * UI экрана победы
 */
export class VictoryScreenUI {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private onRestartCallback?: () => void;
  private onMenuCallback?: () => void;
  private onShareCallback?: () => void;

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
    const panel = this.scene.add.rectangle(0, 0, 500, 450, 0x1a5a1a, 0.95);
    panel.setStrokeStyle(4, 0x00ff00);
    this.container.add(panel);

    // Заголовок
    const title = this.scene.add.text(0, -180, 'VICTORY!', {
      ...UI_STYLES.gameOver,
      fontSize: '56px',
      color: '#00ff00',
    }).setOrigin(0.5);
    this.container.add(title);

    // Статистика (будет обновляться)
    const statsText = this.scene.add.text(0, -50, '', {
      ...UI_STYLES.text,
      fontSize: '18px',
      align: 'center',
    }).setOrigin(0.5);
    this.container.add(statsText);

    // Сохраняем ссылку для обновления
    (statsText as any).updateStats = (data: any) => {
      statsText.setText(
        `Score: ${data.score.toLocaleString()}\n` +
        `Time: ${Math.floor(data.playTime / 60)}:${Math.floor(data.playTime % 60).toString().padStart(2, '0')}\n` +
        `Waves: ${data.wavesCompleted}\n` +
        `Enemies Killed: ${data.stats.enemiesKilled}\n` +
        `Perfect Waves: ${data.stats.perfectWaves}`
      );
    };

    // Кнопки
    const buttonY = 120;
    
    // Share
    this.createButton(-120, buttonY, 'Share', 0x4a86e8, () => {
      if (this.onShareCallback) this.onShareCallback();
    });

    // Restart
    this.createButton(0, buttonY, 'Restart', 0xff9900, () => {
      this.hide();
      if (this.onRestartCallback) this.onRestartCallback();
    });

    // Menu
    this.createButton(120, buttonY, 'Menu', 0xcc0000, () => {
      this.hide();
      if (this.onMenuCallback) this.onMenuCallback();
    });
  }

  private createButton(x: number, y: number, text: string, color: number, callback: () => void): void {
    const button = this.scene.add.rectangle(x, y, 120, 50, color)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffffff);

    const buttonText = this.scene.add.text(x, y, text, {
      ...UI_STYLES.button,
      fontSize: '16px',
    }).setOrigin(0.5);

    this.container.add([button, buttonText]);

    button.on('pointerdown', callback);
    button.on('pointerover', () => button.setFillStyle(color + 0x222222));
    button.on('pointerout', () => button.setFillStyle(color));
  }

  show(victoryData: any): void {
    this.container.setVisible(true);
    
    // Обновляем статистику
    const statsText = this.container.list.find(
      (obj: any) => obj.updateStats
    ) as any;
    if (statsText) {
      statsText.updateStats(victoryData);
    }
  }

  hide(): void {
    this.container.setVisible(false);
  }

  setOnRestartCallback(callback: () => void): void {
    this.onRestartCallback = callback;
  }

  setOnMenuCallback(callback: () => void): void {
    this.onMenuCallback = callback;
  }

  setOnShareCallback(callback: () => void): void {
    this.onShareCallback = callback;
  }
}

