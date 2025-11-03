/**
 * Типы для системы оптимизации производительности
 */

/**
 * Конфигурация object pooling
 */
export interface ObjectPoolingConfig {
  enemies: {
    initial: number;
    max: number;
  };
  projectiles: {
    initial: number;
    max: number;
  };
  particles: {
    initial: number;
    max: number;
  };
  effects: {
    initial: number;
    max: number;
  };
}

/**
 * Конфигурация управления памятью
 */
export interface MemoryManagementConfig {
  autoCleanup: boolean;
  gcInterval: number; // миллисекунды
  textureAtlas: boolean;
  maxCacheSize: number;
  clearUnusedTextures: boolean;
}

/**
 * Конфигурация мобильной оптимизации
 */
export interface MobileOptimizationConfig {
  maxFPS: number;
  textureCompression: boolean;
  reducedEffects: boolean;
  adaptiveQuality: boolean;
  batterySaver: boolean;
}

/**
 * Полная конфигурация производительности
 */
export interface PerformanceConfig {
  objectPooling: ObjectPoolingConfig;
  memoryManagement: MemoryManagementConfig;
  mobileOptimization: MobileOptimizationConfig;
  debugMode: boolean;
}

/**
 * Метрики производительности
 */
export interface PerformanceMetrics {
  fps: number;
  frameTime: number; // миллисекунды
  memoryUsage: number; // MB
  activeObjects: {
    enemies: number;
    projectiles: number;
    particles: number;
  };
  poolUtilization: {
    enemies: number; // процент
    projectiles: number;
    particles: number;
  };
}
