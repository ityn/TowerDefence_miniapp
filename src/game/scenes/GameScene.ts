import * as Phaser from 'phaser';
import { GameState, TowerType } from '@/types/gameTypes';
import { INITIAL_GAME_STATE, UI_STYLES } from '@/game/constants/gameConstants';
import { showAlert } from '@/utils/telegram';
import { mapManager } from '@/game/managers/MapManager';
import type { LoadedMap, Path } from '@/types/mapTypes';
import { EnemyManager } from '@/game/managers/EnemyManager';
import { WaveManager } from '@/game/managers/WaveManager';
import { WaveUI } from '@/game/ui/WaveUI';
import { WaveEvents } from '@/types/waveTypes';
import type { WaveStartedEvent, WaveCompletedEvent } from '@/types/waveTypes';
import type { EnemyDiedEvent } from '@/types/waveTypes';
import { EffectSystem } from '@/game/systems/EffectSystem';
import { ProjectileSystem } from '@/game/systems/ProjectileSystem';
import { TowerSystem } from '@/game/systems/TowerSystem';
import { TowerUI } from '@/game/ui/TowerUI';
import { TowerEvents } from '@/types/towerEvents';
import type { TowerBuiltEvent, TowerUpgradedEvent, TowerSoldEvent } from '@/types/towerEvents';
import { PlayerProfileService } from '@/services/PlayerProfileService';
import { TelegramIntegrationService } from '@/services/TelegramIntegrationService';
import { AchievementSystem } from '@/services/AchievementSystem';
import { AchievementEvents } from '@/types/achievementTypes';
import { ParticleManager } from '@/game/systems/ParticleManager';
import { SoundManager } from '@/game/systems/SoundManager';
import { CameraEffects } from '@/game/systems/CameraEffects';
import { DailyRewardUI } from '@/game/ui/DailyRewardUI';

/**
 * Основная игровая сцена
 */
