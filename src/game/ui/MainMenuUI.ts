import * as Phaser from 'phaser';
import { UI_STYLES } from '@/game/constants/gameConstants';
import type { PlayerProfile } from '@/types/profileTypes';

/**
 * UI главного меню
 */
export class MainMenuUI {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private onStartGameCallback?: (mapId: string) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
  }

  private createUI(): void {
    const centerX = 400;
    const centerY = 300;

    this.container = this.scene.add.container(centerX, centerY);

    // Фон
    const bg = this.scene.add.rectangle(0, 0, 800, 600, 0x1a1a2e, 0.95);
    this.container.add(bg);

    // Заголовок
    const title = this.scene.add.text(0, -200, 'TOWER DEFENCE', {
      ...UI_STYLES.gameOver,
      fontSize: '48px',
      color: '#ffd700',
    }).setOrigin(0.5);
    this.container.add(title);

    // Кнопка "Play"
    const playButton = this.scene.add.rectangle(0, -50, 200, 60, 0x00aa00)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(3, 0xffffff);

    const playText = this.scene.add.text(0, -50, 'PLAY', {
      ...UI_STYLES.button,
      fontSize: '24px',
    }).setOrigin(0.5);

    this.container.add([playButton, playText]);

    playButton.on('pointerdown', () => {
      this.hide();
      if (this.onStartGameCallback) {
        this.onStartGameCallback('forest'); // По умолчанию Forest
      }
    });

    playButton.on('pointerover', () => playButton.setFillStyle(0x00cc00));
    playButton.on('pointerout', () => playButton.setFillStyle(0x00aa00));

    // Статистика игрока
    this.createStatsPanel();
  }

  private createStatsPanel(): void {
    const statsY = 100;
    
    const statsText = this.scene.add.text(0, statsY, '', {
      ...UI_STYLES.text,
      fontSize: '16px',
    }).setOrigin(0.5);

    this.container.add(statsText);

    // Обновляется извне
    (statsText as any).updateStats = (profile: PlayerProfile) => {
      statsText.setText(
        `Coins: ${profile.coins} | Score: ${profile.totalScore}\n` +
        `Maps: ${profile.unlockedMaps.length} | Waves: ${profile.stats.gamesWon}`
      );
    };
  }

  /**
   * Показывает меню
   */
  show(profile: PlayerProfile): void {
    this.container.setVisible(true);
    
    // Обновляем статистику
    const statsText = this.container.list.find(
      (obj: any) => obj.updateStats
    ) as any;
    if (statsText) {
      statsText.updateStats(profile);
    }
  }

  /**
   * Скрывает меню
   */
  hide(): void {
    this.container.setVisible(false);
  }

  /**
   * Устанавливает колбэк начала игры
   */
  setOnStartGameCallback(callback: (mapId: string) => void): void {
    this.onStartGameCallback = callback;
  }
}

