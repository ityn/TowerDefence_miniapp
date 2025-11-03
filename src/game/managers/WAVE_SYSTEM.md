# Wave System Documentation

## Обзор

Полнофункциональная система волн для Tower Defence игры с конфигурируемыми врагами, таймерами и прогрессом.

## Архитектура

### Компоненты

1. **WaveManager** - управление волнами, таймерами, прогрессом
2. **EnemyManager** - фабрика и управление врагами
3. **WaveUI** - UI компонент для отображения информации о волнах

### Event-Driven Architecture

Система использует Phaser.Events для коммуникации между компонентами:

```
WaveEvents:
- WAVE_STARTED - волна началась
- WAVE_COMPLETED - волна завершена
- WAVE_PROGRESS_UPDATED - обновление прогресса
- ALL_WAVES_COMPLETED - все волны завершены
- ENEMY_SPAWNED - враг создан
- ENEMY_DIED - враг убит
- ENEMY_REACHED_END - враг достиг конца пути
```

## Конфигурация

### enemies-config.json

Определяет типы врагов и их характеристики:

```json
{
  "fast": {
    "health": 50,
    "speed": 120,
    "bounty": 15,
    "texture": "enemy_fast",
    "scale": 0.8
  }
}
```

### waves-config.json

Определяет волны для каждой карты:

```json
{
  "map_forest": [
    {
      "waveNumber": 1,
      "description": "Разведка",
      "enemies": [
        {"type": "fast", "count": 8, "spawnDelay": 1.2}
      ],
      "reward": 100,
      "preWaveDelay": 5.0
    }
  ]
}
```

## Использование

### Инициализация

```typescript
// В GameScene.create()
this.enemyManager = new EnemyManager(this);
this.waveManager = new WaveManager(this, this.enemyManager);

await this.enemyManager.loadEnemyConfigs();
await this.waveManager.loadWaves('forest');
this.waveManager.setPath(path);
```

### Запуск волны

```typescript
// Вручную
this.waveManager.startNextWave();

// Через UI кнопку
this.waveUI.setOnStartWaveCallback(() => {
  this.waveManager.startNextWave();
});
```

### Подписка на события

```typescript
this.waveManager.on(WaveEvents.WAVE_COMPLETED, (event) => {
  this.gameState.coins += event.reward;
});

this.enemyManager.on(WaveEvents.ENEMY_DIED, (event) => {
  this.gameState.coins += event.bounty;
});
```

## WaveProgress

Интерфейс для отслеживания прогресса волны:

```typescript
interface WaveProgress {
  currentWave: number;           // Текущая волна (1-based)
  totalWaves: number;            // Всего волн
  enemiesSpawned: number;        // Заспавнено врагов
  enemiesTotal: number;         // Всего врагов в волне
  enemiesAlive: number;          // Живых врагов
  timeUntilNextWave: number;     // Время до следующей волны (сек)
  isWaveInProgress: boolean;    // Идет ли волна
}
```

## UI Компоненты

### WaveUI

Автоматически отображает:
- Текущую волну (current/total)
- Прогресс врагов
- Таймер до следующей волны
- Кнопку "Start Wave"

```typescript
this.waveUI = new WaveUI(this);
this.waveUI.updateWaveProgress(progress);
```

## Особенности

1. **Автоматический переход** - после завершения волны автоматически начинается следующая
2. **Пропуск таймера** - кнопка "Start Wave" позволяет ускорить начало волны
3. **Динамический прогресс** - прогресс-бар меняет цвет в зависимости от прогресса
4. **Гибкие конфиги** - легко добавлять новые типы врагов и волны через JSON

## Расширение

### Добавление нового типа врага

1. Добавить в `enemies-config.json`
2. Добавить в `EnemyType` enum (если нужен в коде)
3. Система автоматически подхватит новый тип

### Добавление новой волны

Просто добавьте объект волны в массив `map_forest` в `waves-config.json`

## Future Improvements

- Система сохранения прогресса волн
- Динамическая генерация волн
- Боссы в финальных волнах
- Усиление врагов со временем

