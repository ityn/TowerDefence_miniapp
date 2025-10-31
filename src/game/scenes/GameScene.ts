import * as Phaser from 'phaser';
import { GameState, TowerType } from '@/types/gameTypes';
import { INITIAL_GAME_STATE, TOWER_COSTS, TOWER_COLORS, UI_STYLES, BUTTON_COLORS } from '@/game/constants/gameConstants';
import { showAlert } from '@/utils/telegram';

export default class GameScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  
  private gameState: GameState = { ...INITIAL_GAME_STATE };

  private enemies: Phaser.GameObjects.Rectangle[] = [];
  private towers: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Загрузка assets
    this.load.setBaseURL('/assets/');
    this.load.image('tower_basic', 'towers/basic.png');
    this.load.image('enemy_slow', 'enemies/slow.png');
    this.load.image('background', 'maps/grass.png');
  }

  create(): void {
    // Создаем фон
    this.add.image(400, 300, 'background');
    
    this.createUI();
    this.createBuildButtons();
    this.startWave();
  }

  private createUI(): void {
    this.coinsText = this.add.text(20, 20, `Coins: ${this.gameState.coins}`, UI_STYLES.text);
    this.livesText = this.add.text(20, 50, `Lives: ${this.gameState.lives}`, UI_STYLES.text);
    this.waveText = this.add.text(20, 80, `Wave: ${this.gameState.currentWave}`, UI_STYLES.text);
  }

  private createBuildButtons(): void {
    // Кнопка для постройки обычной башни
    const cannonButton = this.add.rectangle(100, 500, 120, 40, BUTTON_COLORS.cannon)
      .setInteractive()
      .setStrokeStyle(2, 0xffffff);

    const cannonCost = TOWER_COSTS[TowerType.CANNON];
    const cannonText = this.add.text(100, 500, `Cannon (${cannonCost}g)`, {
      ...UI_STYLES.button,
    }).setOrigin(0.5);

    cannonButton.on('pointerdown', () => {
      this.buildTower(TowerType.CANNON);
    });

    // Кнопка для ледяной башни
    const iceButton = this.add.rectangle(250, 500, 120, 40, BUTTON_COLORS.ice)
      .setInteractive()
      .setStrokeStyle(2, 0xffffff);

    const iceCost = TOWER_COSTS[TowerType.ICE];
    const iceText = this.add.text(250, 500, `Ice Tower (${iceCost}g)`, {
      ...UI_STYLES.button,
    }).setOrigin(0.5);

    iceButton.on('pointerdown', () => {
      this.buildTower(TowerType.ICE);
    });
  }

  private buildTower(towerType: TowerType): void {
    const cost = TOWER_COSTS[towerType];

    if (this.gameState.coins >= cost && !this.gameState.isGameOver) {
      this.gameState.coins -= cost;
      this.updateUI();

      // Создаем временную башню
      const tower = this.add.rectangle(400, 300, 40, 40, TOWER_COLORS[towerType]);
      
      this.towers.push(tower);
      console.log(`Built ${towerType} tower`);
    }
  }

  private startWave(): void {
    // Временная логика спавна врагов
    this.time.addEvent({
      delay: 2000,
      callback: this.spawnTestEnemy,
      callbackScope: this,
      loop: true
    });
  }

  private spawnTestEnemy(): void {
    if (this.gameState.isGameOver) return;

    const enemy = this.add.rectangle(800, 100, 30, 30, 0xff0000);
    
    this.tweens.add({
      targets: enemy,
      x: 0,
      duration: 5000,
      onComplete: () => {
        this.enemyReachedEnd(enemy);
      }
    });

    this.enemies.push(enemy);
  }

  private enemyReachedEnd(enemy: Phaser.GameObjects.Rectangle): void {
    enemy.destroy();
    this.enemies = this.enemies.filter(e => e !== enemy);
    
    this.gameState.lives -= 1;
    this.updateUI();

    if (this.gameState.lives <= 0) {
      this.gameOver();
    }
  }

  private updateUI(): void {
    this.coinsText.setText(`Coins: ${this.gameState.coins}`);
    this.livesText.setText(`Lives: ${this.gameState.lives}`);
    this.waveText.setText(`Wave: ${this.gameState.currentWave}`);
  }

  private gameOver(): void {
    this.gameState.isGameOver = true;
    
    const gameOverText = this.add.text(400, 300, 'Game Over!', UI_STYLES.gameOver)
      .setOrigin(0.5);

    showAlert(`Game Over! Your score: ${this.gameState.score}`);
  }

  update(time: number, delta: number): void {
    // Основной игровой цикл
    this.updateTowers();
  }

  private updateTowers(): void {
    // Временная логика атаки башен
    this.towers.forEach(tower => {
      const target = this.findTargetInRange(tower);
      if (target) {
        console.log('Tower attacking enemy!');
      }
    });
  }

  private findTargetInRange(tower: Phaser.GameObjects.Rectangle): Phaser.GameObjects.Rectangle | null {
    const range = 150;
    
    for (const enemy of this.enemies) {
      const distance = Phaser.Math.Distance.Between(
        tower.x, tower.y, enemy.x, enemy.y
      );
      
      if (distance <= range) {
        return enemy;
      }
    }
    
    return null;
  }
}