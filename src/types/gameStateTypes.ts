/**
 * Фазы игрового состояния
 */
export enum GamePhase {
  MENU = 'menu',
  LOADING = 'loading',
  PLAYING = 'playing',
  PAUSED = 'paused',
  VICTORY = 'victory',
  DEFEAT = 'defeat',
}

/**
 * Расширенное состояние игры
 */
export interface ExtendedGameState {
  phase: GamePhase;
  currentMap: string | null;
  currentWave: number;
  startTime: number;
  playTime: number; // В секундах
  isInitialized: boolean;
}

/**
 * Статистика игры
 */
export interface GameSessionStats {
  enemiesKilled: number;
  towersBuilt: number;
  towersUpgraded: number;
  coinsEarned: number;
  coinsSpent: number;
  wavesCompleted: number;
  perfectWaves: number; // Волны без потери жизней
}

