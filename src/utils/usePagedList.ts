import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage, isAbortError } from '@/api/client';
import type { PageResponse } from '@/api/types';

// Sonsuz kaydırmalı sayfalı liste: ilk sayfa, sonraki sayfa, yenile.
// deps yalnızca ilkel değerler (id, sıralama...) içermeli; değişince liste baştan yüklenir.
export function usePagedList<T extends { id: number }>(
  fetchPage: (page: number, signal: AbortSignal) => Promise<PageResponse<T>>,
  deps: readonly (string | number | boolean | null)[],
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(0);
  const lastRef = useRef(true);
  const busyMoreRef = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const fetchRef = useRef(fetchPage);
  useEffect(() => {
    fetchRef.current = fetchPage;
  });
  const depsKey = JSON.stringify(deps);

  const loadFirst = useCallback(async (mode: 'initial' | 'refresh') => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetchRef.current(0, c.signal);
      if (c.signal.aborted) return;
      setItems(res.content);
      pageRef.current = 0;
      lastRef.current = res.last;
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
  }, []);

  useEffect(() => {
    // Veri yükleme: istek başlarken yükleniyor durumu senkron işaretlenir.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFirst('initial');
    const current = controller;
    return () => current.current?.abort();
  }, [loadFirst, depsKey]);

  const loadMore = useCallback(async () => {
    const c = controller.current;
    if (!c || busyMoreRef.current || lastRef.current || c.signal.aborted) return;
    busyMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetchRef.current(pageRef.current + 1, c.signal);
      if (c.signal.aborted) return;
      pageRef.current += 1;
      lastRef.current = res.last;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.content.filter((p) => !seen.has(p.id))];
      });
    } catch (err) {
      if (!isAbortError(err)) setError(errorMessage(err, 'Devamı yüklenemedi.'));
    } finally {
      busyMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  return {
    items,
    setItems,
    loading,
    refreshing,
    loadingMore,
    error,
    reload: () => loadFirst('initial'),
    refresh: () => loadFirst('refresh'),
    loadMore,
  };
}
