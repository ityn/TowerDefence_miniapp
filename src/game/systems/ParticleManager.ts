import * as Phaser from 'phaser';

/**
 * Менеджер частиц для визуальных эффектов
 */
export class ParticleManager {
  private scene: Phaser.Scene;
  private emitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initParticleSystems();
  }

  /**
   * Инициализирует системы частиц
   */
  private initParticleSystems(): void {
    // Создаем простую текстуру для частиц
    this.createParticleTexture();
    
    // Взрыв
    this.createExplosionSystem();
    
    // Звезды (для монет и наград)
    this.createStarSystem();
    
    // Дым (для ракет)
    this.createSmokeSystem();
    
    // Магия (для ледяных эффектов)
    this.createMagicSystem();
  }

  /**
   * Создает текстуру для частиц
   */
  private createParticleTexture(): void {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(0, 0, 4);
    graphics.generateTexture('particle', 8, 8);
    graphics.destroy();
  }

  /**
   * Создает систему взрывов
   */
  private createExplosionSystem(): void {
    const particles = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 50, max: 200 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      tint: [0xff6600, 0xff0000, 0xffff00],
      blendMode: 'ADD',
    });

    particles.setVisible(false);
    this.emitters.set('explosion', particles);
  }

  /**
   * Создает систему звезд
   */
  private createStarSystem(): void {
    const particles = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 30, max: 80 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      tint: [0xffff00, 0xffaa00],
      gravityY: 50,
      blendMode: 'ADD',
    });

    particles.setVisible(false);
    this.emitters.set('stars', particles);
  }

  /**
   * Создает систему дыма
   */
  private createSmokeSystem(): void {
    const particles = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 20, max: 60 },
      scale: { start: 0.3, end: 1.5 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 1000,
      tint: 0x333333,
      gravityY: -30,
    });

    particles.setVisible(false);
    this.emitters.set('smoke', particles);
  }

  /**
   * Создает систему магии
   */
  private createMagicSystem(): void {
    const particles = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 40, max: 100 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      tint: [0x00ffff, 0x0088ff],
      blendMode: 'ADD',
    });

    particles.setVisible(false);
    this.emitters.set('magic', particles);
  }

  /**
   * Создает эффект взрыва
   */
  createExplosion(x: number, y: number): void {
    const emitter = this.emitters.get('explosion');
    if (!emitter) return;

    emitter.setPosition(x, y);
    emitter.explode(20);
  }

  /**
   * Создает эффект звезд (для наград)
   */
  createStars(x: number, y: number): void {
    const emitter = this.emitters.get('stars');
    if (!emitter) return;

    emitter.setPosition(x, y);
    emitter.explode(15);
  }

  /**
   * Создает эффект дыма
   */
  createSmoke(x: number, y: number): void {
    const emitter = this.emitters.get('smoke');
    if (!emitter) return;

    emitter.setPosition(x, y);
    emitter.start();
    
    this.scene.time.delayedCall(500, () => {
      emitter.stop();
    });
  }

  /**
   * Создает эффект магии
   */
  createMagic(x: number, y: number): void {
    const emitter = this.emitters.get('magic');
    if (!emitter) return;

    emitter.setPosition(x, y);
    emitter.explode(10);
  }

  /**
   * Создает эффект попадания пули
   */
  createHit(x: number, y: number): void {
    // Используем простой график для попадания
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(x, y, 5);

    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 200,
      onComplete: () => graphics.destroy(),
    });
  }

  /**
   * Создает эффект получения монет
   */
  createCoinEffect(x: number, y: number, amount: number): void {
    // Текстовый эффект
    const text = this.scene.add.text(x, y, `+${amount}`, {
      fontSize: '24px',
      color: '#ffff00',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      scale: 1.5,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });

    // Частицы
    this.createStars(x, y);
  }

  /**
   * Очищает все эмиттеры
   */
  destroy(): void {
    this.emitters.forEach(emitter => emitter.destroy());
    this.emitters.clear();
  }
}

