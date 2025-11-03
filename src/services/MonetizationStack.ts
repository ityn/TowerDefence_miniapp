import type { StarsProduct, TowerSkin, GameBoost, BattlePass, BattlePassProgress, Purchase } from '@/types/monetizationTypes';
import { TelegramIntegrationService } from './TelegramIntegrationService';
import { PlayerProfileService } from './PlayerProfileService';

/**
 * Стек монетизации - обработка покупок, магазин, Battle Pass
 */
export class MonetizationStack {
  private telegramService: TelegramIntegrationService;
  private profileService: PlayerProfileService;
  private products: Map<string, StarsProduct> = new Map();
  private towerSkins: Map<string, TowerSkin> = new Map();
  private battlePass: BattlePass | null = null;

  constructor(
    telegramService: TelegramIntegrationService,
    profileService: PlayerProfileService
  ) {
    this.telegramService = telegramService;
    this.profileService = profileService;
    this.loadProducts();
  }

  /**
   * Загружает продукты из конфига
   */
  private async loadProducts(): Promise<void> {
    try {
      const response = await fetch('/data/monetization-config.json');
      if (!response.ok) return;

      const config = await response.json();

      // Загружаем продукты
      if (config.products) {
        Object.values(config.products).forEach((product: any) => {
          this.products.set(product.id, product as StarsProduct);
        });
      }

      // Загружаем скины
      if (config.towerSkins) {
        Object.values(config.towerSkins).forEach((skin: any) => {
          this.towerSkins.set(skin.id, skin as TowerSkin);
        });
      }

      // Загружаем Battle Pass
      if (config.battlePass) {
        this.battlePass = this.createBattlePass(config.battlePass);
      }
    } catch (error) {
      console.error('Error loading monetization config:', error);
    }
  }

  /**
   * Создает Battle Pass
   */
  private createBattlePass(config: any): BattlePass {
    const profile = this.profileService.getProfile();
    const progress = this.getBattlePassProgress();

    return {
      id: `pass_${Date.now()}`,
      season: config.currentSeason,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      levels: config.levels,
      currentLevel: progress.currentLevel,
      currentXP: progress.currentXP,
      premiumUnlocked: progress.premiumUnlocked,
    };
  }

  /**
   * Покупает продукт за Stars
   */
  async purchaseProduct(productId: string): Promise<Purchase | null> {
    const product = this.products.get(productId);
    if (!product) {
      return null;
    }

    // Проверяем доступность Stars через Telegram
    if (!this.telegramService.isTelegramAvailable()) {
      // Fallback - просто выдаем награду
      this.processPurchase(product);
      const purchase: Purchase = {
        id: `purchase_${Date.now()}`,
        userId: this.profileService.getProfile().userId,
        productId,
        starsSpent: product.starsPrice,
        timestamp: Date.now(),
        status: 'completed',
      };
      return purchase;
    }

    // В реальной системе здесь будет вызов Telegram Stars API
    // Пока используем заглушку
    const purchase: Purchase = {
      id: `purchase_${Date.now()}`,
      userId: this.profileService.getProfile().userId,
      productId,
      starsSpent: product.starsPrice,
      timestamp: Date.now(),
      status: 'pending',
    };

    // Симулируем покупку
    const success = await this.simulateStarsPurchase(product.starsPrice);
    
    if (success) {
      purchase.status = 'completed';
      this.processPurchase(product);
      await this.savePurchase(purchase);
    } else {
      purchase.status = 'failed';
    }

    return purchase;
  }

  /**
   * Симулирует покупку через Telegram Stars API
   */
  private async simulateStarsPurchase(stars: number): Promise<boolean> {
    // В реальной системе:
    // return await this.telegramService.webApp?.openInvoice(...)
    return true; // Заглушка
  }

  /**
   * Обрабатывает покупку
   */
  private processPurchase(product: StarsProduct): void {
    switch (product.type) {
      case 'coins':
        this.profileService.addCoins(product.value as number);
        break;
      case 'skin':
        this.unlockSkin(product.value as string);
        break;
      case 'remove_ads':
        // Флаг удаления рекламы в настройках
        const settings = this.profileService.getSettings();
        (settings as any).adsRemoved = true;
        this.profileService.updateSettings(settings);
        break;
    }
  }

