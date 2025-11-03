/**
 * Конфигурация достижения
 */
export interface AchievementConfig {
  id: string;
  name: string;
  description: string;
  reward: number;
  condition: AchievementCondition;
  icon?: string;
}

/**
 * Условие для разблокировки достижения
 */
export interface AchievementCondition {
  type: AchievementConditionType;
  value: number;
  target?: string; // Для специфичных условий (id карты, типа башни и т.д.)
}

/**
 * Типы условий достижений
 */
export enum AchievementConditionType {
  KILL_ENEMIES = 'kill_enemies',
  KILL_ENEMY_TYPE = 'kill_enemy_type',
  BUILD_TOWER = 'build_tower',
  UPGRADE_TOWER = 'upgrade_tower',
  UPGRADE_TOWER_TO_LEVEL = 'upgrade_tower_to_level',
  COMPLETE_MAP = 'complete_map',
  COMPLETE_MAP_NO_LIVES_LOST = 'complete_map_no_lives_lost',
  COMPLETE_WAVE = 'complete_wave',
  EARN_COINS = 'earn_coins',
  SCORE_REACHED = 'score_reached',
  PLAY_GAMES = 'play_games',
  WIN_GAMES = 'win_games',
}

/**
 * События достижений
 */
export enum AchievementEvents {
  ACHIEVEMENT_UNLOCKED = 'achievementUnlocked',
  PROGRESS_UPDATED = 'progressUpdated',
}

