"use client";

import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";

export default function Home() {
  const [userName, setUserName] = useState<string>("Пользователь");

  useEffect(() => {
    // Инициализируем Telegram WebApp
    WebApp.ready();

    // Получаем данные пользователя из initDataUnsafe
    if (WebApp.initDataUnsafe?.user?.first_name) {
      setUserName(WebApp.initDataUnsafe.user.first_name);
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Привет, {userName}!
        </h1>
      </div>
    </main>
  );
}

