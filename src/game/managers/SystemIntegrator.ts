import * as Phaser from 'phaser';
import { GameStateManager } from './GameStateManager';
import { EnemyManager } from './EnemyManager';
import { WaveManager } from './WaveManager';
import { TowerSystem } from '@/game/systems/TowerSystem';
import { ProjectileSystem } from '@/game/systems/ProjectileSystem';
import { EffectSystem } from '@/game/systems/EffectSystem';
import { ParticleManager } from '@/game/systems/ParticleManager';
import { SoundManager } from '@/game/systems/SoundManager';
import { CameraEffects } from '@/game/systems/CameraEffects';
import { WaveEvents } from '@/types/waveTypes';
import type { WaveStartedEvent, WaveCompletedEvent, EnemyDiedEvent } from '@/types/waveTypes';
import { TowerEvents } from '@/types/towerEvents';
import type { TowerBuiltEvent, TowerUpgradedEvent } from '@/types/towerEvents';
import { EffectEvents } from '@/types/towerEvents';
import { ProjectileEvents } from '@/types/towerEvents';
import { GamePhase } from '@/types/gameStateTypes';

/**
 * Интегратор всех систем игры - связывает их через события
 */
export class SystemIntegrator extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private stateManager: GameStateManager;
  
  // Системы
  private enemyManager: EnemyManager;
  private waveManager: WaveManager;
  private towerSystem: TowerSystem;
  private projectileSystem: ProjectileSystem;
  private effectSystem: EffectSystem;
  
  // Эффекты
  private particleManager: ParticleManager;
  private soundManager: SoundManager;
  private cameraEffects: CameraEffects;

  constructor(
    scene: Phaser.Scene,
    stateManager: GameStateManager,
    enemyManager: EnemyManager,
    waveManager: WaveManager,
    towerSystem: TowerSystem,
    projectileSystem: ProjectileSystem,
    effectSystem: EffectSystem,
    particleManager: ParticleManager,
    soundManager: SoundManager,
    cameraEffects: CameraEffects
  ) {
    super();
    this.scene = scene;
    this.stateManager = stateManager;
    this.enemyManager = enemyManager;
    this.waveManager = waveManager;
    this.towerSystem = towerSystem;
    this.projectileSystem = projectileSystem;
    this.effectSystem = effectSystem;
    this.particleManager = particleManager;
    this.soundManager = soundManager;
    this.cameraEffects = cameraEffects;

    this.setupSystemIntegration();
  }

  /**
   * Настраивает интеграцию всех систем через события
   */
  private setupSystemIntegration(): void {
    // === ВОЛНЫ → ВРАГИ ===
    this.waveManager.on(WaveEvents.WAVE_STARTED, (event: WaveStartedEvent) => {
      this.soundManager.playSound('wave_start');
      this.particleManager.createStars(400, 100);
    });

    this.waveManager.on(WaveEvents.WAVE_COMPLETED, (event: WaveCompletedEvent) => {
      this.stateManager.updateWave(event.waveNumber);
      this.stateManager.updateStats({ 
        wavesCompleted: event.waveNumber,
      });

      // Эффекты
      this.particleManager.createCoinEffect(400, 100, event.reward);
      this.soundManager.playSound('wave_complete');
      
      // Проверяем perfect wave (нет потерь жизней)
      const currentLives = this.stateManager.getGameState().lives;
      const initialLives = 10; // TODO: получить из начального состояния
      if (currentLives >= initialLives) {
        this.stateManager.updateStats({ 
          perfectWaves: this.stateManager.getSessionStats().perfectWaves + 1,
        });
      }
    });

    // === ВРАГИ → БАШНИ ===
    this.enemyManager.on(WaveEvents.ENEMY_DIED, (event: EnemyDiedEvent) => {
      this.stateManager.updateStats({ 
        enemiesKilled: this.stateManager.getSessionStats().enemiesKilled + 1,
      });

      // Эффекты
      this.particleManager.createStars(400, 300);
      this.soundManager.playSound('enemy_killed');
    });

    this.enemyManager.on(WaveEvents.ENEMY_REACHED_END, () => {
      this.cameraEffects.shakeHit();
      this.soundManager.playSound('life_lost');
    });

    // === БАШНИ → ПРОЕКТИЛИ ===
    this.towerSystem.on(TowerEvents.TOWER_ATTACK, () => {
      this.soundManager.playSound('tower_shoot');
    });

    this.towerSystem.on(TowerEvents.TOWER_BUILT, (event: TowerBuiltEvent) => {
      this.stateManager.updateStats({ 
        towersBuilt: this.stateManager.getSessionStats().towersBuilt + 1,
        coinsSpent: this.stateManager.getSessionStats().coinsSpent + event.cost,
      });

      // Эффекты
      this.particleManager.createStars(event.x, event.y);
      this.cameraEffects.shake(0.005, 100);
      this.soundManager.playSound('tower_built');
    });

    this.towerSystem.on(TowerEvents.TOWER_UPGRADED, (event: TowerUpgradedEvent) => {
      this.stateManager.updateStats({ 
        towersUpgraded: this.stateManager.getSessionStats().towersUpgraded + 1,
        coinsSpent: this.stateManager.getSessionStats().coinsSpent + event.cost,
      });

      // Эффекты
      this.particleManager.createMagic(event.towerId ? 400 : 400, 300);
      this.soundManager.playSound('tower_upgrade');
    });

    // === ПРОЕКТИЛИ → ЭФФЕКТЫ ===
    this.scene.events.on(ProjectileEvents.PROJECTILE_HIT, (projectile: any, target: any) => {
      // Визуальные эффекты в зависимости от типа
      const config = (projectile as any).config;
      if (config?.type === 'rocket') {
        this.cameraEffects.shakeExplosion();
        this.particleManager.createExplosion(projectile.x, projectile.y);
      } else if (config?.type === 'bullet') {
        this.particleManager.createHit(projectile.x, projectile.y);
      } else if (config?.type === 'instant') {
        this.particleManager.createMagic(projectile.x, projectile.y);
      }

      this.soundManager.playSound('projectile_hit');
    });

    // === ЭФФЕКТЫ → ВИЗУАЛИЗАЦИЯ ===
    this.effectSystem.on(EffectEvents.EFFECT_APPLIED, (data: any) => {
      const { effect, enemy } = data;
      
      if (effect.type === 'slow') {
        this.particleManager.createMagic(enemy.x, enemy.y);
      } else if (effect.type === 'poison') {
        this.particleManager.createStars(enemy.x, enemy.y);
      }
    });

    // === СОСТОЯНИЕ ИГРЫ ===
    this.stateManager.on('gameVictory', (data: any) => {
      // Эффекты победы
      this.cameraEffects.flash(0x00ff00, 1000);
      this.particleManager.createStars(400, 300);
      this.particleManager.createCoinEffect(400, 300, data.score);
      this.soundManager.playSound('victory');
    });

    this.stateManager.on('gameDefeat', (_data: any) => {
      // Эффекты поражения
      this.cameraEffects.flash(0xff0000, 500);
      this.cameraEffects.shake(0.02, 500);
      this.soundManager.playSound('defeat');
    });

    this.stateManager.on('phaseChanged', (data: any) => {
      if (data.newPhase === GamePhase.PLAYING) {
        this.soundManager.playMusic('background_music');
      } else if (data.newPhase === GamePhase.PAUSED || data.newPhase === GamePhase.VICTORY || data.newPhase === GamePhase.DEFEAT) {
        this.soundManager.stopMusic();
      }
    });
  }

  /**
   * Обновляет все системы
   */
  update(delta: number): void {
    if (!this.stateManager.isPhase(GamePhase.PLAYING)) {
      return;
    }

    // Обновляем состояние
    this.stateManager.update();

    // Обновляем системы
    const enemies = this.enemyManager.getEnemies();
    this.towerSystem.update(enemies);
    this.projectileSystem.update(delta);
  }

  /**
   * Очищает все системы
   */
  cleanup(): void {
    this.enemyManager.clearAll();
    this.towerSystem.clearAll();
    this.projectileSystem.clear();
    this.particleManager.destroy();
    this.effectSystem.destroy();
  }
}

