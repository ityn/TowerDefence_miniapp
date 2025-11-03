import * as Phaser from 'phaser';

/**
 * Универсальный пул объектов для оптимизации производительности
 */
export class ObjectPool<T extends Phaser.GameObjects.GameObject> {
  private scene: Phaser.Scene;
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private pool: T[] = [];
  private active: Set<T> = new Set();
  private config: { initial: number; max: number };

  constructor(
    scene: Phaser.Scene,
    createFn: () => T,
    resetFn: (obj: T) => void,
    config: { initial: number; max: number }
  ) {
    this.scene = scene;
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.config = config;

    // Предварительное создание объектов
    for (let i = 0; i < config.initial; i++) {
      const obj = this.createFn();
      obj.setActive(false);
      if ('setVisible' in obj && typeof obj.setVisible === 'function') {
        (obj as any).setVisible(false);
      }
      this.pool.push(obj);
    }
  }

  /**
   * Получает объект из пула
   */
  acquire(): T {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      // Создаем новый, если пул пуст
      obj = this.createFn();
    }

    this.active.add(obj);
    obj.setActive(true);
    if ('setVisible' in obj && typeof obj.setVisible === 'function') {
      (obj as any).setVisible(true);
    }

    return obj;
  }

  /**
   * Возвращает объект в пул
   */
  release(obj: T): void {
    if (!this.active.has(obj)) {
      return; // Уже в пуле
    }

    this.active.delete(obj);
    this.resetFn(obj);
    obj.setActive(false);
    if ('setVisible' in obj && typeof obj.setVisible === 'function') {
      (obj as any).setVisible(false);
    }

    // Ограничиваем размер пула
    if (this.pool.length < this.config.max) {
      this.pool.push(obj);
    } else {
      // Удаляем избыточные объекты
      obj.destroy();
    }
  }

  /**
   * Освобождает все активные объекты
   */
  releaseAll(): void {
    const activeCopy = Array.from(this.active);
    activeCopy.forEach(obj => this.release(obj));
  }

  /**
   * Получает количество активных объектов
   */
  getActiveCount(): number {
    return this.active.size;
  }

  /**
   * Получает количество объектов в пуле
   */
  getPoolSize(): number {
    return this.pool.length;
  }

  /**
   * Получает процент использования пула
   */
  getUtilization(): number {
    const total = this.pool.length + this.active.size;
    return total > 0 ? (this.active.size / total) * 100 : 0;
  }

  /**
   * Очищает пул
   */
  clear(): void {
    this.releaseAll();
    this.pool.forEach(obj => obj.destroy());
    this.pool = [];
    this.active.clear();
  }
}
