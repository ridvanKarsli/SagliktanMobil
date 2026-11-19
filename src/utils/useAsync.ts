import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage, isAbortError } from '@/api/client';

// Basit veri yükleme kancası: yükle, hata, yenile. deps değişince (ya da
// bileşen kapanınca) eski istek iptal edilir. deps yalnızca ilkel değerler
// (id, arama metni...) içermeli.
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: readonly (string | number | boolean | null)[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  const depsKey = JSON.stringify(deps);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      controller.current?.abort();
      const c = new AbortController();
      controller.current = c;
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      try {
        const result = await fnRef.current(c.signal);
        if (c.signal.aborted) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (isAbortError(err) || c.signal.aborted) return;
        setError(errorMessage(err, 'Yüklenemedi.'));
      } finally {
        if (!c.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    // Veri yükleme: istek başlarken yükleniyor durumu senkron işaretlenir.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load('initial');
    const current = controller;
    return () => current.current?.abort();
  }, [load, depsKey]);

  return {
    data,
    setData,
    error,
    loading,
    refreshing,
    reload: () => load('initial'),
    refresh: () => load('refresh'),
  };
}
