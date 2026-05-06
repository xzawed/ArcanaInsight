"use client";

import { useEffect, useState } from "react";

interface ToastEvent {
  message: string;
  duration?: number;
}

const TOAST_EVENT = "arcana:toast";

export function showToast(message: string, duration = 2400): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastEvent>(TOAST_EVENT, { detail: { message, duration } }));
}

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastEvent>).detail;
      setMessage(detail.message);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), detail.duration ?? 2400);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => {
      window.removeEventListener(TOAST_EVENT, handler);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="toast"
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[110] px-4 py-2.5 bg-arcana-card border border-arcana-border rounded-lg shadow-xl text-sm text-arcana-text"
    >
      {message}
    </div>
  );
}
