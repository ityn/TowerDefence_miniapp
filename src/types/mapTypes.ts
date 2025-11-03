import { Position } from './gameTypes';

/**
 * Конфигурация точки пути (waypoint)
 */
export interface Waypoint {
  x: number;
  y: number;
}

/**
 * Конфигурация карты из JSON
 */
export interface MapConfig {
  id: string;
  name: string;
  waypoints: number[][]; // [x, y] pairs
  buildableTiles?: string[]; // "x,y" format для будущего использования
  background?: string;
}

/**
 * Загруженная и обработанная карта
 */
export interface LoadedMap {
  id: string;
  name: string;
  waypoints: Waypoint[];
  buildableTiles: Set<string>;
  background?: string;
}

/**
 * Путь для движения врагов (последовательность waypoints)
 */
export interface Path {
  waypoints: Waypoint[];
  totalDistance: number;
}

