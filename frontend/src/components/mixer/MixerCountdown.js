'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

export function MixerCountdown({ expiresAt, onExpire }) {
  const [remainingMs, setRemainingMs] = useState(() =>
    expiresAt ? Math.max(0, new Date(expiresAt).getTime() - Date.now()) : 0
  );

  useEffect(() => {
    if (!expiresAt) return undefined;

    const targetMs = new Date(expiresAt).getTime();

    const tick = () => {
      const diff = Math.max(0, targetMs - Date.now());
      setRemainingMs(diff);
      if (diff <= 0 && onExpire) {
        onExpire();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  return (
    <div className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 text-white">
      <Clock className="w-4 h-4 shrink-0" />
      <div className="text-left">
        <p className="text-[10px] uppercase tracking-wider text-brand-100 font-semibold leading-none">
          Window Closes In
        </p>
        <p className="text-sm font-mono font-bold tracking-wider mt-0.5">
          {formatRemaining(remainingMs)}
        </p>
      </div>
    </div>
  );
}

export default MixerCountdown;