export default class GameScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  
  private gameState: GameState = { ...INITIAL_GAME_STATE };
  
  // Карта и путь
  private currentMap: LoadedMap | null = null;
  private path: Path | null = null;
  private pathGraphics!: Phaser.GameObjects.Graphics;

  // Менеджеры
  private enemyManager!: EnemyManager;
  private waveManager!: WaveManager;
  private waveUI!: WaveUI;
  
  // Системы башен
  private effectSystem!: EffectSystem;
  private projectileSystem!: ProjectileSystem;
  private towerSystem!: TowerSystem;
  private towerUI!: TowerUI;

  // Прогресс и интеграция
  private profileService!: PlayerProfileService;
  private telegramService!: TelegramIntegrationService;
  private achievementSystem!: AchievementSystem;

  // Визуальные эффекты
  private particleManager!: ParticleManager;
  private soundManager!: SoundManager;
  private cameraEffects!: CameraEffects;
  private dailyRewardUI!: DailyRewardUI;

  // Состояние строительства
  private selectedTowerType: string | null = null;
  private initialCoins: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  async preload(): Promise<void> {
    // Загрузка assets
    this.load.setBaseURL('/assets/');
    this.load.image('tower_basic', 'towers/basic.png');
    this.load.image('enemy_slow', 'enemies/slow.png');
    this.load.image('background', 'maps/grass.png');
  }

  async create(): Promise<void> {
    // Инициализируем Telegram интеграцию
    this.telegramService = new TelegramIntegrationService();
    
    // Получаем userId из Telegram или генерируем
    const user = this.telegramService.getUser();
    const userId = user?.id?.toString() || `user_${Date.now()}`;

    // Инициализируем профиль
    this.profileService = new PlayerProfileService(userId);
    await this.profileService.initialize();

    // Применяем реферальный код если есть
    await this.handleReferralCode();

    // Проверяем ежедневную награду
    this.checkDailyReward();

    // Загружаем профиль в игровое состояние
    const profile = this.profileService.getProfile();
    this.gameState.coins = profile.coins;
    this.initialCoins = profile.coins;

    // Инициализируем систему достижений
    this.achievementSystem = new AchievementSystem(
      this.profileService,
      this.telegramService,
      this.events
    );
    await this.achievementSystem.loadAchievements();

    // Инициализируем системы эффектов и проектилей
    this.effectSystem = new EffectSystem(this);
    this.projectileSystem = new ProjectileSystem(this, this.effectSystem);

    // Инициализируем визуальные эффекты
    this.particleManager = new ParticleManager(this);
    this.soundManager = new SoundManager(this, profile.settings);
    this.cameraEffects = new CameraEffects(this);

    // Инициализируем менеджеры
    this.enemyManager = new EnemyManager(this);
    this.waveManager = new WaveManager(this, this.enemyManager);
    this.towerSystem = new TowerSystem(this, this.projectileSystem);

    // Загружаем конфиги
    await this.loadConfigs();

    // Загружаем и инициализируем карту
    await this.loadMap('forest');
    
    // Создаем фон
    const bgColor = this.currentMap?.background === 'desert' ? 0xf4e4bc : 0x2d5016;
    this.add.rectangle(400, 300, 800, 600, bgColor);
    
    // Визуализируем путь
    this.visualizePath();
    
    // Создаем UI
    this.createUI();
    this.createBuildButtons();

    // Подписываемся на события
    this.setupEventListeners();

    // Настраиваем обработку кликов для строительства
    this.setupBuildMode();

    // Устанавливаем путь для волн
    if (this.path) {
      this.waveManager.setPath(this.path);
    }

    // Автосохранение каждую минуту
    this.setupAutoSave();
  }

  /**
   * Обрабатывает реферальный код из URL
   */
  private async handleReferralCode(): Promise<void> {
    const refCode = this.telegramService.getReferralCode();
    if (refCode) {
      const bonus = await this.telegramService.applyReferralBonus(refCode);
      this.profileService.addCoins(bonus);
      this.telegramService.showAlert(`Реферальный бонус: +${bonus} монет!`);
    }
  }

  /**
   * Проверяет ежедневную награду
   */
  private checkDailyReward(): void {
    const check = this.profileService.checkDailyReward();
    if (check.canClaim) {
      // Показываем UI через небольшую задержку
      this.time.delayedCall(1000, () => {
        this.dailyRewardUI.show(check.reward, check.streak);
      });
    }
  }

  /**
   * Настраивает автосохранение
   */
  private setupAutoSave(): void {
    this.time.addEvent({
      delay: 60000, // Каждую минуту
      callback: this.saveGameProgress,
      callbackScope: this,
      loop: true,
    });

    // Сохраняем при завершении волны
    this.events.on(WaveEvents.WAVE_COMPLETED, this.saveGameProgress, this);
  }

  /**
   * Сохраняет прогресс игры
   */
  private async saveGameProgress(): Promise<void> {
    const profile = this.profileService.getProfile();
    
    // Обновляем статистику
    profile.stats.gamesPlayed += 1;
    
    // Сохраняем в Telegram Cloud или LocalStorage
    await this.telegramService.saveProgress(profile);
    await this.profileService.saveProfile();
  }

  /**
   * Загружает все конфиги
   */
  private async loadConfigs(): Promise<void> {
    try {
      await this.enemyManager.loadEnemyConfigs();
      await this.waveManager.loadWaves('forest');
      await this.towerSystem.loadTowerConfigs();
    } catch (error) {
      console.error('Error loading configs:', error);
      showAlert('Failed to load game configs');
    }
  }

  /**
   * Настраивает обработчики событий
   */
  private setupEventListeners(): void {
    // События волн
    this.waveManager.on(WaveEvents.WAVE_STARTED, (event: WaveStartedEvent) => {
      console.log(`Wave ${event.waveNumber} started: ${event.description}`);
    });

    this.waveManager.on(WaveEvents.WAVE_COMPLETED, (event: WaveCompletedEvent) => {
      console.log(`Wave ${event.waveNumber} completed! Reward: ${event.reward}`);
      this.gameState.coins += event.reward;
      this.gameState.score += event.reward;
      
      // Эффект получения монет
      this.particleManager.createCoinEffect(400, 100, event.reward);
      this.soundManager.playSound('coin');
      
      this.profileService.addCoins(event.reward);
      this.profileService.updateScore(event.reward);
      
      this.achievementSystem.trackEvent('wave_completed');
      this.achievementSystem.checkAchievements(this.gameState);
      
      this.updateUI();
      this.saveGameProgress();
      
      // Автоматически начинаем следующую волну
      this.time.delayedCall(2000, () => {
        if (!this.gameState.isGameOver) {
          this.waveManager.startNextWave();
        }
      });
    });

    this.waveManager.on(WaveEvents.WAVE_PROGRESS_UPDATED, () => {
      const progress = this.waveManager.getWaveProgress();
      this.waveUI.updateWaveProgress(progress);
    });

    this.waveManager.on(WaveEvents.ALL_WAVES_COMPLETED, () => {
      console.log('All waves completed!');
      this.handleVictory();
    });

    // События врагов
    this.enemyManager.on(WaveEvents.ENEMY_DIED, (event: EnemyDiedEvent) => {
      this.gameState.coins += event.bounty;
      this.gameState.score += event.bounty;
      
      // Эффекты
      this.particleManager.createStars(this.input.mousePointer.x, this.input.mousePointer.y);
      this.soundManager.playSound('hit');
      
      this.profileService.addCoins(event.bounty);
      this.profileService.updateScore(event.bounty);
      this.profileService.updateGameStats({
        totalEnemiesKilled: this.profileService.getProfile().stats.totalEnemiesKilled + 1,
      });
      
      this.achievementSystem.trackEvent('enemy_killed');
      this.achievementSystem.checkAchievements(this.gameState);
      
      this.updateUI();
    });

    this.enemyManager.on(WaveEvents.ENEMY_REACHED_END, () => {
      this.gameState.lives -= 1;
      this.cameraEffects.shakeHit();
      this.updateUI();

      if (this.gameState.lives <= 0) {
        this.gameOver();
      }
    });

    // События башен
    this.towerSystem.on(TowerEvents.TOWER_BUILT, (event: TowerBuiltEvent) => {
      this.gameState.coins -= event.cost;
      this.particleManager.createStars(event.x, event.y);
      this.soundManager.playSound('build');
      
      this.achievementSystem.trackEvent('tower_built');
      this.achievementSystem.checkAchievements(this.gameState);
      
      this.updateUI();
    });

    this.towerSystem.on(TowerEvents.TOWER_UPGRADED, (event: TowerUpgradedEvent) => {
      this.gameState.coins -= event.cost;
      this.particleManager.createMagic(400, 300);
      this.soundManager.playSound('upgrade');
      
      // Обновляем максимальный уровень башни в профиле
      const selectedTower = this.towerSystem.getSelectedTower();
      if (selectedTower) {
        this.profileService.updateTowerLevel(selectedTower.towerData.type, event.newLevel);
      }
      
      this.achievementSystem.trackEvent('tower_upgraded');
      this.achievementSystem.checkAchievements(this.gameState);
      
      this.updateUI();
      if (selectedTower) {
        this.towerUI.updateTowerInfo(selectedTower);
      }
    });

    this.towerSystem.on(TowerEvents.TOWER_SOLD, (event: TowerSoldEvent) => {
      this.gameState.coins += event.refund;
      this.soundManager.playSound('coin');
      this.updateUI();
    });

    // События проектилей
    this.projectileSystem.on('projectileHit', () => {
      this.soundManager.playSound('hit');
    });

    // События эффектов (splash damage)
    this.effectSystem.on('effectApplied', (data: any) => {
      if (data.effect.type === 'splash') {
        this.cameraEffects.shakeExplosion();
        this.particleManager.createExplosion(data.enemy.x, data.enemy.y);
      }
    });

    // События достижений
    this.events.on(AchievementEvents.ACHIEVEMENT_UNLOCKED, (data: any) => {
      this.particleManager.createCoinEffect(400, 300, data.reward);
      this.cameraEffects.shake(0.01, 300);
      this.soundManager.playSound('achievement');
    });

    // Ежедневная награда
    this.events.on('dailyRewardClaimed', () => {
      const reward = this.profileService.claimDailyReward();
      this.gameState.coins += reward;
      this.particleManager.createCoinEffect(400, 300, reward);
      this.updateUI();
    });
  }

  /**
   * Обрабатывает победу
   */
  private handleVictory(): void {
    const profile = this.profileService.getProfile();
    profile.stats.gamesWon += 1;
    
    // Проверяем достижения
    this.achievementSystem.trackEvent('map_completed', { livesLost: this.gameState.lives < INITIAL_GAME_STATE.lives });
    this.achievementSystem.checkAchievements(this.gameState);
    
    // Эффекты победы
    this.cameraEffects.flash(0x00ff00, 500);
    this.particleManager.createStars(400, 300);
    this.particleManager.createCoinEffect(400, 300, this.gameState.score);
    
    showAlert(`Victory! Score: ${this.gameState.score}`);
    
    // Сохраняем прогресс
    this.saveGameProgress();
    
    // Предлагаем поделиться результатом
    this.time.delayedCall(2000, () => {
      this.telegramService.shareLink('high_score' as any, { score: this.gameState.score });
    });
  }

  /**
   * Загружает карту
   */
  private async loadMap(mapId: string): Promise<void> {
    try {
      const loadedMap = await mapManager.loadMap(mapId);
      mapManager.setCurrentMap(loadedMap);
      this.currentMap = loadedMap;
      this.path = mapManager.getCurrentPath();
      
      if (!this.path) {
        throw new Error('Failed to create path for map');
      }

      console.log(`Map loaded: ${loadedMap.name}, waypoints: ${loadedMap.waypoints.length}`);
    } catch (error) {
      console.error('Error loading map:', error);
      showAlert('Failed to load map. Using default.');
      this.createDefaultPath();
    }
  }

  /**
   * Создает дефолтный путь если загрузка карты не удалась
   */
  private createDefaultPath(): void {
    this.path = {
      waypoints: [
        { x: 800, y: 100 },
        { x: 600, y: 100 },
        { x: 600, y: 300 },
        { x: 200, y: 300 },
        { x: 200, y: 500 },
        { x: 0, y: 500 },
      ],
      totalDistance: 0,
    };
  }

  /**
   * Визуализирует путь на карте
   */
  private visualizePath(): void {
    if (!this.path) return;

    this.pathGraphics = this.add.graphics();
    this.pathGraphics.lineStyle(4, 0x8b4513, 0.8);
    this.pathGraphics.fillStyle(0x8b4513, 0.6);

    const { waypoints } = this.path;
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(waypoints[0].x, waypoints[0].y);

    for (let i = 1; i < waypoints.length; i++) {
      this.pathGraphics.lineTo(waypoints[i].x, waypoints[i].y);
    }
    this.pathGraphics.strokePath();

    waypoints.forEach((waypoint, index) => {
      if (index === 0) {
        this.pathGraphics.fillStyle(0x00ff00, 0.8);
      } else if (index === waypoints.length - 1) {
        this.pathGraphics.fillStyle(0xff0000, 0.8);
      } else {
        this.pathGraphics.fillStyle(0xffff00, 0.8);
      }

      this.pathGraphics.fillCircle(waypoint.x, waypoint.y, 8);
    });
  }

  private createUI(): void {
    this.coinsText = this.add.text(20, 20, `Coins: ${this.gameState.coins}`, UI_STYLES.text);
    this.livesText = this.add.text(20, 50, `Lives: ${this.gameState.lives}`, UI_STYLES.text);
    
    // Создаем UI для волн
    this.waveUI = new WaveUI(this);
    this.waveUI.setOnStartWaveCallback(() => {
      this.handleStartWave();
    });

    // Создаем UI для башен
    this.towerUI = new TowerUI(this);
    this.towerUI.setOnUpgradeCallback((tower) => {
      this.handleUpgradeTower(tower);
    });
    this.towerUI.setOnSellCallback((tower) => {
      this.handleSellTower(tower);
    });

    // Создаем UI для ежедневных наград
    this.dailyRewardUI = new DailyRewardUI(this);

    // Обновляем начальное состояние UI
    const progress = this.waveManager.getWaveProgress();
    this.waveUI.updateWaveProgress(progress);
  }

  /**
   * Обработчик кнопки "Start Wave"
   */
  private handleStartWave(): void {
    if (this.waveManager.isWaveActive()) {
      return;
    }

    if (this.waveManager.getWaveProgress().timeUntilNextWave > 0) {
      this.waveManager.skipWaveDelay();
    } else {
      this.waveManager.startNextWave();
    }
  }

  /**
   * Обработчик улучшения башни
   */
  private handleUpgradeTower(tower: any): void {
    const cost = tower.getUpgradeCost();
    
    if (this.gameState.coins >= cost) {
      const upgraded = this.towerSystem.upgradeTower(tower);
      if (!upgraded) {
        showAlert('Tower is already at max level!');
      }
    } else {
      showAlert('Not enough coins!');
    }
  }

  /**
   * Обработчик продажи башни
   */
  private handleSellTower(tower: any): void {
    this.towerSystem.sellTower(tower);
  }

  private createBuildButtons(): void {
    const buttonY = 500;
    const buttonWidth = 120;
    const buttonHeight = 40;
    const spacing = 130;
    let x = 100;

    // Получаем доступные типы башен из профиля
    const profile = this.profileService.getProfile();
    const availableTypes = this.towerSystem.getAvailableTowerTypes()
      .filter(type => profile.unlockedTowers.includes(type as TowerType));

    availableTypes.forEach((type) => {
      const config = this.towerSystem.getTowerConfig(type);
      if (!config) return;

      const button = this.add.rectangle(x, buttonY, buttonWidth, buttonHeight, this.getTowerButtonColor(type))
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, this.selectedTowerType === type ? 0xffff00 : 0xffffff);

      const buttonText = this.add.text(x, buttonY, `${config.name}\n(${config.cost}g)`, {
        ...UI_STYLES.button,
        fontSize: '12px',
      }).setOrigin(0.5);

      button.on('pointerdown', () => {
        if (this.selectedTowerType === type) {
          this.selectedTowerType = null; // Отменяем выбор
        } else {
          this.selectedTowerType = type;
        }
        this.updateBuildButtonStyles();
      });

      button.on('pointerover', () => {
        button.setFillStyle(this.getTowerButtonColor(type, true));
      });

      button.on('pointerout', () => {
        button.setFillStyle(this.getTowerButtonColor(type));
      });

      x += spacing;
    });
  }

  private getTowerButtonColor(type: string, hover: boolean = false): number {
    const colors: Record<string, number> = {
      cannon: 0xff6d6d,
      ice: 0x6dc2ff,
      splash: 0xff9900,
      sniper: 0x00ff00,
      poison: 0x9900ff,
    };

    const baseColor = colors[type] || 0xffffff;
    return hover ? baseColor + 0x222222 : baseColor;
  }

  private updateBuildButtonStyles(): void {
    // Обновление стилей кнопок
  }

  /**
   * Настраивает режим строительства
   */
  private setupBuildMode(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y > 480) {
        return; // Клик по кнопкам строительства
      }

      if (this.selectedTowerType) {
        const config = this.towerSystem.getTowerConfig(this.selectedTowerType);
        if (!config) return;

        if (this.gameState.coins < config.cost) {
          showAlert('Not enough coins!');
          return;
        }

        const tower = this.towerSystem.buildTower(
          this.selectedTowerType,
          pointer.x,
          pointer.y
        );

        if (!tower) {
          showAlert('Cannot build here!');
        } else {
          this.selectedTowerType = null;
          this.updateBuildButtonStyles();
        }
      } else {
        const clickedTower = this.towerSystem.getTowerAt(pointer.x, pointer.y);
        if (clickedTower) {
          this.towerSystem.selectTower(clickedTower);
          this.towerUI.updateTowerInfo(clickedTower);
        } else {
          this.towerSystem.selectTower(null);
          this.towerUI.hide();
        }
      }
    });
  }

  private updateUI(): void {
    this.coinsText.setText(`Coins: ${this.gameState.coins}`);
    this.livesText.setText(`Lives: ${this.gameState.lives}`);
  }

  private gameOver(): void {
    this.gameState.isGameOver = true;
    
    // Обновляем статистику
    const profile = this.profileService.getProfile();
    profile.stats.gamesPlayed += 1;
    
    // Эффекты
    this.cameraEffects.shake(0.02, 500);
    this.cameraEffects.flash(0xff0000, 300);
    
    const gameOverText = this.add.text(400, 300, 'Game Over!', UI_STYLES.gameOver)
      .setOrigin(0.5);

    showAlert(`Game Over! Your score: ${this.gameState.score}`);
    
    // Сохраняем прогресс
    this.saveGameProgress();
  }

  update(time: number, delta: number): void {
    if (this.gameState.isGameOver) return;

    // Применяем скорость игры из настроек
    const gameSpeed = this.profileService.getSettings().gameSpeed;
    const adjustedDelta = delta * gameSpeed;

    // Обновляем менеджеры
    if (this.enemyManager) {
      this.enemyManager.update();
    }
    if (this.waveManager) {
      this.waveManager.update();
    }
    if (this.projectileSystem) {
      this.projectileSystem.update(adjustedDelta);
    }

    // Обновляем башни
    if (this.towerSystem) {
      const enemies = this.enemyManager.getEnemies();
      this.towerSystem.update(enemies);
    }

    // Обновляем UI башни если башня выбрана
    const selectedTower = this.towerSystem?.getSelectedTower();
    if (selectedTower && this.towerUI) {
      this.towerUI.updateTowerInfo(selectedTower);
    }

    // Проверяем достижения периодически
    if (Math.floor(time / 1000) % 5 === 0) {
      this.achievementSystem.checkAchievements(this.gameState);
    }
  }
}
