import type { DailyReward, SeasonalEvent, UnlockableContent } from '@/types/retentionTypes';
import { PlayerProfileService } from './PlayerProfileService';
import { AchievementSystem } from './AchievementSystem';

/**
 * Движок удержания - ежедневные награды, события, контент
 */
export class RetentionEngine {
  private profileService: PlayerProfileService;
  private achievementSystem: AchievementSystem;
  private dailyRewards: DailyReward[] = [];
  private currentEvent: SeasonalEvent | null = null;
  private unlockables: Map<string, UnlockableContent> = new Map();

  constructor(
    profileService: PlayerProfileService,
    achievementSystem: AchievementSystem
  ) {
    this.profileService = profileService;
    this.achievementSystem = achievementSystem;
    this.loadConfigs();
  }

  /**
   * Загружает конфиги
   */
  private async loadConfigs(): Promise<void> {
    try {
      // Загружаем ежедневные награды
      const response = await fetch('/data/retention-config.json');
      if (response.ok) {
        const config = await response.json();
        this.dailyRewards = config.dailyRewards || [];
        
        // Проверяем текущее событие
        this.checkCurrentEvent(config.eventRotation);
      }
    } catch (error) {
      console.error('Error loading retention config:', error);
    }
  }

  /**
   * Проверяет текущее событие
   */
  private checkCurrentEvent(events: any[]): void {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const dateStr = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    for (const event of events) {
      const [startMonth, startDay] = event.start.split('-').map(Number);
      const [endMonth, endDay] = event.end.split('-').map(Number);
      
      const startDate = new Date(now.getFullYear(), startMonth - 1, startDay);
      const endDate = new Date(now.getFullYear(), endMonth - 1, endDay);
      
      if (now >= startDate && now <= endDate) {
        this.currentEvent = {
          id: event.id,
          name: event.name,
          description: `Special ${event.name} event`,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          type: event.id as any,
          specialContent: {
            maps: [],
            skins: [],
            enemies: [],
          },
          rewards: [],
          challenges: [],
        };
        break;
      }
    }
  }

  /**
   * Проверяет ежедневную награду
   */
  checkDailyReward(): { canClaim: boolean; reward: DailyReward | null; day: number } {
    const profile = this.profileService.getProfile();
    const today = new Date().toISOString().split('T')[0];
    const lastClaim = profile.dailyRewards.lastClaimDate;

    // Первая награда
    if (!lastClaim) {
      return {
        canClaim: true,
        reward: this.dailyRewards[0] || null,
        day: 1,
      };
    }

    // Проверяем streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let currentDay = profile.dailyRewards.streak + 1;
    
    if (lastClaim === today) {
      // Уже получил сегодня
      return { canClaim: false, reward: null, day: currentDay };
    }

    if (lastClaim === yesterdayStr) {
      // Продолжаем streak
      currentDay = profile.dailyRewards.streak + 1;
    } else {
      // Сброс streak
      currentDay = 1;
    }

    const rewardIndex = (currentDay - 1) % this.dailyRewards.length;
    const reward = this.dailyRewards[rewardIndex];

    return {
      canClaim: true,
      reward,
      day: currentDay,
    };
  }

  /**
   * Выдает ежедневную награду
   */
  claimDailyReward(): DailyReward | null {
    const check = this.checkDailyReward();
    if (!check.canClaim || !check.reward) {
      return null;
    }

    const profile = this.profileService.getProfile();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Обновляем streak
    if (profile.dailyRewards.lastClaimDate === yesterdayStr) {
      profile.dailyRewards.streak += 1;
    } else if (profile.dailyRewards.lastClaimDate !== today) {
      profile.dailyRewards.streak = 1;
    }

    profile.dailyRewards.lastClaimDate = today;

    // Выдаем награды
    check.reward.rewards.forEach(reward => {
      this.processReward(reward);
    });

    // Бонус за streak
    if (check.reward.streakBonus) {
      this.profileService.addCoins(100); // Дополнительный бонус
    }

    this.profileService.saveProfile();

    return check.reward;
  }

  /**
   * Обрабатывает награду
   */
  private processReward(reward: any): void {
    switch (reward.type) {
      case 'coins':
        this.profileService.addCoins(reward.value);
        break;
      case 'stars':
        // В реальной системе начисляются Stars
        console.log(`Earned ${reward.value} Stars`);
        break;
      case 'skin':
        this.unlockContent('skin', reward.value);
        break;
      case 'boost':
        // Выдаем буст
        break;
    }
  }

  /**
   * Получает текущее событие
   */
  getCurrentEvent(): SeasonalEvent | null {
    return this.currentEvent;
  }

  /**
   * Разблокирует контент
   */
  unlockContent(type: string, contentId: string): void {
    const unlockable: UnlockableContent = {
      id: contentId,
      type: type as any,
      unlockCondition: {
        type: 'achievement',
        value: contentId,
      },
      locked: false,
      unlockedAt: Date.now(),
    };

    this.unlockables.set(contentId, unlockable);
    this.saveUnlockables();
  }

  /**
   * Проверяет разблокировку контента
   */
  checkUnlockables(gameStats: any): void {
    this.unlockables.forEach((unlockable, id) => {
      if (!unlockable.locked) return;

      let shouldUnlock = false;

      switch (unlockable.unlockCondition.type) {
        case 'level':
          shouldUnlock = gameStats.level >= (unlockable.unlockCondition.value as number);
          break;
        case 'score':
          shouldUnlock = gameStats.score >= (unlockable.unlockCondition.value as number);
          break;
        case 'achievement':
          const achievement = this.achievementSystem.getAchievementConfig(
            unlockable.unlockCondition.value as string
          );
          shouldUnlock = achievement ? this.isAchievementUnlocked(achievement.id) : false;
          break;
      }

      if (shouldUnlock) {
        unlockable.locked = false;
        unlockable.unlockedAt = Date.now();
      }
    });

    this.saveUnlockables();
  }

  /**
   * Проверяет разблокировку достижения
   */
  private isAchievementUnlocked(achievementId: string): boolean {
    const progress = this.achievementSystem.getProgress();
    const achievement = progress.find(a => a.id === achievementId);
    return achievement?.unlocked || false;
  }

  /**
   * Сохраняет разблокировки
   */
  private saveUnlockables(): void {
    const unlockablesList = Array.from(this.unlockables.values());
    localStorage.setItem('td_unlockables', JSON.stringify(unlockablesList));
  }
}

