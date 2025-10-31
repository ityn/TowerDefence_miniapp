// Типы для позиционирования
export interface Position {
  x: number;
  y: number;
}

// Типы для врагов
export interface EnemyConfig {
  type: EnemyType;
  health: number;
  speed: number;
  bounty: number;
  texture: string;
}

export enum EnemyType {
  SLOW = 'slow',
  FAST = 'fast', 
  TANK = 'tank'
}

// Типы для башен
export interface TowerConfig {
  type: TowerType;
  damage: number;
  range: number;
  attackSpeed: number;
  cost: number;
  texture: string;
  projectileTexture?: string;
}

export enum TowerType {
  CANNON = 'cannon',
  ICE = 'ice'
}

// Типы для волн
export interface WaveConfig {
  waveNumber: number;
  enemies: WaveEnemy[];
  delayBetweenSpawns: number;
}

export interface WaveEnemy {
  enemyType: EnemyType;
  count: number;
  spawnDelay: number;
}

// Состояние игры
export interface GameState {
  coins: number;
  lives: number;
  currentWave: number;
  score: number;
  isGameOver: boolean;
}