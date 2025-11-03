# Финальная интеграция систем - Инструкции

## Новые менеджеры и компоненты

### Созданные файлы:

1. **GameStateManager** (`src/game/managers/GameStateManager.ts`)
   - Центральное управление состоянием игры
   - Управление фазами (MENU, PLAYING, PAUSED, VICTORY, DEFEAT)
   - Отслеживание времени игры
   - Статистика сессии

2. **SystemIntegrator** (`src/game/managers/SystemIntegrator.ts`)
   - Связывает все системы через события
   - Координирует взаимодействие Tower/Enemy/Wave
   - Управляет визуальными эффектами

3. **TelegramBridge** (`src/services/TelegramBridge.ts`)
   - Упрощенный интерфейс для Telegram интеграции
   - Сохранение/загрузка прогресса
   - Виральные механики

4. **PolishOrchestrator** (`src/game/managers/PolishOrchestrator.ts`)
   - Координирует все визуальные эффекты
   - Унифицированный интерфейс для полировки

5. **PerformanceOptimizer** (`src/game/managers/PerformanceOptimizer.ts`)
   - Мониторинг FPS
   - Автоматическая оптимизация
   - Контроль частиц

6. **UI компоненты:**
   - MainMenuUI
   - PauseMenuUI
   - VictoryScreenUI
   - DefeatScreenUI
   - LoadingScreenUI

## Интеграция в GameScene

### Шаг 1: Добавить новые импорты

```typescript
import { GameStateManager } from '@/game/managers/GameStateManager';
import { SystemIntegrator } from '@/game/managers/SystemIntegrator';
import { TelegramBridge } from '@/services/TelegramBridge';
import { PolishOrchestrator } from '@/game/managers/PolishOrchestrator';
import { PerformanceOptimizer } from '@/game/managers/PerformanceOptimizer';
import { MainMenuUI } from '@/game/ui/MainMenuUI';
import { PauseMenuUI } from '@/game/ui/PauseMenuUI';
import { VictoryScreenUI } from '@/game/ui/VictoryScreenUI';
import { DefeatScreenUI } from '@/game/ui/DefeatScreenUI';
import { LoadingScreenUI } from '@/game/ui/LoadingScreenUI';
import { GamePhase } from '@/types/gameStateTypes';
```

### Шаг 2: Добавить приватные поля

```typescript
// Менеджеры состояния
private stateManager!: GameStateManager;
private systemIntegrator!: SystemIntegrator;
private telegramBridge!: TelegramBridge;
private polishOrchestrator!: PolishOrchestrator;
private performanceOptimizer!: PerformanceOptimizer;

// UI экраны
private mainMenuUI!: MainMenuUI;
private pauseMenuUI!: PauseMenuUI;
private victoryScreenUI!: VictoryScreenUI;
private defeatScreenUI!: DefeatScreenUI;
private loadingScreenUI!: LoadingScreenUI;
```

### Шаг 3: Обновить create()

```typescript
async create(): Promise<void> {
  // 1. Инициализация Telegram и профиля
  this.telegramService = new TelegramIntegrationService();
  const user = this.telegramService.getUser();
  const userId = user?.id?.toString() || `user_${Date.now()}`;

  this.profileService = new PlayerProfileService(userId);
  await this.profileService.initialize();

  // Telegram Bridge
  this.telegramBridge = new TelegramBridge(
    this.telegramService,
    this.profileService
  );
  
  const { profile } = await this.telegramBridge.initialize();

  // 2. GameStateManager
  this.stateManager = new GameStateManager(this, { ...INITIAL_GAME_STATE });
  
  // 3. Системы
  this.effectSystem = new EffectSystem(this);
  this.projectileSystem = new ProjectileSystem(this, this.effectSystem);
  this.particleManager = new ParticleManager(this);
  this.soundManager = new SoundManager(this, profile.settings);
  this.cameraEffects = new CameraEffects(this);
  
  // 4. Менеджеры
  this.enemyManager = new EnemyManager(this);
  this.waveManager = new WaveManager(this, this.enemyManager);
  this.towerSystem = new TowerSystem(this, this.projectileSystem);
  
  // 5. Интегратор систем
  this.systemIntegrator = new SystemIntegrator(
    this,
    this.stateManager,
    this.enemyManager,
    this.waveManager,
    this.towerSystem,
    this.projectileSystem,
    this.effectSystem,
    this.particleManager,
    this.soundManager,
    this.cameraEffects
  );

  // 6. Polish Orchestrator
  this.polishOrchestrator = new PolishOrchestrator(
    this,
    this.particleManager,
    this.soundManager,
    this.cameraEffects,
    profile.settings
  );

  // 7. Performance Optimizer
  this.performanceOptimizer = new PerformanceOptimizer(this);

  // 8. Achievement System
  this.achievementSystem = new AchievementSystem(
    this.profileService,
    this.telegramService,
    this.events
  );
  await this.achievementSystem.loadAchievements();

  // 9. UI компоненты
  this.createAllUI();
  
  // 10. Показываем главное меню
  this.stateManager.changePhase(GamePhase.MENU);
  this.mainMenuUI.show(profile);

  // 11. Подписываемся на события
  this.setupGlobalEventListeners();
}
```

