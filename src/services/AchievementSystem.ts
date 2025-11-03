import type { AchievementConfig } from '@/types/achievementTypes';
import type { AchievementProgress } from '@/types/profileTypes';
import { AchievementConditionType, AchievementEvents } from '@/types/achievementTypes';
import type { GameState } from '@/types/gameTypes';
import { PlayerProfileService } from './PlayerProfileService';
import { TelegramIntegrationService } from './TelegramIntegrationService';

/**
 * Система достижений
 */
export class AchievementSystem {
  private achievements: Map<string, AchievementConfig> = new Map();
  private progress: Map<string, AchievementProgress> = new Map();
  private profileService: PlayerProfileService;
  private telegramService: TelegramIntegrationService;
  private eventEmitter: Phaser.Events.EventEmitter;

  // Временные счетчики для отслеживания прогресса
  private gameStats: {
    enemiesKilled: number;
    towersBuilt: number;
    towersUpgraded: number;
    mapsCompleted: number;
    wavesCompleted: number;
    coinsEarned: number;
    currentScore: number;
    livesLost: boolean;
  } = {
    enemiesKilled: 0,
    towersBuilt: 0,
    towersUpgraded: 0,
    mapsCompleted: 0,
    wavesCompleted: 0,
    coinsEarned: 0,
    currentScore: 0,
    livesLost: false,
  };

