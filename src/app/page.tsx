'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import LoadingSpinner from '@/components/LoadingSpinner';
import { initTelegramWebApp, getTelegramUser, showAlert } from '@/utils/telegram';
import type { TelegramUser } from '@/types/telegram';

// Динамический импорт PhaserGame, чтобы избежать SSR
const PhaserGame = dynamic(() => import('@/components/PhaserGame'), {
  ssr: false,
  loading: () => <LoadingSpinner />
});

export default function Home(): JSX.Element {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    initTelegramWebApp();
    const tgUser = getTelegramUser();
    if (tgUser) {
      setUser(tgUser);
    }
    setIsReady(true);
  }, []);

  const handleTestAlert = (): void => {
    showAlert('Hello from TypeScript Tower Defense!');
  };

  if (!isReady) {
    return <LoadingSpinner />;
  }

  return (
    <main className="min-h-screen bg-gray-900">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-white text-center mb-4">
          Telegram Tower Defense
        </h1>
        
        {user && (
          <div className="text-center text-white mb-4">
            Welcome, {user.first_name}!
          </div>
        )}

        <PhaserGame />
        
        <div className="mt-4 text-center">
          <button 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
            onClick={handleTestAlert}
          >
            Test Telegram API
          </button>
        </div>
      </div>
    </main>
  );
}