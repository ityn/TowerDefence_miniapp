import type { GameAnalytics, AnalyticsEvent, ViralMetrics, MonetizationMetrics } from '@/types/analyticsTypes';
import { PlayerProfileService } from './PlayerProfileService';

/**
 * Дашборд аналитики - отслеживание метрик успеха
 */
export class AnalyticsDashboard {
  private profileService: PlayerProfileService;
  private events: AnalyticsEvent[] = [];
  private sessionId: string;

  constructor(profileService: PlayerProfileService) {
    this.profileService = profileService;
    this.sessionId = `session_${Date.now()}`;
    this.loadEvents();
  }

  /**
   * Загружает события
   */
  private loadEvents(): void {
    const stored = localStorage.getItem('td_analytics_events');
    if (stored) {
      this.events = JSON.parse(stored);
    }
  }

  /**
   * Записывает событие
   */
  trackEvent(type: string, data: Record<string, any>): void {
    const profile = this.profileService.getProfile();
    
    const event: AnalyticsEvent = {
      type,
      userId: profile.userId,
      timestamp: Date.now(),
      data,
      sessionId: this.sessionId,
    };

    this.events.push(event);
    this.saveEvents();

    // В реальной системе отправляется на сервер
    this.sendToServer(event);
  }

  /**
   * Отправляет событие на сервер
   */
  private sendToServer(event: AnalyticsEvent): void {
    // В реальной системе:
    // fetch('/api/analytics', { method: 'POST', body: JSON.stringify(event) });
    console.log('Analytics event:', event);
  }

  /**
   * Получает игровую аналитику
   */
  getGameAnalytics(): GameAnalytics {
    const profile = this.profileService.getProfile();
    
    const sessionEvents = this.events.filter(e => e.sessionId === this.sessionId);
    const allSessions = this.getSessions();
    
    // Вычисляем метрики
    const playTime = this.calculateTotalPlayTime();
    const favoriteTower = this.getFavoriteTower();
    const averageWave = this.calculateAverageWave();
    const moneySpent = this.calculateMoneySpent();
    const friendsInvited = this.countEvents('friend_invited');
    const helpSent = this.countEvents('help_sent');
    const helpReceived = this.countEvents('help_received');
    const shares = this.countEvents('share_result');

    return {
      userId: profile.userId,
      sessionCount: allSessions.length,
      totalPlayTime: playTime,
      favoriteTower,
      averageWaveReached: averageWave,
      moneySpent,
      friendsInvited,
      helpRequestsSent: helpSent,
      helpRequestsReceived: helpReceived,
      sharesCount: shares,
      retentionDays: this.calculateRetentionDays(),
      lastActive: Date.now(),
      dailyActiveStreak: profile.dailyRewards.streak,
    };
  }

  /**
   * Получает метрики вирусного роста
   */
  getViralMetrics(): ViralMetrics {
    const totalUsers = this.events.length; // Упрощенно
    const invitedEvents = this.countEvents('friend_invited');
    const sharedEvents = this.countEvents('share_result');
    const referralEvents = this.countEvents('referral_used');

    return {
      kFactor: totalUsers > 0 ? invitedEvents / totalUsers : 0,
      viralityRate: totalUsers > 0 ? (invitedEvents / totalUsers) * 100 : 0,
      averageShares: totalUsers > 0 ? sharedEvents / totalUsers : 0,
      referralConversion: totalUsers > 0 ? (referralEvents / totalUsers) * 100 : 0,
    };
  }

  /**
   * Получает метрики монетизации
   */
  getMonetizationMetrics(): MonetizationMetrics {
    const purchaseEvents = this.events.filter(e => e.type === 'purchase');
    const totalRevenue = purchaseEvents.reduce((sum, e) => sum + (e.data.starsSpent || 0), 0);
    const totalUsers = this.getUniqueUsers().length;
    const payingUsers = new Set(purchaseEvents.map(e => e.userId)).size;

    return {
      arpu: totalUsers > 0 ? totalRevenue / totalUsers : 0,
      conversionRate: totalUsers > 0 ? (payingUsers / totalUsers) * 100 : 0,
      averagePurchase: purchaseEvents.length > 0 
        ? totalRevenue / purchaseEvents.length 
        : 0,
      popularProducts: this.getPopularProducts(),
    };
  }

