/**
 * Типы вирусных механик
 */

/**
 * Тип помощи другу
 */
export enum HelpType {
  FREEZE = 'freeze',      // Заморозка врагов
  DAMAGE = 'damage',      // Взрыв урона
  COINS = 'coins',        // Подарок монет
  SHIELD = 'shield',      // Защита жизней
}

/**
 * Помощь от друга
 */
export interface FriendHelp {
  friendId: string;
  friendName: string;
  helpType: HelpType;
  used: boolean;
  expiresAt: number; // Timestamp
  value?: number;    // Значение помощи (для coins/damage)
}

/**
 * Запрос помощи друзьям
 */
export interface HelpRequest {
  requestId: string;
  requesterId: string;
  requesterName: string;
  helpType: HelpType;
  message: string;
  createdAt: number;
  expiresAt: number;
  fulfilledBy?: string[];
}

/**
 * Реферальные данные
 */
export interface ReferralData {
  referrerId: string;
  refereeId: string;
  bonusCoins: number;
  createdAt: number;
  claimed: boolean;
}

/**
 * Виральная активность
 */
export interface ViralActivity {
  type: 'share' | 'invite' | 'help' | 'challenge';
  timestamp: number;
  data: any;
}

/**
 * Конфигурация виральных механик
 */
export interface ViralConfig {
  shareSettings: {
    inviteBonus: number;
    helpCooldown: number; // секунды
    maxFriendsHelped: number;
    clanSizeLimit: number;
    shareReward: number;
  };
  referralTiers: {
    invites: number;
    reward: number;
  }[];
  helpTypes?: {
    freeze?: { duration: number; cooldown: number };
    damage?: { value: number; cooldown: number };
    coins?: { value: number; cooldown: number };
    shield?: { lives: number; cooldown: number };
  };
}

