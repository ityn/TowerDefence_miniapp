import * as Phaser from 'phaser';
import { UI_STYLES } from '@/game/constants/gameConstants';

/**
 * UI для ежедневных наград
 */
export class DailyRewardUI {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private isVisible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
    this.hide();
  }

  private createUI(): void {
    const x = 400;
    const y = 300;
    const width = 300;
    const height = 200;

    this.container = this.scene.add.container(x, y);

    // Фон
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x2d2d2d, 0.95);
    bg.setStrokeStyle(3, 0xffff00);
    this.container.add(bg);

    // Заголовок
    const title = this.scene.add.text(0, -70, 'Ежедневная награда!', {
      ...UI_STYLES.text,
      fontSize: '22px',
      color: '#ffff00',
    }).setOrigin(0.5);
    this.container.add(title);

    // Текст streak
    const streakText = this.scene.add.text(0, -30, '', {
      ...UI_STYLES.text,
      fontSize: '16px',
    }).setOrigin(0.5);
    this.container.add(streakText);

    // Награда
    const rewardText = this.scene.add.text(0, 10, '', {
      ...UI_STYLES.text,
      fontSize: '20px',
      color: '#00ff00',
    }).setOrigin(0.5);
    this.container.add(rewardText);

    // Кнопка "Claim"
    const claimButton = this.scene.add.rectangle(0, 60, 150, 40, 0x00aa00)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffffff);

    const claimText = this.scene.add.text(0, 60, 'Получить', {
      ...UI_STYLES.button,
      fontSize: '16px',
    }).setOrigin(0.5);

    this.container.add([claimButton, claimText]);

    claimButton.on('pointerdown', () => {
      this.hide();
      this.scene.events.emit('dailyRewardClaimed');
    });

    claimButton.on('pointerover', () => {
      claimButton.setFillStyle(0x00cc00);
    });

    claimButton.on('pointerout', () => {
      claimButton.setFillStyle(0x00aa00);
    });
  }

  /**
   * Показывает UI с информацией о награде
   */
  show(reward: number, streak: number): void {
    this.isVisible = true;
    this.container.setVisible(true);

    // Обновляем тексты
    const streakText = this.container.list[2] as Phaser.GameObjects.Text;
    streakText.setText(`Серия: ${streak} дней`);

    const rewardText = this.container.list[3] as Phaser.GameObjects.Text;
    rewardText.setText(`+${reward} монет`);
  }

  /**
   * Скрывает UI
   */
  hide(): void {
    this.isVisible = false;
    this.container.setVisible(false);
  }
}

