import type { MapConfig, LoadedMap, Waypoint, Path } from '@/types/mapTypes';

/**
 * Менеджер для загрузки и управления картами
 */
export class MapManager {
  private loadedMaps: Map<string, LoadedMap> = new Map();
  private currentMap: LoadedMap | null = null;

  /**
   * Загружает конфигурацию карты из JSON
   */
  async loadMapConfig(mapId: string): Promise<MapConfig> {
    try {
      const response = await fetch(`/data/maps/${mapId}.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to load map config: ${mapId}`);
      }

      const config: MapConfig = await response.json();
      
      // Валидация конфигурации
      if (!config.id || !config.name || !config.waypoints || config.waypoints.length < 2) {
        throw new Error(`Invalid map config: ${mapId}`);
      }

      return config;
    } catch (error) {
      console.error(`Error loading map ${mapId}:`, error);
      throw error;
    }
  }

  /**
   * Преобразует конфигурацию карты в загруженную карту
   */
  processMapConfig(config: MapConfig): LoadedMap {
    const waypoints: Waypoint[] = config.waypoints.map(([x, y]) => ({ x, y }));
    
    const buildableTiles = new Set<string>();
    if (config.buildableTiles) {
      config.buildableTiles.forEach(tile => buildableTiles.add(tile));
    }

    return {
      id: config.id,
      name: config.name,
      waypoints,
      buildableTiles,
      background: config.background,
    };
  }

  /**
   * Загружает и обрабатывает карту
   */
  async loadMap(mapId: string): Promise<LoadedMap> {
    // Проверяем кэш
    if (this.loadedMaps.has(mapId)) {
      return this.loadedMaps.get(mapId)!;
    }

    const config = await this.loadMapConfig(mapId);
    const loadedMap = this.processMapConfig(config);
    
    this.loadedMaps.set(mapId, loadedMap);
    return loadedMap;
  }

  /**
   * Устанавливает текущую карту
   */
  setCurrentMap(map: LoadedMap): void {
    this.currentMap = map;
  }

  /**
   * Получает текущую карту
   */
  getCurrentMap(): LoadedMap | null {
    return this.currentMap;
  }

  /**
   * Создает путь для движения врагов
   */
  createPath(waypoints: Waypoint[]): Path {
    if (waypoints.length < 2) {
      throw new Error('Path must have at least 2 waypoints');
    }

    // Вычисляем общее расстояние пути
    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const current = waypoints[i];
      const next = waypoints[i + 1];
      const distance = Math.sqrt(
        Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2)
      );
      totalDistance += distance;
    }

    return {
      waypoints,
      totalDistance,
    };
  }

  /**
   * Получает путь текущей карты
   */
  getCurrentPath(): Path | null {
    if (!this.currentMap) {
      return null;
    }

    return this.createPath(this.currentMap.waypoints);
  }

  /**
   * Проверяет, можно ли строить башню на данной позиции
   */
  canBuildAt(x: number, y: number): boolean {
    if (!this.currentMap) {
      return false;
    }

    // Простая проверка: если buildableTiles пуст, разрешаем везде
    if (this.currentMap.buildableTiles.size === 0) {
      return true;
    }

    // Проверяем, находится ли позиция в списке buildableTiles
    const tileKey = `${Math.floor(x)},${Math.floor(y)}`;
    return this.currentMap.buildableTiles.has(tileKey);
  }

  /**
   * Очищает кэш карт
   */
  clearCache(): void {
    this.loadedMaps.clear();
    this.currentMap = null;
  }
}

// Экспортируем singleton экземпляр
export const mapManager = new MapManager();

