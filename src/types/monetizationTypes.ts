/**
 * Типы монетизации
 */

/**
 * Telegram Stars продукт
 */
export interface StarsProduct {
  id: string;
  name: string;
  description: string;
  starsPrice: number;
  type: 'coins' | 'skin' | 'boost' | 'battlepass' | 'remove_ads';
  value: any; // Зависит от типа
  icon?: string;
  limitedTime?: boolean;
  expiresAt?: number;
}

/**
 * Скин башни
 */
export interface TowerSkin {
  id: string;
  name: string;
  description: string;
  texture: string;
  starsPrice?: number; // undefined = бесплатный
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockCondition?: string;
  season?: string;
}

/**
 * Буст для игры
 */
export interface GameBoost {
  id: string;
  name: string;
  type: 'coins_multiplier' | 'damage_boost' | 'speed_boost' | 'lives_bonus';
  value: number; // Множитель или абсолютное значение
  duration?: number; // Секунды, если временный
  starsPrice?: number;
}

/**
 * Боевой пропуск
 */
export interface BattlePass {
  id: string;
  season: string;
  startDate: string;
  endDate: string;
  levels: BattlePassLevel[];
  currentLevel: number;
  currentXP: number;
  premiumUnlocked: boolean;
}

export interface BattlePassLevel {
  level: number;
  requiredXP: number;
  freeRewards: Reward[];
  premiumRewards: Reward[];
}

export interface Reward {
  type: 'coins' | 'skin' | 'boost' | 'stars';
  value: number | string;
  amount?: number;
}

/**
 * Прогресс боевого пропуска
 */
export interface BattlePassProgress {
  passId: string;
  currentLevel: number;
  currentXP: number;
  claimedLevels: number[];
  premiumUnlocked: boolean;
}

/**
 * Покупка в игре
 */
export interface Purchase {
  id: string;
  userId: string;
  productId: string;
  starsSpent: number;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

