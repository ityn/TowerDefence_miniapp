/**
 * Типы социальных функций
 */

/**
 * Друг в списке друзей
 */
export interface Friend {
  id: string;
  name: string;
  avatar?: string;
  lastActive: number;
  bestScore: number;
  currentWave: number;
  canHelp: boolean;
  helpCooldown?: number;
}

/**
 * Данные клана
 */
export interface ClanData {
  id: string;
  name: string;
  description: string;
  members: string[]; // User IDs
  leaderId: string;
  level: number;
  totalScore: number;
  currentChallenge: string | null;
  createdAt: number;
  icon?: string;
}

/**
 * Участник клана
 */
export interface ClanMember {
  userId: string;
  userName: string;
  role: 'leader' | 'member';
  contribution: number;
  joinedAt: number;
}

/**
 * Запись в лидерборде
 */
export interface LeaderboardEntry {
  userId: string;
  userName: string;
  score: number;
  rank: number;
  avatar?: string;
}

/**
 * Ежедневный челлендж
 */
export interface DailyChallenge {
  id: string;
  date: string; // ISO date
  mapId: string;
  specialRules: string[];
  leaderboard: LeaderboardEntry[];
  rewards: {
    top1: number;
    top10: number;
    top100: number;
    participation: number;
  };
  startedAt: number;
  endsAt: number;
}

/**
 * Статистика сезона
 */
export interface SeasonalStats {
  seasonId: string;
  startDate: string;
  endDate: string;
  playerScore: number;
  playerRank: number;
  totalPlayers: number;
  rewardsEarned: string[];
}

