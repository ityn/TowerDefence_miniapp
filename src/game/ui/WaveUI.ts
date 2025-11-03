import * as Phaser from 'phaser';
import type { WaveProgress } from '@/types/gameTypes';
import { UI_STYLES } from '@/game/constants/gameConstants';

/**
 * UI компонент для отображения информации о волнах
 */
export class WaveUI {
  private scene: Phaser.Scene;
  private waveText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBarBg!: Phaser.GameObjects.Graphics;
  private startWaveButton!: Phaser.GameObjects.Rectangle;
  private startWaveText!: Phaser.GameObjects.Text;
  
  private onStartWaveCallback?: () => void;

  constructor(scene: Phaser.Scene, x: number = 20, y: number = 110) {
    this.scene = scene;
    this.createUI(x, y);
  }

  private createUI(x: number, y: number): void {
    // Текст текущей волны
    this.waveText = this.scene.add.text(x, y, 'Wave: 0/0', {
      ...UI_STYLES.text,
    });

    // Прогресс волны
    this.progressText = this.scene.add.text(x, y + 30, 'Enemies: 0/0', {
      ...UI_STYLES.text,
      fontSize: '16px',
    });

    // Таймер до следующей волны
    this.timerText = this.scene.add.text(x, y + 50, '', {
      ...UI_STYLES.text,
      fontSize: '14px',
      color: '#ffff00',
    });

    // Прогресс-бар
    this.createProgressBar(x + 150, y + 15);

    // Кнопка "Start Wave"
    this.createStartWaveButton(x + 350, y + 15);
  }

  private createProgressBar(x: number, y: number): void {
    const barWidth = 150;
    const barHeight = 20;

    // Фон прогресс-бара
    this.progressBarBg = this.scene.add.graphics();
    this.progressBarBg.fillStyle(0x333333, 0.8);
    this.progressBarBg.fillRect(x, y, barWidth, barHeight);
    this.progressBarBg.setDepth(100);

    // Сам прогресс-бар
    this.progressBar = this.scene.add.graphics();
    this.progressBar.setDepth(101);
  }

  private createStartWaveButton(x: number, y: number): void {
    const buttonWidth = 120;
    const buttonHeight = 40;

    this.startWaveButton = this.scene.add.rectangle(
      x,
      y,
      buttonWidth,
      buttonHeight,
      0x00aa00
    )
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffffff)
      .setDepth(100);

    this.startWaveText = this.scene.add.text(x, y, 'Start Wave', {
      ...UI_STYLES.button,
      fontSize: '14px',
    })
      .setOrigin(0.5)
      .setDepth(101);

    this.startWaveButton.on('pointerdown', () => {
      if (this.onStartWaveCallback) {
        this.onStartWaveCallback();
      }
    });

    this.startWaveButton.on('pointerover', () => {
      this.startWaveButton.setFillStyle(0x00cc00);
    });

    this.startWaveButton.on('pointerout', () => {
      this.startWaveButton.setFillStyle(0x00aa00);
    });

    // Изначально скрываем кнопку
    this.hideStartWaveButton();
  }

  /**
   * Обновляет UI на основе прогресса волны
   */
  updateWaveProgress(progress: WaveProgress): void {
    // Обновляем текст волны
    this.waveText.setText(
      `Wave: ${progress.currentWave}/${progress.totalWaves}`
    );

    // Обновляем прогресс врагов
    if (progress.isWaveInProgress) {
      this.progressText.setText(
        `Enemies: ${progress.enemiesAlive}/${progress.enemiesTotal}`
      );
    } else {
      this.progressText.setText(
        `Enemies: ${progress.enemiesSpawned}/${progress.enemiesTotal}`
      );
    }

    // Обновляем таймер
    if (progress.timeUntilNextWave > 0 && !progress.isWaveInProgress) {
      const seconds = Math.ceil(progress.timeUntilNextWave);
      this.timerText.setText(`Next wave in: ${seconds}s`);
      this.timerText.setVisible(true);
      this.showStartWaveButton();
    } else {
      this.timerText.setVisible(false);
      if (progress.isWaveInProgress) {
        this.hideStartWaveButton();
      } else if (progress.currentWave >= progress.totalWaves) {
        this.hideStartWaveButton();
      } else {
        this.showStartWaveButton();
      }
    }

    // Обновляем прогресс-бар
    this.updateProgressBar(progress);
  }

  /**
   * Обновляет прогресс-бар
   */
  private updateProgressBar(progress: WaveProgress): void {
    const barWidth = 150;
    const barHeight = 20;
    const x = 170; // x + 150 from createProgressBar
    const y = 125; // y + 15 from createProgressBar

    this.progressBar.clear();

    if (progress.isWaveInProgress) {
      // Прогресс во время волны - сколько врагов убито
      const progressPercent = progress.enemiesTotal > 0
        ? (progress.enemiesTotal - progress.enemiesAlive) / progress.enemiesTotal
        : 0;

      const progressWidth = barWidth * progressPercent;
      
      // Цвет от красного к зеленому
      const color = progressPercent < 0.5
        ? 0xff0000
        : progressPercent < 0.8
        ? 0xffff00
        : 0x00ff00;

      this.progressBar.fillStyle(color);
      this.progressBar.fillRect(x, y, progressWidth, barHeight);
    } else if (progress.currentWave < progress.totalWaves) {
      // Ожидание следующей волны - показываем готовность
      this.progressBar.fillStyle(0x00aa00);
      this.progressBar.fillRect(x, y, barWidth, barHeight);
    } else {
      // Все волны завершены
      this.progressBar.fillStyle(0x00ff00);
      this.progressBar.fillRect(x, y, barWidth, barHeight);
    }
  }

  /**
   * Показывает кнопку "Start Wave"
   */
  showStartWaveButton(): void {
    this.startWaveButton.setVisible(true);
    this.startWaveText.setVisible(true);
  }

  /**
   * Скрывает кнопку "Start Wave"
   */
  hideStartWaveButton(): void {
    this.startWaveButton.setVisible(false);
    this.startWaveText.setVisible(false);
  }

  /**
   * Устанавливает callback для кнопки "Start Wave"
   */
  setOnStartWaveCallback(callback: () => void): void {
    this.onStartWaveCallback = callback;
  }

  /**
   * Уничтожает UI элементы
   */
  destroy(): void {
    this.waveText.destroy();
    this.progressText.destroy();
    this.timerText.destroy();
    this.progressBar.destroy();
    this.progressBarBg.destroy();
    this.startWaveButton.destroy();
    this.startWaveText.destroy();
  }
}

