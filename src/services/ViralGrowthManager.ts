import type { FriendHelp, HelpRequest, ReferralData, ViralActivity, ViralConfig } from '@/types/viralTypes';
import { HelpType } from '@/types/viralTypes';
import { TelegramIntegrationService } from './TelegramIntegrationService';
import { PlayerProfileService } from './PlayerProfileService';
import { ShareType } from '@/types/profileTypes';

/**
 * Менеджер вирусного роста - ядро виральных механик
 */
export class ViralGrowthManager {
  private telegramService: TelegramIntegrationService;
  private profileService: PlayerProfileService;
  private config: ViralConfig | null = null;
  private helpRequests: Map<string, HelpRequest> = new Map();
  private friendHelps: FriendHelp[] = [];

  constructor(
    telegramService: TelegramIntegrationService,
    profileService: PlayerProfileService
  ) {
    this.telegramService = telegramService;
    this.profileService = profileService;
    this.loadConfig();
  }

  /**
   * Загружает конфигурацию
   */
  private async loadConfig(): Promise<void> {
    try {
      const response = await fetch('/data/viral-config.json');
      if (response.ok) {
        this.config = await response.json();
      }
    } catch (error) {
      console.error('Error loading viral config:', error);
    }
  }

  /**
   * Отправляет запрос помощи друзьям
   */
  async requestHelp(helpType: HelpType, message?: string): Promise<HelpRequest | null> {
    if (!this.config) return null;

    const userId = this.profileService.getProfile().userId;
    const requestId = `help_${Date.now()}`;
    
    const request: HelpRequest = {
      requestId,
      requesterId: userId,
      requesterName: this.getUserName(),
      helpType,
      message: message || this.getDefaultHelpMessage(helpType),
      createdAt: Date.now(),
      expiresAt: Date.now() + (this.config.shareSettings.helpCooldown * 1000),
      fulfilledBy: [],
    };

    this.helpRequests.set(requestId, request);

    // Отправляем через Telegram Share
    this.telegramService.shareLink(ShareType.HELP_REQUEST, {
      requestId,
      helpType,
      message: request.message,
    });

    return request;
  }

  /**
   * Выполняет помощь от друга
   */
  async fulfillHelp(requestId: string, friendId: string, friendName: string): Promise<boolean> {
    const request = this.helpRequests.get(requestId);
    if (!request || request.expiresAt < Date.now()) {
      return false;
    }

    if (request.fulfilledBy?.includes(friendId)) {
      return false; // Уже помог
    }

    // Создаем помощь
    const help: FriendHelp = {
      friendId,
      friendName,
      helpType: request.helpType,
      used: false,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 часа
      value: this.getHelpValue(request.helpType),
    };

    this.friendHelps.push(help);

    // Награждаем друга за помощь
    const helperReward = this.config?.shareSettings.shareReward || 50;
    this.profileService.addCoins(helperReward);

    // Обновляем запрос
    if (!request.fulfilledBy) {
      request.fulfilledBy = [];
    }
    request.fulfilledBy.push(friendId);

    // Сохраняем
    await this.saveHelpData();

    return true;
  }

  /**
   * Использует помощь друга
   */
  useFriendHelp(helpId: string): any {
    const help = this.friendHelps.find(h => 
      !h.used && h.friendId === helpId && h.expiresAt > Date.now()
    );

    if (!help) return null;

    help.used = true;

    // Возвращаем эффект помощи
    switch (help.helpType) {
      case HelpType.FREEZE:
        return { type: 'freeze', duration: 10 };
      case HelpType.DAMAGE:
        return { type: 'damage', value: help.value || 50 };
      case HelpType.COINS:
        this.profileService.addCoins(help.value || 100);
        return { type: 'coins', value: help.value || 100 };
      case HelpType.SHIELD:
        return { type: 'shield', lives: 3 };
    }
  }

  /**
   * Обрабатывает реферальную ссылку
   */
  async processReferral(referralCode: string): Promise<number> {
    const userId = this.profileService.getProfile().userId;
    const referrerId = referralCode.replace('REF_', '');

    if (referrerId === userId) {
      return 0; // Нельзя использовать свой код
    }

    // Проверяем, не использовал ли уже
    const existing = this.getReferrals().find(r => r.refereeId === userId);
    if (existing) {
      return 0; // Уже использовал реферальный код
    }

    const referral: ReferralData = {
      referrerId,
      refereeId: userId,
      bonusCoins: this.config?.shareSettings.inviteBonus || 100,
      createdAt: Date.now(),
      claimed: false,
    };

    // Начисляем бонус новому пользователю
    this.profileService.addCoins(referral.bonusCoins);
    referral.claimed = true;

    // Начисляем бонус рефереру
    this.grantReferrerBonus(referrerId);

    await this.saveReferralData(referral);

    return referral.bonusCoins;
  }

  /**
   * Выдает бонус рефереру
   */
  private grantReferrerBonus(referrerId: string): void {
    // В реальной системе здесь будет запрос к серверу
    // Пока просто логируем
    console.log(`Granting referral bonus to ${referrerId}`);
  }

  /**
   * Делится результатом игры
   */
  shareResult(score: number, wave: number): void {
    this.telegramService.shareLink(ShareType.HIGH_SCORE, {
      score,
      wave,
    });

    // Награда за шаринг
    const shareReward = this.config?.shareSettings.shareReward || 50;
    this.profileService.addCoins(shareReward);
  }

  /**
   * Получает доступные помощи
   */
  getAvailableHelps(): FriendHelp[] {
    return this.friendHelps.filter(
      h => !h.used && h.expiresAt > Date.now()
    );
  }

  /**
   * Получает значение помощи
   */
  private getHelpValue(helpType: HelpType): number {
    const config = this.config?.helpTypes;
    if (!config) return 0;

    switch (helpType) {
      case HelpType.DAMAGE:
        return config.damage?.value || 50;
      case HelpType.COINS:
        return config.coins?.value || 100;
      default:
        return 0;
    }
  }

  /**
   * Получает сообщение по умолчанию
   */
  private getDefaultHelpMessage(helpType: HelpType): string {
    const messages: Record<HelpType, string> = {
      [HelpType.FREEZE]: 'Помоги заморозить врагов! ❄️',
      [HelpType.DAMAGE]: 'Нужна помощь! Нанеси урон врагам! 💥',
      [HelpType.COINS]: 'Дай немного монет, пожалуйста! 💰',
      [HelpType.SHIELD]: 'Защити меня! Нужен щит! 🛡️',
    };
    return messages[helpType] || 'Помоги мне в игре!';
  }

  /**
   * Получает имя пользователя
   */
  private getUserName(): string {
    const user = this.telegramService.getUser();
    return user?.first_name || 'Игрок';
  }

  /**
   * Получает рефералы
   */
  private getReferrals(): ReferralData[] {
    // В реальной системе загружаются из хранилища
    return [];
  }

  /**
   * Сохраняет данные о помощи
   */
  private async saveHelpData(): Promise<void> {
    // В реальной системе сохраняется на сервер
    localStorage.setItem('td_friend_helps', JSON.stringify(this.friendHelps));
  }

  /**
   * Сохраняет реферальные данные
   */
  private async saveReferralData(referral: ReferralData): Promise<void> {
    const referrals = this.getReferrals();
    referrals.push(referral);
    localStorage.setItem('td_referrals', JSON.stringify(referrals));
  }
}

