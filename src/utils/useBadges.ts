import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { subscribeRealtime } from '@/realtime/socket';
import { getPendingMessageRequestCount, getUnreadMessageCount, getUnreadNotificationCount } from '@/api/endpoints';

const INTERVAL_MS = 45000;

// Sekme rozetleri: okunmamış bildirim / mesaj / bekleyen istek sayıları.
// Uygulama açıkken düzenli yoklanır; arka plana alınınca durur.
export function useBadges(enabled: boolean) {
  const [counts, setCounts] = useState({ notifications: 0, messages: 0, requests: 0 });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    // Ikincil veri: hata sessizce yok sayılır, rozetler eski değerinde kalır.
    const [n, m, r] = await Promise.allSettled([
      getUnreadNotificationCount(),
      getUnreadMessageCount(),
      getPendingMessageRequestCount(),
    ]);
    setCounts((prev) => ({
      notifications: n.status === 'fulfilled' ? n.value.count : prev.notifications,
      messages: m.status === 'fulfilled' ? m.value.count : prev.messages,
      requests: r.status === 'fulfilled' ? r.value.count : prev.requests,
    }));
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const start = () => {
      if (timer.current) clearInterval(timer.current);
      refresh();
      timer.current = setInterval(refresh, INTERVAL_MS);
    };
    start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    });
    // Anlık olaylar geldiğinde sayaçlar hemen tazelenir (yoklama yedek kalır).
    const unsubs = [
      subscribeRealtime('/user/queue/notifications', refresh),
      subscribeRealtime('/user/queue/messages', refresh),
      subscribeRealtime('/user/queue/message-requests', refresh),
    ];
    return () => {
      unsubs.forEach((fn) => fn());
      sub.remove();
      if (timer.current) clearInterval(timer.current);
    };
  }, [enabled, refresh]);

  return { ...counts, refresh };
}
