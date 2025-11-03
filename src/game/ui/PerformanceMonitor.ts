import * as Phaser from 'phaser';
import type { PerformanceMetrics } from '@/types/performanceTypes';
import { PerformanceManager } from '@/game/systems/PerformanceManager';

/**
 * UI монитор производительности (для отладки)
 */
export class PerformanceMonitor {
  private scene: Phaser.Scene;
  private performanceManager: PerformanceManager;
  private text!: Phaser.GameObjects.Text;
  private container!: Phaser.GameObjects.Container;
  private isVisible: boolean = false;

  constructor(scene: Phaser.Scene, performanceManager: PerformanceManager) {
    this.scene = scene;
    this.performanceManager = performanceManager;
    this.createUI();
    this.hide();
  }

  private createUI(): void {
    this.container = this.scene.add.container(10, 10);

    // Фон
    const bg = this.scene.add.rectangle(0, 0, 250, 150, 0x000000, 0.7);
    bg.setOrigin(0);
    this.container.add(bg);

    // Текст метрик
    this.text = this.scene.add.text(10, 10, '', {
      fontSize: '12px',
      color: '#00ff00',
      fontFamily: 'monospace',
    });
    this.text.setOrigin(0);
    this.container.add(this.text);
  }

  /**
   * Обновляет отображение метрик
   */
  update(): void {
    if (!this.isVisible) return;

    const metrics = this.performanceManager.getMetrics();
    const config = this.performanceManager.getConfig();

    const info = [
      `FPS: ${metrics.fps.toFixed(1)}`,
      `Frame: ${metrics.frameTime.toFixed(2)}ms`,
      `Memory: ${metrics.memoryUsage.toFixed(2)}MB`,
      '',
      `Enemies: ${metrics.activeObjects.enemies} (${metrics.poolUtilization.enemies.toFixed(0)}%)`,
      `Projectiles: ${metrics.activeObjects.projectiles} (${metrics.poolUtilization.projectiles.toFixed(0)}%)`,
      '',
      `Mobile: ${this.performanceManager.isMobileDevice() ? 'Yes' : 'No'}`,
      `Reduced FX: ${config.mobileOptimization.reducedEffects ? 'Yes' : 'No'}`,
    ].join('\n');

    this.text.setText(info);
  }

  /**
   * Показывает монитор
   */
  show(): void {
    this.isVisible = true;
    this.container.setVisible(true);
  }

  /**
   * Скрывает монитор
   */
  hide(): void {
    this.isVisible = false;
    this.container.setVisible(false);
  }

  /**
   * Переключает видимость
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}

