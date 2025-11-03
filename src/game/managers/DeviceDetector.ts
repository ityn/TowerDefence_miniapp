/**
 * Детектор устройства для адаптивной оптимизации
 */
export class DeviceDetector {
  /**
   * Определяет профиль устройства
   */
  static detectDevice(): {
    type: 'low' | 'medium' | 'high';
    isMobile: boolean;
    features: {
      webgl: boolean;
      webgl2: boolean;
      wasm: boolean;
    };
  } {
    const isMobile = this.isMobile();
    const features = this.detectFeatures();
    const type = this.determineDeviceType(isMobile, features);

    return {
      type,
      isMobile,
      features,
    };
  }

  /**
   * Проверяет, мобильное ли устройство
   */
  private static isMobile(): boolean {
    if (typeof window === 'undefined') return false;

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    return mobileRegex.test(userAgent.toLowerCase());
  }

  /**
   * Определяет возможности устройства
   */
  private static detectFeatures(): {
    webgl: boolean;
    webgl2: boolean;
    wasm: boolean;
  } {
    const canvas = document.createElement('canvas');
    
    return {
      webgl: this.hasWebGL(canvas),
      webgl2: this.hasWebGL2(canvas),
      wasm: typeof WebAssembly !== 'undefined',
    };
  }

  /**
   * Проверяет поддержку WebGL
   */
  private static hasWebGL(canvas: HTMLCanvasElement): boolean {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  }

  /**
   * Проверяет поддержку WebGL2
   */
  private static hasWebGL2(canvas: HTMLCanvasElement): boolean {
    const gl = canvas.getContext('webgl2');
    return !!gl;
  }

  /**
   * Определяет тип устройства
   */
  private static determineDeviceType(
    isMobile: boolean,
    features: { webgl: boolean; webgl2: boolean; wasm: boolean }
  ): 'low' | 'medium' | 'high' {
    // Мобильные устройства по умолчанию medium или low
    if (isMobile) {
      // Проверяем характеристики
      const cores = (navigator as any).hardwareConcurrency || 2;
      const memory = (performance as any).memory?.jsHeapSizeLimit || 0;
      
      if (cores >= 4 && memory > 2000000000) {
        return 'medium';
      }
      return 'low';
    }

    // Desktop устройства
    if (features.webgl2 && features.wasm) {
      return 'high';
    } else if (features.webgl) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Получает рекомендуемую конфигурацию производительности
   */
  static getRecommendedConfig(deviceType: 'low' | 'medium' | 'high') {
    const baseConfig = {
      objectPooling: {
        enemies: { initial: 50, max: 100 },
        projectiles: { initial: 30, max: 60 },
        particles: { initial: 100, max: 200 },
        effects: { initial: 20, max: 40 },
      },
      memoryManagement: {
        autoCleanup: true,
        gcInterval: 30000,
        textureAtlas: true,
        maxCacheSize: 100,
      },
      mobileOptimization: {
        maxFPS: 60,
        textureCompression: true,
        reducedEffects: false,
        adaptiveQuality: true,
      },
      rendering: {
        batchSprites: true,
        maxDrawCalls: 100,
        enableCulling: true,
      },
    };

    switch (deviceType) {
      case 'low':
        return {
          ...baseConfig,
          objectPooling: {
            enemies: { initial: 30, max: 50 },
            projectiles: { initial: 20, max: 40 },
            particles: { initial: 50, max: 100 },
            effects: { initial: 10, max: 20 },
          },
          mobileOptimization: {
            ...baseConfig.mobileOptimization,
            maxFPS: 30,
            reducedEffects: true,
          },
          memoryManagement: {
            ...baseConfig.memoryManagement,
            gcInterval: 20000,
            maxCacheSize: 50,
          },
        };

      case 'medium':
        return {
          ...baseConfig,
          mobileOptimization: {
            ...baseConfig.mobileOptimization,
            maxFPS: 45,
          },
        };

      case 'high':
        return baseConfig;
    }
  }
}

