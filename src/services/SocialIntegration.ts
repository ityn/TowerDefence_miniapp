import type { Friend, ClanData, ClanMember, LeaderboardEntry, DailyChallenge } from '@/types/socialTypes';
import { TelegramIntegrationService } from './TelegramIntegrationService';
import { PlayerProfileService } from './PlayerProfileService';

/**
 * Социальная интеграция - друзья, кланы, лидерборды
 */
export class SocialIntegration {
  private telegramService: TelegramIntegrationService;
  private profileService: PlayerProfileService;
  private friends: Map<string, Friend> = new Map();
  private currentClan: ClanData | null = null;

  constructor(
    telegramService: TelegramIntegrationService,
    profileService: PlayerProfileService
  ) {
    this.telegramService = telegramService;
    this.profileService = profileService;
    this.loadFriends();
  }

  /**
   * Загружает список друзей
   */
  private async loadFriends(): Promise<void> {
    // В реальной системе загружается с сервера
    // Пока используем заглушку
    const stored = localStorage.getItem('td_friends');
    if (stored) {
      const friendsList = JSON.parse(stored) as Friend[];
      friendsList.forEach(friend => {
        this.friends.set(friend.id, friend);
      });
    }
  }

  /**
   * Добавляет друга
   */
  async addFriend(friendId: string, friendName: string): Promise<boolean> {
    if (this.friends.has(friendId)) {
      return false; // Уже в друзьях
    }

    const friend: Friend = {
      id: friendId,
      name: friendName,
      lastActive: Date.now(),
      bestScore: 0,
      currentWave: 0,
      canHelp: true,
    };

    this.friends.set(friendId, friend);
    await this.saveFriends();
    
    return true;
  }

  /**
   * Получает список друзей
   */
  getFriends(): Friend[] {
    return Array.from(this.friends.values());
  }

  /**
   * Получает лидерборд друзей
   */
  getFriendLeaderboard(limit: number = 10): LeaderboardEntry[] {
    const friends = Array.from(this.friends.values())
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, limit);

    const currentUser = this.profileService.getProfile();
    
    // Добавляем текущего пользователя
    const leaderboard: LeaderboardEntry[] = [
      {
        userId: currentUser.userId,
        userName: 'Вы',
        score: currentUser.stats.highestScore,
        rank: 0,
      },
      ...friends.map((friend, index) => ({
        userId: friend.id,
        userName: friend.name,
        score: friend.bestScore,
        rank: index + 1,
      })),
    ];

    // Сортируем по очкам
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboard;
  }

  /**
   * Создает клан
   */
  async createClan(name: string, description: string): Promise<ClanData | null> {
    const userId = this.profileService.getProfile().userId;
    
    if (this.currentClan) {
      return null; // Уже в клане
    }

    const clan: ClanData = {
      id: `clan_${Date.now()}`,
      name,
      description,
      members: [userId],
      leaderId: userId,
      level: 1,
      totalScore: 0,
      currentChallenge: null,
      createdAt: Date.now(),
    };

    this.currentClan = clan;
    await this.saveClan();
    
    return clan;
  }

  /**
   * Присоединяется к клану
   */
  async joinClan(clanId: string): Promise<boolean> {
    const userId = this.profileService.getProfile().userId;
    
    if (this.currentClan) {
      return false; // Уже в клане
    }

    // В реальной системе загружается с сервера
    // Пока используем заглушку
    const clan: ClanData = {
      id: clanId,
      name: 'Test Clan',
      description: 'Test',
      members: [userId],
      leaderId: 'leader_id',
      level: 1,
      totalScore: 0,
      currentChallenge: null,
      createdAt: Date.now(),
    };

    this.currentClan = clan;
    await this.saveClan();
    
    return true;
  }

  /**
   * Получает текущий клан
   */
  getCurrentClan(): ClanData | null {
    return this.currentClan;
  }

  /**
   * Получает глобальный лидерборд
   */
  async getGlobalLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    // В реальной системе загружается с сервера
    // Пока возвращаем заглушку
    return [
      {
        userId: 'user1',
        userName: 'Top Player',
        score: 100000,
        rank: 1,
      },
    ];
  }

  /**
   * Получает ежедневный челлендж
   */
  async getDailyChallenge(): Promise<DailyChallenge | null> {
    // В реальной системе загружается с сервера
    const today = new Date().toISOString().split('T')[0];
    
    return {
      id: `challenge_${today}`,
      date: today,
      mapId: 'forest',
      specialRules: ['no_lives_lost', 'fast_completion'],
      leaderboard: [],
      rewards: {
        top1: 1000,
        top10: 500,
        top100: 100,
        participation: 50,
      },
      startedAt: Date.now(),
      endsAt: Date.now() + (24 * 60 * 60 * 1000),
    };
  }

  /**
   * Сохраняет друзей
   */
  private async saveFriends(): Promise<void> {
    const friendsList = Array.from(this.friends.values());
    localStorage.setItem('td_friends', JSON.stringify(friendsList));
  }

  /**
   * Сохраняет клан
   */
  private async saveClan(): Promise<void> {
    if (this.currentClan) {
      localStorage.setItem('td_clan', JSON.stringify(this.currentClan));
    }
  }
}

