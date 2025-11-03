/**
 * События системы башен
 */
export enum TowerEvents {
  TOWER_BUILT = 'towerBuilt',
  TOWER_UPGRADED = 'towerUpgraded',
  TOWER_SOLD = 'towerSold',
  TOWER_ATTACK = 'towerAttack',
  TOWER_TARGET_LOST = 'towerTargetLost',
}

/**
 * События проектилей
 */
export enum ProjectileEvents {
  PROJECTILE_FIRED = 'projectileFired',
  PROJECTILE_HIT = 'projectileHit',
  PROJECTILE_MISSED = 'projectileMissed',
}

/**
 * События эффектов
 */
export enum EffectEvents {
  EFFECT_APPLIED = 'effectApplied',
  EFFECT_EXPIRED = 'effectExpired',
  EFFECT_TICK = 'effectTick',
}

/**
 * Данные события постройки башни
 */
export interface TowerBuiltEvent {
  towerId: string;
  type: string;
  x: number;
  y: number;
  cost: number;
}

/**
 * Данные события улучшения башни
 */
export interface TowerUpgradedEvent {
  towerId: string;
  oldLevel: number;
  newLevel: number;
  cost: number;
}

/**
 * Данные события продажи башни
 */
export interface TowerSoldEvent {
  towerId: string;
  refund: number;
}

/**
 * Данные события атаки башни
 */
export interface TowerAttackEvent {
  towerId: string;
  targetId: string;
  damage: number;
}

