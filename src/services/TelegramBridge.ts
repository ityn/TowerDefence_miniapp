import type { TelegramIntegrationService } from './TelegramIntegrationService';
import type { PlayerProfileService } from './PlayerProfileService';
import type { PlayerProfile } from '@/types/profileTypes';
import { ShareType } from '@/types/profileTypes';

/**
 * Мост между игрой и Telegram Mini App - упрощает интеграцию
 */
export class TelegramBridge {
  private telegramService: TelegramIntegrationService;
  private profileService: PlayerProfileService;

  constructor(
    telegramService: TelegramIntegrationService,
    profileService: PlayerProfileService
  ) {
    this.telegramService = telegramService;
    this.profileService = profileService;
  }

  /**
   * Инициализирует Telegram окружение
   */
  async initialize(): Promise<{
    isTelegram: boolean;
    user: any;
    profile: PlayerProfile;
  }> {
    const isTelegram = this.telegramService.isTelegramAvailable();
    const user = this.telegramService.getUser();
    
    // Загружаем профиль
    const telegramProfile = await this.telegramService.loadProgress();
    if (telegramProfile) {
      // Восстанавливаем профиль из Telegram
      const currentProfile = this.profileService.getProfile();
      this.profileService.getProfile().coins = telegramProfile.coins;
      this.profileService.getProfile().totalScore = telegramProfile.totalScore;
      // ... синхронизируем остальные данные
    }

    const profile = this.profileService.getProfile();

    return {
      isTelegram,
      user,
      profile,
    };
  }

  /**
   * Сохраняет прогресс игры
   */
  async saveGameProgress(): Promise<boolean> {
    const profile = this.profileService.getProfile();
    
    // Сохраняем в оба места
    const telegramSaved = await this.telegramService.saveProgress(profile);
    const localSaved = await this.profileService.saveProfile();

    return telegramSaved || localSaved;
  }

  /**
   * Показывает диалог шаринга
   */
  shareGameResult(type: ShareType, params?: Record<string, any>): void {
    this.telegramService.shareLink(type, params);
  }

  /**
   * Выдает ежедневную награду
   */
  claimDailyReward(): { success: boolean; reward: number } {
    const reward = this.profileService.claimDailyReward();
    if (reward > 0) {
      this.saveGameProgress();
      return { success: true, reward };
    }
    return { success: false, reward: 0 };
  }

  /**
   * Показывает рекламу с наградой
   */
  async showRewardedAd(callback: (success: boolean) => void): Promise<void> {
    if (this.telegramService.isTelegramAvailable()) {
      const success = await this.telegramService.showRewardAd();
      if (success) {
        // Награда за просмотр рекламы
        this.profileService.addCoins(50);
        this.saveGameProgress();
      }
      callback(success);
    } else {
      // Fallback - просто выдаем награду
      this.profileService.addCoins(50);
      callback(true);
    }
  }

  /**
   * Показывает алерт
   */
  showAlert(message: string): void {
    this.telegramService.showAlert(message);
  }

  /**
   * Показывает подтверждение
   */
  showConfirm(message: string, callback: (confirmed: boolean) => void): void {
    this.telegramService.showConfirm(message, callback);
  }

  /**
   * Получает пользователя Telegram
   */
  getTelegramUser(): any {
    return this.telegramService.getUser();
  }

  /**
   * Проверяет доступность Telegram
   */
  isTelegramAvailable(): boolean {
    return this.telegramService.isTelegramAvailable();
  }
}

