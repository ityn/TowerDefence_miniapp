import * as Phaser from 'phaser';
import { GamePhase, ExtendedGameState, GameSessionStats } from '@/types/gameStateTypes';
import type { GameState } from '@/types/gameTypes';
import type { PlayerProfile } from '@/types/profileTypes';

/**
 * Центральный менеджер состояния игры
 */
export class GameStateManager extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private gameState: GameState;
  private extendedState: ExtendedGameState;
  private sessionStats: GameSessionStats;

  constructor(scene: Phaser.Scene, initialGameState: GameState) {
    super();
    this.scene = scene;
    this.gameState = { ...initialGameState };
    
    this.extendedState = {
      phase: GamePhase.MENU,
      currentMap: null,
      currentWave: 0,
      startTime: 0,
      playTime: 0,
      isInitialized: false,
    };

    this.sessionStats = {
      enemiesKilled: 0,
      towersBuilt: 0,
      towersUpgraded: 0,
      coinsEarned: 0,
      coinsSpent: 0,
      wavesCompleted: 0,
      perfectWaves: 0,
    };
  }

  /**
   * Изменяет фазу игры
   */
  changePhase(newPhase: GamePhase): void {
    const oldPhase = this.extendedState.phase;
    this.extendedState.phase = newPhase;

    this.emit('phaseChanged', {
      oldPhase,
      newPhase,
      state: { ...this.extendedState },
    });
  }

  /**
   * Начинает новую игру
   */
  startGame(mapId: string, profile: PlayerProfile): void {
    this.extendedState.phase = GamePhase.LOADING;
    this.extendedState.currentMap = mapId;
    this.extendedState.startTime = this.scene.time.now;
    this.extendedState.playTime = 0;
    
    // Инициализируем игровое состояние из профиля
    this.gameState.coins = profile.coins;
    this.gameState.currentWave = 0;
    this.gameState.score = 0;
    this.gameState.isGameOver = false;

    // Сбрасываем статистику сессии
    this.sessionStats = {
      enemiesKilled: 0,
      towersBuilt: 0,
      towersUpgraded: 0,
      coinsEarned: 0,
      coinsSpent: 0,
      wavesCompleted: 0,
      perfectWaves: 0,
    };

    this.emit('gameStarted', {
      mapId,
      profile,
    });
  }

  /**
   * Переходит в фазу игры
   */
  enterPlayingPhase(): void {
    this.extendedState.phase = GamePhase.PLAYING;
    this.extendedState.isInitialized = true;
    this.changePhase(GamePhase.PLAYING);
  }

  /**
   * Пауза игры
   */
  pauseGame(): void {
    if (this.extendedState.phase === GamePhase.PLAYING) {
      this.scene.scene.pause();
      this.changePhase(GamePhase.PAUSED);
    }
  }

  /**
   * Возобновляет игру
   */
  resumeGame(): void {
    if (this.extendedState.phase === GamePhase.PAUSED) {
      this.scene.scene.resume();
      this.changePhase(GamePhase.PLAYING);
    }
  }

  /**
   * Обрабатывает победу
   */
  handleVictory(): void {
    this.extendedState.phase = GamePhase.VICTORY;
    this.extendedState.playTime = (this.scene.time.now - this.extendedState.startTime) / 1000;
    
    const victoryData = {
      score: this.gameState.score,
      playTime: this.extendedState.playTime,
      wavesCompleted: this.extendedState.currentWave,
      stats: { ...this.sessionStats },
    };

    this.changePhase(GamePhase.VICTORY);
    this.emit('gameVictory', victoryData);
  }

  /**
   * Обрабатывает поражение
   */
  handleDefeat(): void {
    this.extendedState.phase = GamePhase.DEFEAT;
    this.extendedState.playTime = (this.scene.time.now - this.extendedState.startTime) / 1000;
    
    const defeatData = {
      score: this.gameState.score,
      playTime: this.extendedState.playTime,
      wave: this.extendedState.currentWave,
      stats: { ...this.sessionStats },
    };

    this.changePhase(GamePhase.DEFEAT);
    this.emit('gameDefeat', defeatData);
  }

  /**
   * Перезапускает игру
   */
  restartGame(): void {
    this.extendedState.phase = GamePhase.MENU;
    this.gameState.isGameOver = false;
    this.gameState.score = 0;
    this.gameState.currentWave = 0;
    
    this.changePhase(GamePhase.MENU);
    this.emit('gameRestart');
  }

  /**
   * Обновляет время игры
   */
  update(): void {
    if (this.extendedState.phase === GamePhase.PLAYING) {
      this.extendedState.playTime = (this.scene.time.now - this.extendedState.startTime) / 1000;
    }
  }

  /**
   * Обновляет базовое игровое состояние
   */
  updateGameState(updates: Partial<GameState>): void {
    this.gameState = { ...this.gameState, ...updates };
  }

  /**
   * Обновляет волну
   */
  updateWave(waveNumber: number): void {
    this.extendedState.currentWave = waveNumber;
    this.gameState.currentWave = waveNumber;
  }

  /**
   * Обновляет статистику сессии
   */
  updateStats(stats: Partial<GameSessionStats>): void {
    this.sessionStats = { ...this.sessionStats, ...stats };
  }

  /**
   * Получает текущее игровое состояние
   */
  getGameState(): GameState {
    return { ...this.gameState };
  }

  /**
   * Получает расширенное состояние
   */
  getExtendedState(): ExtendedGameState {
    return { ...this.extendedState };
  }

  /**
   * Получает статистику сессии
   */
  getSessionStats(): GameSessionStats {
    return { ...this.sessionStats };
  }

  /**
   * Проверяет текущую фазу
   */
  isPhase(phase: GamePhase): boolean {
    return this.extendedState.phase === phase;
  }
}