  constructor(
    profileService: PlayerProfileService,
    telegramService: TelegramIntegrationService,
    eventEmitter: Phaser.Events.EventEmitter
  ) {
    this.profileService = profileService;
    this.telegramService = telegramService;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Загружает конфигурацию достижений
   */
  async loadAchievements(): Promise<void> {
    try {
      const response = await fetch('/data/achievements-config.json');
      if (!response.ok) {
        throw new Error('Failed to load achievements config');
      }

      const configs: Record<string, AchievementConfig> = await response.json();
      
      Object.entries(configs).forEach(([id, config]) => {
        this.achievements.set(id, config);
      });

      // Загружаем прогресс из профиля
      this.loadProgress();

      console.log(`Loaded ${this.achievements.size} achievements`);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  }

  /**
   * Загружает прогресс достижений из профиля
   */
  private loadProgress(): void {
    const profile = this.profileService.getProfile();
    profile.achievements.forEach(achievement => {
      this.progress.set(achievement.id, { ...achievement });
    });
  }

  /**
   * Проверяет достижения на основе текущего состояния игры
   */
  checkAchievements(gameState: GameState): void {
    this.gameStats.currentScore = gameState.score;
    
    // Проверяем каждое достижение
    this.achievements.forEach((config, id) => {
      const progress = this.progress.get(id);
      
      // Пропускаем уже разблокированные
      if (progress?.unlocked) return;

      if (this.checkCondition(config.condition)) {
        this.unlockAchievement(id);
      } else {
        // Обновляем прогресс для прогрессивных достижений
        this.updateProgress(id, config);
      }
    });
  }

  /**
   * Проверяет условие достижения
   */
  private checkCondition(condition: AchievementConfig['condition']): boolean {
    switch (condition.type) {
      case AchievementConditionType.KILL_ENEMIES:
        return this.gameStats.enemiesKilled >= condition.value;

      case AchievementConditionType.BUILD_TOWER:
        return this.gameStats.towersBuilt >= condition.value;

      case AchievementConditionType.UPGRADE_TOWER_TO_LEVEL:
        return this.gameStats.towersUpgraded >= condition.value;

      case AchievementConditionType.COMPLETE_WAVE:
        return this.gameStats.wavesCompleted >= condition.value;

      case AchievementConditionType.EARN_COINS:
        return this.gameStats.coinsEarned >= condition.value;

      case AchievementConditionType.SCORE_REACHED:
        return this.gameStats.currentScore >= condition.value;

      case AchievementConditionType.COMPLETE_MAP_NO_LIVES_LOST:
        return this.gameStats.mapsCompleted >= condition.value && !this.gameStats.livesLost;

      default:
        return false;
    }
  }

  /**
   * Обновляет прогресс достижения
   */
  private updateProgress(id: string, config: AchievementConfig): void {
    const condition = config.condition;
    let currentProgress = 0;

    switch (condition.type) {
      case AchievementConditionType.KILL_ENEMIES:
        currentProgress = this.gameStats.enemiesKilled;
        break;
      case AchievementConditionType.BUILD_TOWER:
        currentProgress = this.gameStats.towersBuilt;
        break;
      case AchievementConditionType.EARN_COINS:
        currentProgress = this.gameStats.coinsEarned;
        break;
      case AchievementConditionType.SCORE_REACHED:
        currentProgress = this.gameStats.currentScore;
        break;
    }

    const progress = this.progress.get(id) || {
      id,
      unlocked: false,
      progress: 0,
    };

    progress.progress = Math.min(currentProgress, condition.value);
    this.progress.set(id, progress);

    this.eventEmitter.emit(AchievementEvents.PROGRESS_UPDATED, {
      achievementId: id,
      progress: progress.progress,
      maxProgress: condition.value,
    });
  }

  /**
   * Разблокирует достижение
   */
  unlockAchievement(achievementId: string): void {
    const config = this.achievements.get(achievementId);
    if (!config) return;

    const progress = this.progress.get(achievementId);
    if (progress?.unlocked) return; // Уже разблокировано

    const newProgress: AchievementProgress = {
      id: achievementId,
      unlocked: true,
      unlockedAt: Date.now(),
      progress: config.condition.value,
    };

    this.progress.set(achievementId, newProgress);

    // Обновляем профиль
    const profile = this.profileService.getProfile();
    const achievementIndex = profile.achievements.findIndex(a => a.id === achievementId);
    if (achievementIndex >= 0) {
      profile.achievements[achievementIndex] = newProgress;
    } else {
      profile.achievements.push(newProgress);
    }

    // Начисляем награду
    this.profileService.addCoins(config.reward);

    // Эмитим событие
    this.eventEmitter.emit(AchievementEvents.ACHIEVEMENT_UNLOCKED, {
      achievement: config,
      reward: config.reward,
    });

    // Показываем уведомление
    this.telegramService.showAlert(
      `🏆 Достижение разблокировано!\n${config.name}\n+${config.reward} монет`
    );

    console.log(`Achievement unlocked: ${config.name}`);
  }

  /**
   * Регистрирует событие игры для отслеживания статистики
   */
  trackEvent(event: string, data?: any): void {
    switch (event) {
      case 'enemy_killed':
        this.gameStats.enemiesKilled++;
        break;
      case 'tower_built':
        this.gameStats.towersBuilt++;
        break;
      case 'tower_upgraded':
        this.gameStats.towersUpgraded++;
        break;
      case 'wave_completed':
        this.gameStats.wavesCompleted++;
        break;
      case 'coins_earned':
        this.gameStats.coinsEarned += data?.amount || 0;
        break;
      case 'map_completed':
        this.gameStats.mapsCompleted++;
        this.gameStats.livesLost = data?.livesLost || false;
        break;
    }
  }

  /**
   * Сбрасывает временную статистику игры
   */
  resetGameStats(): void {
    this.gameStats = {
      enemiesKilled: 0,
      towersBuilt: 0,
      towersUpgraded: 0,
      mapsCompleted: 0,
      wavesCompleted: 0,
      coinsEarned: 0,
      currentScore: 0,
      livesLost: false,
    };
  }

  /**
   * Получает прогресс всех достижений
   */
  getProgress(): AchievementProgress[] {
    return Array.from(this.progress.values());
  }

  /**
   * Получает конфигурацию достижения
   */
  getAchievementConfig(id: string): AchievementConfig | undefined {
    return this.achievements.get(id);
  }
}