### Шаг 4: Создать все UI

```typescript
private createAllUI(): void {
  this.mainMenuUI = new MainMenuUI(this);
  this.mainMenuUI.setOnStartGameCallback((mapId) => {
    this.startNewGame(mapId);
  });

  this.pauseMenuUI = new PauseMenuUI(this);
  this.pauseMenuUI.setOnResumeCallback(() => {
    this.stateManager.resumeGame();
  });
  this.pauseMenuUI.setOnRestartCallback(() => {
    this.restartGame();
  });
  this.pauseMenuUI.setOnMenuCallback(() => {
    this.returnToMenu();
  });

  this.victoryScreenUI = new VictoryScreenUI(this);
  this.victoryScreenUI.setOnRestartCallback(() => {
    this.restartGame();
  });
  this.victoryScreenUI.setOnMenuCallback(() => {
    this.returnToMenu();
  });
  this.victoryScreenUI.setOnShareCallback(() => {
    const stats = this.stateManager.getSessionStats();
    this.telegramBridge.shareGameResult('high_score', {
      score: this.stateManager.getGameState().score
    });
  });

  this.defeatScreenUI = new DefeatScreenUI(this);
  this.defeatScreenUI.setOnRetryCallback(() => {
    this.restartGame();
  });
  this.defeatScreenUI.setOnMenuCallback(() => {
    this.returnToMenu();
  });

  this.loadingScreenUI = new LoadingScreenUI(this);
  
  // Старый UI
  this.waveUI = new WaveUI(this);
  this.towerUI = new TowerUI(this);
  this.dailyRewardUI = new DailyRewardUI(this);
}
```

### Шаг 5: Обработка Pause через клавишу

```typescript
private setupPauseControls(): void {
  this.input.keyboard?.on('keydown-ESC', () => {
    if (this.stateManager.isPhase(GamePhase.PLAYING)) {
      this.stateManager.pauseGame();
      this.pauseMenuUI.show();
    } else if (this.stateManager.isPhase(GamePhase.PAUSED)) {
      this.stateManager.resumeGame();
      this.pauseMenuUI.hide();
    }
  });
}
```

### Шаг 6: Методы управления игрой

```typescript
private async startNewGame(mapId: string): Promise<void> {
  this.loadingScreenUI.show();
  this.loadingScreenUI.setProgress(10);

  // Загрузка карты
  await this.loadMap(mapId);
  this.loadingScreenUI.setProgress(50);

  // Загрузка конфигов
  await this.loadConfigs();
  this.loadingScreenUI.setProgress(80);

  // Инициализация игры
  const profile = this.profileService.getProfile();
  this.stateManager.startGame(mapId, profile);
  
  this.loadingScreenUI.setProgress(100);
  
  // Визуализация
  this.visualizePath();
  this.createGameUI();
  this.setupBuildMode();

  this.loadingScreenUI.hide();
  this.stateManager.enterPlayingPhase();
}

private restartGame(): void {
  this.systemIntegrator.cleanup();
  const profile = this.profileService.getProfile();
  this.stateManager.startGame('forest', profile);
  this.stateManager.enterPlayingPhase();
}

private returnToMenu(): void {
  this.systemIntegrator.cleanup();
  this.mainMenuUI.show(this.profileService.getProfile());
  this.stateManager.changePhase(GamePhase.MENU);
}
```

### Шаг 7: Обновить update()

```typescript
update(time: number, delta: number): void {
  // Мониторинг производительности
  this.performanceOptimizer.registerFrame(delta);
  this.performanceOptimizer.resetParticleCount();

  // Обновляем состояние
  this.stateManager.update();

  // Обновляем системы только в игре
  if (this.stateManager.isPhase(GamePhase.PLAYING)) {
    this.systemIntegrator.update(delta);
    
    // Обновляем UI
    this.updateUI();
  }
}
```

## Ключевые улучшения

1. **Централизованное управление состоянием** через GameStateManager
2. **Автоматическая интеграция систем** через SystemIntegrator
3. **Упрощенная работа с Telegram** через TelegramBridge
4. **Координированные эффекты** через PolishOrchestrator
5. **Мониторинг производительности** через PerformanceOptimizer
6. **Полные UI экраны** для всех состояний игры

## Следующие шаги

1. Обновить GameScene.ts используя шаблон выше
2. Протестировать все фазы игры
3. Добавить звуковые файлы
4. Настроить баланс игры
5. Протестировать на мобильных устройствах

