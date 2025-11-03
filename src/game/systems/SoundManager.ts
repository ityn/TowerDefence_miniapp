import * as Phaser from 'phaser';
import type { PlayerSettings } from '@/types/profileTypes';

/**
 * Менеджер звуков и музыки
 */
export class SoundManager {
  private scene: Phaser.Scene;
  private sounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private music: Phaser.Sound.BaseSound | null = null;
  private settings: PlayerSettings;

  constructor(scene: Phaser.Scene, settings: PlayerSettings) {
    this.scene = scene;
    this.settings = settings;
  }

  /**
   * Загружает звуковые файлы
   */
  loadSounds(): void {
    // В будущем здесь будут реальные звуковые файлы
    // Пока используем заглушки
    
    // Создаем простые тональные звуки программно
    // В продакшене заменим на реальные файлы
  }

  /**
   * Воспроизводит звуковой эффект
   */
  playSound(key: string, volume: number = 1): void {
    if (!this.settings.soundEnabled) return;

    // В будущем здесь будет реальное воспроизведение звуков
    // Пока используем виброотклик для мобильных устройств
    this.playVibration(key);
  }

  /**
   * Воспроизводит вибрацию (для мобильных)
   */
  private playVibration(type: string): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const patterns: Record<string, number[]> = {
        hit: [10],
        explosion: [20, 10, 20],
        coin: [5, 5, 5],
        achievement: [30],
      };

      const pattern = patterns[type] || [10];
      (navigator as any).vibrate(pattern);
    }
  }

  /**
   * Воспроизводит фоновую музыку
   */
  playMusic(key: string, loop: boolean = true): void {
    if (!this.settings.musicEnabled) return;
    if (this.music) {
      this.music.stop();
    }

    // В будущем здесь будет реальное воспроизведение музыки
    // this.music = this.scene.sound.add(key, { loop, volume: this.settings.musicVolume });
    // this.music.play();
  }

  /**
   * Останавливает музыку
   */
  stopMusic(): void {
    if (this.music) {
      this.music.stop();
      this.music = null;
    }
  }

  /**
   * Обновляет настройки звука
   */
  updateSettings(settings: Partial<PlayerSettings>): void {
    this.settings = { ...this.settings, ...settings };

    if (this.music && 'setVolume' in this.music) {
      (this.music as any).setVolume(this.settings.musicVolume);
    }

    if (!this.settings.musicEnabled) {
      this.stopMusic();
    }
  }

  /**
   * Предзагрузка звуков для продакшена
   */
  preloadSounds(): void {
    // Загрузка звуков будет здесь
    // this.scene.load.audio('shot', 'sounds/shot.mp3');
    // this.scene.load.audio('explosion', 'sounds/explosion.mp3');
    // this.scene.load.audio('coin', 'sounds/coin.mp3');
    // this.scene.load.audio('achievement', 'sounds/achievement.mp3');
    // this.scene.load.audio('background_music', 'sounds/bg_music.mp3');
  }
}

