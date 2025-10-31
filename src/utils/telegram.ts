/// <reference path="../types/telegram.d.ts" />

/**
 * Утилиты для работы с Telegram WebApp API
 */

import type { TelegramUser } from '@/types/telegram';

/**
 * Проверяет, запущено ли приложение в Telegram
 */
export const isTelegramWebApp = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp);
};

/**
 * Инициализирует Telegram WebApp
 */
export const initTelegramWebApp = (): void => {
  if (isTelegramWebApp()) {
    window.Telegram!.WebApp.ready();
    window.Telegram!.WebApp.expand();
  }
};

/**
 * Получает данные пользователя из Telegram
 */
export const getTelegramUser = (): TelegramUser | null => {
  if (!isTelegramWebApp()) {
    return null;
  }

  return window.Telegram!.WebApp.initDataUnsafe?.user || null;
};

/**
 * Показывает алерт через Telegram API или обычный alert
 */
export const showAlert = (message: string): void => {
  if (isTelegramWebApp()) {
    window.Telegram!.WebApp.showAlert(message);
  } else {
    alert(message);
  }
};

/**
 * Показывает подтверждение через Telegram API
 */
export const showConfirm = (
  message: string,
  callback?: (confirmed: boolean) => void
): void => {
  if (isTelegramWebApp()) {
    window.Telegram!.WebApp.showConfirm(message, callback);
  } else {
    const confirmed = confirm(message);
    if (callback) {
      callback(confirmed);
    }
  }
};

