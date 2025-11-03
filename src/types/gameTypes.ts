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
  TANK = 'tank',
  SWARM = 'swarm'
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
  ICE = 'ice',
  SPLASH = 'splash',
  SNIPER = 'sniper',
  POISON = 'poison'
}

// Типы для врагов (конфиг из JSON)
export interface EnemyConfigData {
  health: number;
  speed: number;
  bounty: number;
  texture: string;
  scale?: number;
}

// Типы для волн
export interface WaveConfig {
  waveNumber: number;
  description: string;
  enemies: WaveEnemy[];
  reward: number;
  preWaveDelay: number;
}

export interface WaveEnemy {
  type: string; // EnemyType как строка для JSON
  count: number;
  spawnDelay: number;
}

// Прогресс волны
export interface WaveProgress {
  currentWave: number;
  totalWaves: number;
  enemiesSpawned: number;
  enemiesTotal: number;
  enemiesAlive: number;
  timeUntilNextWave: number;
  isWaveInProgress: boolean;
}

// Состояние игры
export interface GameState {
  coins: number;
  lives: number;
  currentWave: number;
  score: number;
  isGameOver: boolean;
}