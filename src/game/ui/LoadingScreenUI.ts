import * as Phaser from 'phaser';
import { UI_STYLES } from '@/game/constants/gameConstants';

/**
 * UI экрана загрузки
 */
export class LoadingScreenUI {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private progressBar!: Phaser.GameObjects.Rectangle;
  private progressText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
  }

  private createUI(): void {
    const centerX = 400;
    const centerY = 300;

    this.container = this.scene.add.container(centerX, centerY);

    // Фон
    const bg = this.scene.add.rectangle(0, 0, 800, 600, 0x1a1a2e);
    this.container.add(bg);

    // Заголовок
    const title = this.scene.add.text(0, -100, 'LOADING...', {
      ...UI_STYLES.text,
      fontSize: '32px',
      color: '#ffff00',
    }).setOrigin(0.5);
    this.container.add(title);

    // Прогресс бар
    const barBg = this.scene.add.rectangle(0, 0, 400, 20, 0x333333);
    this.progressBar = this.scene.add.rectangle(-200, 0, 0, 20, 0x00ff00);
    this.progressBar.setOrigin(0, 0.5);

    // Текст прогресса
    this.progressText = this.scene.add.text(0, 40, '0%', {
      ...UI_STYLES.text,
      fontSize: '18px',
    }).setOrigin(0.5);

    this.container.add([barBg, this.progressBar, this.progressText]);
  }

  /**
   * Обновляет прогресс загрузки
   */
  setProgress(progress: number): void {
    const width = Math.min(progress * 4, 400);
    this.progressBar.width = width;
    this.progressText.setText(`${Math.floor(progress)}%`);
  }

  show(): void {
    this.container.setVisible(true);
    this.setProgress(0);
  }

  hide(): void {
    this.container.setVisible(false);
  }
}