  /**
   * Разблокирует скин
   */
  private unlockSkin(skinId: string): void {
    const profile = this.profileService.getProfile();
    const ownedSkins = (profile as any).ownedSkins || [];
    
    if (!ownedSkins.includes(skinId)) {
      ownedSkins.push(skinId);
      (profile as any).ownedSkins = ownedSkins;
      this.profileService.saveProfile();
    }
  }

  /**
   * Покупает премиум Battle Pass
   */
  async purchaseBattlePass(): Promise<boolean> {
    if (!this.battlePass) return false;

    const price = 100; // Из конфига

    const success = await this.simulateStarsPurchase(price);
    if (success) {
      this.battlePass.premiumUnlocked = true;
      const progress = this.getBattlePassProgress();
      progress.premiumUnlocked = true;
      this.updateBattlePassProgress(progress);
      return true;
    }

    return false;
  }

  /**
   * Начисляет XP для Battle Pass
   */
  addBattlePassXP(amount: number): void {
    if (!this.battlePass) return;

    const progress = this.getBattlePassProgress();
    progress.currentXP += amount;

    // Проверяем повышение уровня
    while (this.canLevelUp(progress)) {
      this.levelUpBattlePass(progress);
    }

    this.updateBattlePassProgress(progress);
  }

  /**
   * Проверяет возможность повышения уровня
   */
  private canLevelUp(progress: BattlePassProgress): boolean {
    if (!this.battlePass) return false;

    const currentLevel = this.battlePass.levels[progress.currentLevel];
    if (!currentLevel) return false;

    return progress.currentXP >= currentLevel.requiredXP &&
           progress.currentLevel < this.battlePass.levels.length - 1;
  }

  /**
   * Повышает уровень Battle Pass
   */
  private levelUpBattlePass(progress: BattlePassProgress): void {
    if (!this.battlePass) return;

    progress.currentLevel++;
    progress.currentXP = 0;

    // Выдаем награды
    const level = this.battlePass.levels[progress.currentLevel];
    if (level) {
      // Бесплатные награды
      level.freeRewards.forEach(reward => {
        this.claimReward(reward);
      });

      // Премиум награды
      if (progress.premiumUnlocked) {
        level.premiumRewards.forEach(reward => {
          this.claimReward(reward);
        });
      }
    }

    progress.claimedLevels.push(progress.currentLevel);
  }

  /**
   * Выдает награду
   */
  private claimReward(reward: any): void {
    switch (reward.type) {
      case 'coins':
        this.profileService.addCoins(reward.value);
        break;
      case 'skin':
        this.unlockSkin(reward.value);
        break;
      case 'stars':
        // В реальной системе начисляются Stars
        console.log(`Earned ${reward.value} Stars`);
        break;
    }
  }

  /**
   * Получает доступные продукты
   */
  getAvailableProducts(): StarsProduct[] {
    return Array.from(this.products.values());
  }

  /**
   * Получает доступные скины
   */
  getAvailableSkins(): TowerSkin[] {
    return Array.from(this.towerSkins.values());
  }

  /**
   * Получает текущий Battle Pass
   */
  getBattlePass(): BattlePass | null {
    return this.battlePass;
  }

  /**
   * Получает прогресс Battle Pass
   */
  getBattlePassProgress(): BattlePassProgress {
    const profile = this.profileService.getProfile();
    const stored = (profile as any).battlePass;
    
    if (stored) {
      return stored;
    }

    return {
      passId: this.battlePass?.id || '',
      currentLevel: 0,
      currentXP: 0,
      claimedLevels: [],
      premiumUnlocked: false,
    };
  }

  /**
   * Обновляет прогресс Battle Pass
   */
  private updateBattlePassProgress(progress: BattlePassProgress): void {
    const profile = this.profileService.getProfile();
    (profile as any).battlePass = progress;
    this.profileService.saveProfile();
  }

  /**
   * Сохраняет покупку
   */
  private async savePurchase(purchase: Purchase): Promise<void> {
    const purchases = this.getPurchases();
    purchases.push(purchase);
    localStorage.setItem('td_purchases', JSON.stringify(purchases));
  }

  /**
   * Получает покупки
   */
  private getPurchases(): Purchase[] {
    const stored = localStorage.getItem('td_purchases');
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  }
}

