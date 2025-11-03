# Map Manager System

## Описание

`MapManager` отвечает за загрузку, обработку и управление картами для Tower Defence игры.

## Структура

### Конфигурация карты (JSON)

Карты хранятся в `public/data/maps/` и имеют следующую структуру:

```json
{
  "id": "forest",
  "name": "Forest Path",
  "waypoints": [[800, 100], [600, 100], [600, 300]],
  "buildableTiles": ["100,200", "300,200"],
  "background": "forest"
}
```

### Waypoints

Waypoints определяют путь движения врагов. Это массив координат `[x, y]`:
- Первая точка - старт (зеленая)
- Последняя точка - финиш (красная)  
- Промежуточные точки - желтые

### Buildable Tiles

Опциональный список тайлов, где можно строить башни. Формат: `"x,y"` строки.

Если `buildableTiles` не указан или пуст, можно строить везде.

## Использование

```typescript
import { mapManager } from '@/game/managers/MapManager';

// Загрузка карты
const map = await mapManager.loadMap('forest');

// Установка текущей карты
mapManager.setCurrentMap(map);

// Получение пути
const path = mapManager.getCurrentPath();

// Проверка возможности строительства
const canBuild = mapManager.canBuildAt(100, 200);
```

## API

### `loadMap(mapId: string): Promise<LoadedMap>`
Загружает и кэширует карту.

### `setCurrentMap(map: LoadedMap): void`
Устанавливает текущую активную карту.

### `getCurrentPath(): Path | null`
Возвращает путь текущей карты.

### `canBuildAt(x: number, y: number): boolean`
Проверяет, можно ли строить башню на указанной позиции.

