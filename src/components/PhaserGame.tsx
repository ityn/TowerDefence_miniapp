'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { gameConfig } from '@/game/config/gameConfig';

export default function PhaserGame(): JSX.Element {
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current && !gameInstance.current) {
      gameInstance.current = new Phaser.Game({
        ...gameConfig,
        parent: gameRef.current
      });
    }

    return () => {
      if (gameInstance.current) {
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="game-wrapper w-full flex justify-center">
      <div ref={gameRef} id="game-container" className="border-2 border-gray-700 rounded-lg overflow-hidden" />
    </div>
  );
}