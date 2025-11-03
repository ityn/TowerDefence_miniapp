/**
 * Типы аналитики
 */

/**
 * Игровая аналитика
 */
export interface GameAnalytics {
  userId: string;
  sessionCount: number;
  totalPlayTime: number; // секунды
  favoriteTower: string;
  averageWaveReached: number;
  moneySpent: number; // Stars
  friendsInvited: number;
  helpRequestsSent: number;
  helpRequestsReceived: number;
  sharesCount: number;
  retentionDays: number;
  lastActive: number;
  dailyActiveStreak: number;
}

/**
 * Событие аналитики
 */
export interface AnalyticsEvent {
  type: string;
  userId: string;
  timestamp: number;
  data: Record<string, any>;
  sessionId: string;
}

/**
 * Метрики вирусного роста
 */
export interface ViralMetrics {
  kFactor: number; // Среднее количество приглашенных на пользователя
  viralityRate: number; // Процент пользователей, которые пригласили друзей
  averageShares: number;
  referralConversion: number;
}

/**
 * Метрики монетизации
 */
export interface MonetizationMetrics {
  arpu: number; // Average Revenue Per User
  conversionRate: number; // Процент платящих пользователей
  averagePurchase: number;
  popularProducts: string[];
}

