import type { PlayerProfile } from '@/types/profileTypes';
import { ShareType } from '@/types/profileTypes';

/**
 * Сервис для интеграции с Telegram Mini App
 */
export class TelegramIntegrationService {
  private webApp: any = null;
  private isAvailable: boolean = false;
  private config: any = null;

  constructor() {
    this.init();
  }

  /**
   * Инициализирует Telegram WebApp
   */
  private init(): void {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      this.webApp = window.Telegram.WebApp;
      this.webApp.ready();
      this.webApp.expand();
      this.isAvailable = true;
      this.loadConfig();
    } else {
      console.log('Telegram WebApp not available, using fallback');
      this.isAvailable = false;
    }
  }

  /**
   * Загружает конфигурацию Telegram
   */
  private async loadConfig(): Promise<void> {
    try {
      const response = await fetch('/data/telegram-config.json');
      if (response.ok) {
        this.config = await response.json();
      }
    } catch (error) {
      console.error('Error loading Telegram config:', error);
    }
  }

  /**
   * Проверяет доступность Telegram WebApp
   */
  isTelegramAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Получает данные пользователя из Telegram
   */
  getUser(): any {
    if (!this.isAvailable || !this.webApp) return null;
    return this.webApp.initDataUnsafe?.user || null;
  }

  /**
   * Сохраняет прогресс в Cloud Storage (Telegram)
   */
  async saveProgress(profile: PlayerProfile): Promise<boolean> {
    if (!this.isAvailable || !this.webApp) {
      // Fallback на LocalStorage
      return this.saveToLocalStorage(profile);
    }

    try {
      // Используем Telegram Cloud Storage
      const key = this.config?.storageKey || 'td_progress';
      const data = JSON.stringify(profile);
      
      // Telegram Cloud Storage API
      if (this.webApp.CloudStorage) {
        await this.webApp.CloudStorage.setItem(key, data);
        return true;
      } else {
        // Fallback
        return this.saveToLocalStorage(profile);
      }
    } catch (error) {
      console.error('Error saving to Telegram Cloud:', error);
      return this.saveToLocalStorage(profile);
    }
  }

  /**
   * Загружает прогресс из Cloud Storage
   */
  async loadProgress(): Promise<PlayerProfile | null> {
    if (!this.isAvailable || !this.webApp) {
      return this.loadFromLocalStorage();
    }

    try {
      const key = this.config?.storageKey || 'td_progress';
      
      if (this.webApp.CloudStorage) {
        const data = await this.webApp.CloudStorage.getItem(key);
        if (data) {
          return JSON.parse(data) as PlayerProfile;
        }
      }
    } catch (error) {
      console.error('Error loading from Telegram Cloud:', error);
    }

    return this.loadFromLocalStorage();
  }

  /**
   * Fallback: сохранение в LocalStorage
   */
  private saveToLocalStorage(profile: PlayerProfile): boolean {
    try {
      localStorage.setItem('td_player_profile', JSON.stringify(profile));
      return true;
    } catch (error) {
      console.error('Error saving to LocalStorage:', error);
      return false;
    }
  }

  /**
   * Fallback: загрузка из LocalStorage
   */
  private loadFromLocalStorage(): PlayerProfile | null {
    try {
      const data = localStorage.getItem('td_player_profile');
      if (data) {
        return JSON.parse(data) as PlayerProfile;
      }
    } catch (error) {
      console.error('Error loading from LocalStorage:', error);
    }
    return null;
  }

  /**
   * Показывает диалог шаринга
   */
  shareLink(type: ShareType, params?: Record<string, any>): void {
    if (!this.isAvailable || !this.webApp) {
      // Fallback - копируем в буфер обмена
      this.shareFallback(type, params);
      return;
    }

    const messages = this.config?.shareMessages || {};
    let message = messages[type] || '';

    // Заменяем плейсхолдеры
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        message = message.replace(`{${key}}`, String(value));
      });
    }

    // Генерируем реферальный код
    const referralCode = this.generateReferralCode();
    
    // Используем Telegram Share API
    if (this.webApp.shareUrl) {
      const url = this.getShareUrl(type, referralCode, params);
      this.webApp.openLink(url);
    } else {
      this.shareFallback(type, params);
    }
  }

  /**
   * Fallback для шаринга
   */
  private shareFallback(type: ShareType, params?: Record<string, any>): void {
    const messages = this.config?.shareMessages || {};
    let message = messages[type] || '';

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        message = message.replace(`{${key}}`, String(value));
      });
    }

    // Пытаемся использовать Web Share API
    if (navigator.share) {
      navigator.share({
        title: 'Tower Defence',
        text: message,
      }).catch(() => {
        this.copyToClipboard(message);
      });
    } else {
      this.copyToClipboard(message);
    }
  }

  /**
   * Копирует текст в буфер обмена
   */
  private copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        if (this.webApp) {
          this.webApp.showAlert('Ссылка скопирована!');
        } else {
          alert('Ссылка скопирована!');
        }
      });
    }
  }

  /**
   * Генерирует реферальный код
   */
  private generateReferralCode(): string {
    const user = this.getUser();
    if (user?.id) {
      return `REF_${user.id}`;
    }
    return `REF_${Date.now()}`;
  }

  /**
   * Генерирует URL для шаринга
   */
  private getShareUrl(type: ShareType, referralCode: string, params?: Record<string, any>): string {
    const baseUrl = window.location.origin;
    const queryParams = new URLSearchParams({
      ref: referralCode,
      type: type,
    });

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        queryParams.append(key, String(value));
      });
    }

    return `${baseUrl}?${queryParams.toString()}`;
  }

  /**
   * Показывает рекламу с наградой
   */
  async showRewardAd(): Promise<boolean> {
    if (!this.isAvailable || !this.webApp) {
      return false;
    }

    // Telegram Rewarded Ads API
    if (this.webApp.showRewardAd) {
      try {
        const result = await this.webApp.showRewardAd();
        return result === true;
      } catch (error) {
        console.error('Error showing reward ad:', error);
        return false;
      }
    }

    return false;
  }

  /**
   * Показывает алерт через Telegram
   */
  showAlert(message: string): void {
    if (this.isAvailable && this.webApp) {
      this.webApp.showAlert(message);
    } else {
      alert(message);
    }
  }

  /**
   * Показывает подтверждение
   */
  showConfirm(message: string, callback: (confirmed: boolean) => void): void {
    if (this.isAvailable && this.webApp) {
      this.webApp.showConfirm(message, callback);
    } else {
      const confirmed = confirm(message);
      callback(confirmed);
    }
  }

  /**
   * Получает реферальный код из URL
   */
  getReferralCode(): string | null {
    if (typeof window === 'undefined') return null;
    
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
  }

  /**
   * Применяет реферальный бонус
   */
  async applyReferralBonus(code: string): Promise<number> {
    const bonus = this.config?.bonuses?.referral_bonus || 50;
    // Здесь можно добавить проверку, был ли уже использован этот код
    // Пока просто возвращаем бонус
    return bonus;
  }
}

