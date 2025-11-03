import type { Reward } from '@/types/monetizationTypes';

/**
 * Типы систем удержания
 */

/**
 * Ежедневная награда
 */
export interface DailyReward {
  day: number;
  rewards: {
    type: 'coins' | 'stars' | 'skin' | 'boost';
    value: number | string;
  }[];
  streakBonus: boolean;
}

/**
 * Сезонное событие
 */
export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  type: 'halloween' | 'christmas' | 'summer' | 'anniversary';
  specialContent: {
    maps: string[];
    skins: string[];
    enemies: string[];
  };
  rewards: Reward[];
  challenges: EventChallenge[];
}

/**
 * Челлендж события
 */
export interface EventChallenge {
  id: string;
  name: string;
  description: string;
  condition: {
    type: string;
    target: number;
  };
  reward: Reward;
  progress: number;
  completed: boolean;
}

/**
 * Разблокируемый контент
 */
export interface UnlockableContent {
  id: string;
  type: 'map' | 'tower' | 'skin' | 'enemy';
  unlockCondition: {
    type: 'level' | 'score' | 'achievement' | 'purchase';
    value: number | string;
  };
  locked: boolean;
  unlockedAt?: number;
}

