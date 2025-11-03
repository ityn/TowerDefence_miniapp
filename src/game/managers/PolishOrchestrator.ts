import * as Phaser from 'phaser';
import { ParticleManager } from '@/game/systems/ParticleManager';
import { SoundManager } from '@/game/systems/SoundManager';
import { CameraEffects } from '@/game/systems/CameraEffects';
import type { PlayerSettings } from '@/types/profileTypes';

/**
 * Оркестратор визуальной полировки - координирует все эффекты
 */
export class PolishOrchestrator {
  private scene: Phaser.Scene;
  private particleManager: ParticleManager;
  private soundManager: SoundManager;
  private cameraEffects: CameraEffects;
  private settings: PlayerSettings;

  constructor(
    scene: Phaser.Scene,
    particleManager: ParticleManager,
    soundManager: SoundManager,
    cameraEffects: CameraEffects,
    settings: PlayerSettings
  ) {
    this.scene = scene;
    this.particleManager = particleManager;
    this.soundManager = soundManager;
    this.cameraEffects = cameraEffects;
    this.settings = settings;
  }

  /**
   * Обрабатывает попадание по врагу
   */
  handleEnemyHit(x: number, y: number, projectileType: string): void {
    switch (projectileType) {
      case 'bullet':
        this.particleManager.createHit(x, y);
        this.soundManager.playSound('hit');
        break;
      case 'rocket':
        this.particleManager.createExplosion(x, y);
        this.cameraEffects.shakeExplosion();
        this.soundManager.playSound('explosion');
        break;
      case 'instant':
        this.particleManager.createMagic(x, y);
        this.soundManager.playSound('ice_hit');
        break;
    }
  }

  /**
   * Обрабатывает смерть врага
   */
  handleEnemyDeath(x: number, y: number, bounty: number): void {
    this.particleManager.createExplosion(x, y);
    this.particleManager.createCoinEffect(x, y, bounty);
    this.soundManager.playSound('enemy_death');
    this.cameraEffects.shake(0.005, 150);
  }

  /**
   * Обрабатывает постройку башни
   */
  handleTowerBuilt(x: number, y: number): void {
    this.particleManager.createStars(x, y);
    this.cameraEffects.shake(0.003, 100);
    this.soundManager.playSound('build');
  }

  /**
   * Обрабатывает улучшение башни
   */
  handleTowerUpgrade(x: number, y: number): void {
    this.particleManager.createMagic(x, y);
    this.cameraEffects.shake(0.005, 200);
    this.soundManager.playSound('upgrade');
  }

  /**
   * Обрабатывает завершение волны
   */
  handleWaveComplete(reward: number): void {
    this.particleManager.createCoinEffect(400, 100, reward);
    this.particleManager.createStars(400, 300);
    this.cameraEffects.flash(0x00ff00, 300);
    this.soundManager.playSound('wave_complete');
  }

  /**
   * Обрабатывает победу
   */
  handleVictory(score: number): void {
    this.cameraEffects.flash(0x00ff00, 1000);
    this.particleManager.createStars(400, 300);
    this.particleManager.createCoinEffect(400, 300, score);
    
    // Серия взрывов для эффекта
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 200, () => {
        this.particleManager.createExplosion(
          200 + Math.random() * 400,
          150 + Math.random() * 300
        );
      });
    }
    
    this.soundManager.playSound('victory');
  }

  /**
   * Обрабатывает поражение
   */
  handleDefeat(): void {
    this.cameraEffects.flash(0xff0000, 500);
    this.cameraEffects.shake(0.02, 500);
    this.soundManager.playSound('defeat');
  }

  /**
   * Обрабатывает разблокировку достижения
   */
  handleAchievementUnlock(reward: number): void {
    this.particleManager.createCoinEffect(400, 300, reward);
    this.particleManager.createStars(400, 300);
    this.cameraEffects.shake(0.01, 300);
    this.cameraEffects.flash(0xffff00, 500);
    this.soundManager.playSound('achievement');
  }

  /**
   * Обновляет настройки
   */
  updateSettings(settings: Partial<PlayerSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.soundManager.updateSettings(this.settings);
  }

  /**
   * Получает настройки
   */
  getSettings(): PlayerSettings {
    return this.settings;
  }
}

