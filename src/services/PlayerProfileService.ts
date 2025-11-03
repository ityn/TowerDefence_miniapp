import type { PlayerProfile, PlayerSettings, PlayerStats, DailyRewardState } from '@/types/profileTypes';
import { TowerType } from '@/types/gameTypes';

/**
 * Сервис для управления профилем игрока
 */
export class PlayerProfileService {
  private profile: PlayerProfile | null = null;
  private defaultProfile: PlayerProfile;

  constructor(userId: string) {
    this.defaultProfile = this.createDefaultProfile(userId);
  }

  /**
   * Создает профиль по умолчанию
   */
  private createDefaultProfile(userId: string): PlayerProfile {
    return {
      userId,
      coins: 200, // Стартовые монеты
      totalScore: 0,
      unlockedMaps: ['forest'], // Первая карта разблокирована
      unlockedTowers: [TowerType.CANNON, TowerType.ICE], // Базовые башни
      towerLevels: {},
      achievements: [],
      dailyRewards: {
        lastClaimDate: '',
        streak: 0,
      },
      settings: {
        soundEnabled: true,
        musicEnabled: true,
        soundVolume: 0.7,
        musicVolume: 0.5,
        gameSpeed: 1.0,
        showTutorial: true,
      },
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalEnemiesKilled: 0,
        totalCoinsEarned: 0,
        highestScore: 0,
        longestWave: 0,
        favoriteTower: '',
      },
    };
  }

  /**
   * Инициализирует профиль (загружает или создает новый)
   */
  async initialize(): Promise<PlayerProfile> {
    const loaded = await this.loadProfile();
    this.profile = loaded || { ...this.defaultProfile };
    return this.profile;
  }

  /**
   * Загружает профиль из хранилища
   */
  private async loadProfile(): Promise<PlayerProfile | null> {
    try {
      // Пытаемся загрузить из LocalStorage
      const stored = localStorage.getItem('td_player_profile');
      if (stored) {
        const profile = JSON.parse(stored) as PlayerProfile;
        // Валидация и миграция данных
        return this.validateProfile(profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
    return null;
  }

  /**
   * Валидирует и мигрирует профиль
   */
  private validateProfile(profile: any): PlayerProfile {
    // Добавляем недостающие поля
    const validated: PlayerProfile = {
      ...this.defaultProfile,
      ...profile,
      settings: {
        ...this.defaultProfile.settings,
        ...(profile.settings || {}),
      },
      stats: {
        ...this.defaultProfile.stats,
        ...(profile.stats || {}),
      },
      dailyRewards: {
        ...this.defaultProfile.dailyRewards,
        ...(profile.dailyRewards || {}),
      },
    };
    return validated;
  }

  /**
   * Сохраняет профиль
   */
  async saveProfile(): Promise<boolean> {
    if (!this.profile) return false;

    try {
      localStorage.setItem('td_player_profile', JSON.stringify(this.profile));
      return true;
    } catch (error) {
      console.error('Error saving profile:', error);
      return false;
    }
  }

  /**
   * Получает текущий профиль
   */
  getProfile(): PlayerProfile {
    if (!this.profile) {
      this.profile = { ...this.defaultProfile };
    }
    return this.profile;
  }

  /**
   * Добавляет монеты
   */
  addCoins(amount: number): void {
    if (!this.profile) return;
    this.profile.coins += amount;
    this.profile.stats.totalCoinsEarned += amount;
    this.saveProfile();
  }

  /**
   * Тратит монеты
   */
  spendCoins(amount: number): boolean {
    if (!this.profile) return false;
    if (this.profile.coins < amount) return false;
    
    this.profile.coins -= amount;
    this.saveProfile();
    return true;
  }

  /**
   * Обновляет счет
   */
  updateScore(score: number): void {
    if (!this.profile) return;
    this.profile.totalScore += score;
    if (score > this.profile.stats.highestScore) {
      this.profile.stats.highestScore = score;
    }
    this.saveProfile();
  }

  /**
   * Разблокирует карту
   */
  unlockMap(mapId: string): void {
    if (!this.profile) return;
    if (!this.profile.unlockedMaps.includes(mapId)) {
      this.profile.unlockedMaps.push(mapId);
      this.saveProfile();
    }
  }

  /**
   * Разблокирует башню
   */
  unlockTower(towerType: TowerType): void {
    if (!this.profile) return;
    if (!this.profile.unlockedTowers.includes(towerType)) {
      this.profile.unlockedTowers.push(towerType);
      this.saveProfile();
    }
  }

  /**
   * Обновляет максимальный уровень башни
   */
  updateTowerLevel(towerType: string, level: number): void {
    if (!this.profile) return;
    if (!this.profile.towerLevels[towerType] || this.profile.towerLevels[towerType] < level) {
      this.profile.towerLevels[towerType] = level;
      this.saveProfile();
    }
  }

  /**
   * Обновляет статистику игры
   */
  updateGameStats(stats: Partial<PlayerStats>): void {
    if (!this.profile) return;
    this.profile.stats = { ...this.profile.stats, ...stats };
    this.saveProfile();
  }

  /**
   * Проверяет ежедневную награду
   */
  checkDailyReward(): { canClaim: boolean; reward: number; streak: number } {
    if (!this.profile) {
      return { canClaim: false, reward: 0, streak: 0 };
    }

    const today = new Date().toISOString().split('T')[0];
    const lastClaim = this.profile.dailyRewards.lastClaimDate;
    
    // Первая награда или новый день
    if (!lastClaim || lastClaim !== today) {
      return {
        canClaim: true,
        reward: this.calculateDailyReward(),
        streak: this.profile.dailyRewards.streak,
      };
    }

    return { canClaim: false, reward: 0, streak: this.profile.dailyRewards.streak };
  }

  /**
   * Выдает ежедневную награду
   */
  claimDailyReward(): number {
    if (!this.profile) return 0;

    const check = this.checkDailyReward();
    if (!check.canClaim) return 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Проверяем streak
    if (this.profile.dailyRewards.lastClaimDate === yesterdayStr) {
      this.profile.dailyRewards.streak += 1;
    } else if (this.profile.dailyRewards.lastClaimDate !== today) {
      this.profile.dailyRewards.streak = 1;
    }

    this.profile.dailyRewards.lastClaimDate = today;
    this.addCoins(check.reward);

    return check.reward;
  }

  /**
   * Вычисляет размер ежедневной награды
   */
  private calculateDailyReward(): number {
    if (!this.profile) return 25;
    // Базовая награда + бонус за streak
    const baseReward = 25;
    const streakBonus = Math.min(this.profile.dailyRewards.streak * 5, 50);
    return baseReward + streakBonus;
  }

  /**
   * Обновляет настройки
   */
  updateSettings(settings: Partial<PlayerSettings>): void {
    if (!this.profile) return;
    this.profile.settings = { ...this.profile.settings, ...settings };
    this.saveProfile();
  }

  /**
   * Получает настройки
   */
  getSettings(): PlayerSettings {
    return this.profile?.settings || this.defaultProfile.settings;
  }
}

