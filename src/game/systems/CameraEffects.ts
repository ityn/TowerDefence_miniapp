import * as Phaser from 'phaser';

/**
 * Система эффектов камеры (тряска, зум и т.д.)
 */
export class CameraEffects {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.CameraManager;
  private mainCamera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras;
    this.mainCamera = scene.cameras.main;
  }

  /**
   * Создает эффект тряски экрана
   */
  shake(intensity: number = 0.01, duration: number = 200): void {
    this.mainCamera.shake(duration, intensity);
  }

  /**
   * Создает эффект тряски при взрыве
   */
  shakeExplosion(): void {
    this.shake(0.015, 300);
  }

  /**
   * Создает эффект тряски при попадании
   */
  shakeHit(): void {
    this.shake(0.005, 100);
  }

  /**
   * Создает эффект зума к точке
   */
  zoomToPoint(x: number, y: number, zoom: number = 1.2, duration: number = 300): void {
    this.mainCamera.pan(x, y, duration);
    this.scene.tweens.add({
      targets: this.mainCamera,
      zoom: zoom,
      duration: duration / 2,
      yoyo: true,
      ease: 'Power2',
    });
  }

  /**
   * Создает эффект флеша (белая вспышка)
   */
  flash(color: number = 0xffffff, duration: number = 200): void {
    this.mainCamera.flash(duration, color);
  }

  /**
   * Создает эффект затемнения
   */
  fadeOut(duration: number = 500): Promise<void> {
    return new Promise((resolve) => {
      this.mainCamera.fadeOut(duration);
      this.scene.time.delayedCall(duration, () => resolve());
    });
  }

  /**
   * Создает эффект появления
   */
  fadeIn(duration: number = 500): Promise<void> {
    return new Promise((resolve) => {
      this.mainCamera.fadeIn(duration);
      this.scene.time.delayedCall(duration, () => resolve());
    });
  }
}

