import type { TowerType } from './gameTypes';

/**
 * Прогресс достижения
 */
export interface AchievementProgress {
  id: string;
  unlocked: boolean;
  unlockedAt?: number; // Timestamp
  progress?: number; // Текущий прогресс для прогрессивных достижений
}

/**
 * Состояние ежедневных наград
 */
export interface DailyRewardState {
  lastClaimDate: string; // ISO date string
  streak: number; // Дни подряд
  nextClaimTime?: number; // Timestamp
}

/**
 * Профиль игрока
 */
export interface PlayerProfile {
  userId: string;
  coins: number;
  totalScore: number;
  unlockedMaps: string[];
  unlockedTowers: TowerType[];
  towerLevels: Record<string, number>; // Максимальные уровни башен
  achievements: AchievementProgress[];
  dailyRewards: DailyRewardState;
  settings: PlayerSettings;
  stats: PlayerStats;
}

/**
 * Настройки игрока
 */
export interface PlayerSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number; // 0-1
  musicVolume: number; // 0-1
  gameSpeed: number; // 1.0, 1.5, 2.0
  showTutorial: boolean;
}

/**
 * Статистика игрока
 */
export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  totalEnemiesKilled: number;
  totalCoinsEarned: number;
  highestScore: number;
  longestWave: number;
  favoriteTower: string;
}

/**
 * Тип вирусного шаринга
 */
export enum ShareType {
  HELP_REQUEST = 'help_request',
  HIGH_SCORE = 'high_score',
  REFERRAL = 'referral',
}