  /**
   * Вычисляет общее время игры
   */
  private calculateTotalPlayTime(): number {
    const sessionEvents = this.events.filter(e => 
      e.type === 'session_start' || e.type === 'session_end'
    );
    
    let totalTime = 0;
    let sessionStart: number | null = null;

    for (const event of sessionEvents) {
      if (event.type === 'session_start') {
        sessionStart = event.timestamp;
      } else if (event.type === 'session_end' && sessionStart) {
        totalTime += (event.timestamp - sessionStart) / 1000;
        sessionStart = null;
      }
    }

    return totalTime;
  }

  /**
   * Получает любимую башню
   */
  private getFavoriteTower(): string {
    const towerEvents = this.events.filter(e => e.type === 'tower_built');
    const towerCounts = new Map<string, number>();

    towerEvents.forEach(e => {
      const towerType = e.data.type;
      towerCounts.set(towerType, (towerCounts.get(towerType) || 0) + 1);
    });

    let favorite = 'cannon';
    let maxCount = 0;

    towerCounts.forEach((count, type) => {
      if (count > maxCount) {
        maxCount = count;
        favorite = type;
      }
    });

    return favorite;
  }

  /**
   * Вычисляет среднюю волну
   */
  private calculateAverageWave(): number {
    const waveEvents = this.events.filter(e => e.type === 'wave_completed');
    if (waveEvents.length === 0) return 0;

    const totalWaves = waveEvents.reduce((sum, e) => sum + (e.data.waveNumber || 0), 0);
    return totalWaves / waveEvents.length;
  }

  /**
   * Вычисляет потраченные деньги
   */
  private calculateMoneySpent(): number {
    const purchaseEvents = this.events.filter(e => e.type === 'purchase');
    return purchaseEvents.reduce((sum, e) => sum + (e.data.starsSpent || 0), 0);
  }

  /**
   * Считает события по типу
   */
  private countEvents(type: string): number {
    return this.events.filter(e => e.type === type).length;
  }

  /**
   * Получает сессии
   */
  private getSessions(): string[] {
    const sessions = new Set(this.events.map(e => e.sessionId));
    return Array.from(sessions);
  }

  /**
   * Получает уникальных пользователей
   */
  private getUniqueUsers(): string[] {
    const users = new Set(this.events.map(e => e.userId));
    return Array.from(users);
  }

  /**
   * Вычисляет дни удержания
   */
  private calculateRetentionDays(): number {
    const userEvents = this.events.filter(e => 
      e.userId === this.profileService.getProfile().userId
    );
    
    if (userEvents.length === 0) return 0;

    const firstEvent = userEvents[0];
    const lastEvent = userEvents[userEvents.length - 1];
    
    return Math.floor((lastEvent.timestamp - firstEvent.timestamp) / (24 * 60 * 60 * 1000));
  }

  /**
   * Получает популярные продукты
   */
  private getPopularProducts(): string[] {
    const purchaseEvents = this.events.filter(e => e.type === 'purchase');
    const productCounts = new Map<string, number>();

    purchaseEvents.forEach(e => {
      const productId = e.data.productId;
      if (productId) {
        productCounts.set(productId, (productCounts.get(productId) || 0) + 1);
      }
    });

    return Array.from(productCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId]) => productId);
  }

  /**
   * Сохраняет события
   */
  private saveEvents(): void {
    // Ограничиваем размер для производительности
    const recentEvents = this.events.slice(-1000);
    localStorage.setItem('td_analytics_events', JSON.stringify(recentEvents));
  }
}

