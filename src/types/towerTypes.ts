import type { TowerType } from './gameTypes';
import type { Enemy } from '@/game/objects/Enemy';

/**
 * Конфигурация проектиля
 */
export interface ProjectileConfig {
  type: 'bullet' | 'rocket' | 'laser' | 'instant';
  speed?: number;
  texture: string;
  animation?: string;
}

/**
 * Улучшение башни
 */
export interface TowerUpgrade {
  level: number;
  damage?: number;
  range?: number;
  attackSpeed?: number;
  cost: number;
}

/**
 * Эффект башни
 */
export type TowerEffect = 'slow' | 'poison' | 'splash';

/**
 * Конфигурация башни из JSON
 */
export interface TowerConfig {
  name: string;
  damage: number;
  range: number;
  attackSpeed: number;
  cost: number;
  projectile: ProjectileConfig;
  upgrades?: TowerUpgrade[];
  effects?: TowerEffect[];
  splashRadius?: number;
  splashDamage?: number; // Множитель урона для splash (0.0 - 1.0)
  slowAmount?: number; // Множитель замедления (0.0 - 1.0)
  slowDuration?: number; // Длительность замедления в секундах
  poisonDamage?: number; // Урон в секунду
  poisonDuration?: number; // Длительность яда в секундах
  poisonStacks?: boolean; // Можно ли стакать эффект
}

/**
 * Экземпляр башни в игре
 */
export interface TowerInstance {
  id: string;
  type: TowerType;
  level: number;
  x: number;
  y: number;
  currentTarget: Enemy | null;
  lastAttackTime: number;
  config: TowerConfig;
}

/**
 * Стратегия поиска цели
 */
export enum TargetStrategy {
  CLOSEST = 'closest', // Ближайший враг
  STRONGEST = 'strongest', // Самый сильный (больше здоровья)
  FIRST = 'first', // Первый в пути (ближе к концу)
  WEAKEST = 'weakest', // Самый слабый
}

/**
 * Типы эффектов для врагов
 */
export interface SlowEffect {
  type: 'slow';
  amount: number; // Множитель скорости (0.0 - 1.0)
  duration: number; // В секундах
  endTime: number; // Когда эффект заканчивается
}

export interface PoisonEffect {
  type: 'poison';
  damagePerSecond: number;
  duration: number;
  endTime: number;
  stacks?: number; // Количество стаков
}

export type EnemyEffect = SlowEffect | PoisonEffect;

