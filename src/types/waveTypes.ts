/**
 * Типы для системы волн
 */

import type { EnemyType } from './gameTypes';

/**
 * События системы волн
 */
export enum WaveEvents {
  WAVE_STARTED = 'waveStarted',
  WAVE_COMPLETED = 'waveCompleted',
  WAVE_PROGRESS_UPDATED = 'waveProgressUpdated',
  ALL_WAVES_COMPLETED = 'allWavesCompleted',
  ENEMY_SPAWNED = 'enemySpawned',
  ENEMY_DIED = 'enemyDied',
  ENEMY_REACHED_END = 'enemyReachedEnd',
}

/**
 * Данные события начала волны
 */
export interface WaveStartedEvent {
  waveNumber: number;
  description: string;
}

/**
 * Данные события завершения волны
 */
export interface WaveCompletedEvent {
  waveNumber: number;
  reward: number;
}

/**
 * Данные события смерти врага
 */
export interface EnemyDiedEvent {
  enemyType: EnemyType;
  bounty: number;
}

