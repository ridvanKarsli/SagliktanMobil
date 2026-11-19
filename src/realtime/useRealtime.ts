import { useEffect, useRef } from 'react';
import { subscribeRealtime } from './socket';

// Bir STOMP hedefini dinler; bileşen kapanınca aboneliği bırakır.
export function useRealtime<T = unknown>(destination: string, handler: (payload: T) => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => subscribeRealtime(destination, (p) => ref.current(p as T)), [destination]);
}
