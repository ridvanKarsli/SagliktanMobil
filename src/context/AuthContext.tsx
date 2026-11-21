import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { ApiError, setAuthBridge } from '@/api/client';
import { getMe, loginUser, logoutUser, refreshTokens, registerUser } from '@/api/endpoints';
import type { RegisterInput, User } from '@/api/types';
import { startRealtime, stopRealtime } from '@/realtime/socket';
import { msUntilExpiry } from '@/utils/jwt';

const STORE_KEY = 'sagliktan.auth';

type StoredAuth = { accessToken: string; refreshToken: string };

async function readStored(): Promise<StoredAuth | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

async function writeStored(value: StoredAuth | null): Promise<void> {
  try {
    if (value) await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(value), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    else await SecureStore.deleteItemAsync(STORE_KEY);
  } catch {
    // Güvenli depolama kullanılamıyorsa oturum yalnızca bellekte yaşar.
  }
}

interface AuthValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  // Sunucunun döndürdüğü güncel kullanıcıyı yerel duruma işler.
  applyServerUser: (user: User) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const tokensRef = useRef<StoredAuth | null>(null);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const clearSession = useCallback(async () => {
    tokensRef.current = null;
    await writeStored(null);
    setUser(null);
  }, []);

  const refresh = useCallback((): Promise<string | null> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const current = tokensRef.current;
    if (!current) return Promise.resolve(null);
    const run = (async () => {
      try {
        const next = await refreshTokens(current.refreshToken);
        tokensRef.current = { accessToken: next.accessToken, refreshToken: next.refreshToken };
        await writeStored(tokensRef.current);
        return next.accessToken;
      } catch (err) {
        // Sunucu yenilemeyi REDDETTİYSE (oturum sonlandırılmış, hesap pasif...)
        // yerelde de çıkış yap; ağ hatasında oturum korunur.
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await clearSession();
        }
        throw err;
      } finally {
        refreshInFlight.current = null;
      }
    })();
    refreshInFlight.current = run;
    return run;
  }, [clearSession]);

  useEffect(() => {
    setAuthBridge({ getAccessToken: () => tokensRef.current?.accessToken ?? null, refresh });
    return () => setAuthBridge(null);
  }, [refresh]);

  // Oturum açıkken gerçek zamanlı bağlantı; her (yeniden) bağlanmada taze token.
  const isAuthenticated = !!user;
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    startRealtime(async () => {
      const current = tokensRef.current?.accessToken ?? null;
      if (!current) return null;
      const left = msUntilExpiry(current);
      if (left !== null && left < 30000) {
        try {
          return await refresh();
        } catch {
          return null;
        }
      }
      return current;
    });
    return () => stopRealtime();
  }, [isAuthenticated, refresh]);

  // Açılışta kayıtlı oturumu geri yükle.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await readStored();
      if (!stored) {
        if (!cancelled) setLoading(false);
        return;
      }
      tokensRef.current = stored;
      try {
        const me = await getMe();
        if (!cancelled) setUser(me);
      } catch (err) {
        // Reddedilmediyse (ör. çevrimdışı) oturum saklı kalır; kullanıcı
        // yeniden giriş yapmak zorunda bırakılmaz ama profil yüklenemez.
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await clearSession();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await loginUser(email, password);
    tokensRef.current = { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    await writeStored(tokensRef.current);
    try {
      setUser(await getMe());
    } catch (err) {
      await clearSession();
      throw err;
    }
  }, [clearSession]);

  const register = useCallback((input: RegisterInput) => registerUser(input), []);

  const logout = useCallback(async () => {
    try {
      if (tokensRef.current) await logoutUser();
    } catch {
      // sunucu tarafı iptal best-effort
    }
    await clearSession();
  }, [clearSession]);

  const applyServerUser = useCallback((next: User) => setUser(next), []);

  const value = useMemo<AuthValue>(
    () => ({ user, loading, isAuthenticated: !!user, login, register, logout, applyServerUser }),
    [user, loading, login, register, logout, applyServerUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return ctx;
}
