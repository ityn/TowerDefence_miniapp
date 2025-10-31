import { TowerType } from '@/types/gameTypes';

/**
 * Константы игры
 */

export const TOWER_COSTS: Record<TowerType, number> = {
  [TowerType.CANNON]: 50,
  [TowerType.ICE]: 75,
};

export const INITIAL_GAME_STATE = {
  coins: 100,
  lives: 10,
  currentWave: 1,
  score: 0,
  isGameOver: false,
} as const;

export const TOWER_COLORS: Record<TowerType, number> = {
  [TowerType.CANNON]: 0xff6d6d,
  [TowerType.ICE]: 0x6dc2ff,
};

export const UI_STYLES = {
  text: {
    fontSize: '20px',
    color: '#ffffff',
    fontFamily: 'Arial',
  },
  button: {
    fontSize: '14px',
    color: '#ffffff',
  },
  gameOver: {
    fontSize: '48px',
    color: '#ff0000',
  },
} as const;

export const BUTTON_COLORS = {
  cannon: 0x4a86e8,
  ice: 0x6aa84f,
} as const;

