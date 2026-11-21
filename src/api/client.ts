// SagliktanApi'ye ince fetch katmanı (web: SagliktanWeb/src/services/api.js).
// Token'ı AuthContext'ten alır; 401'de bir kez yenileyip isteği tekrarlar.

import { API_BASE } from '@/config';

const REQUEST_TIMEOUT_MS = 15000;
export const TIMEOUT_MESSAGE = 'Bağlantı yavaş görünüyor, tekrar dene.';
export const OFFLINE_MESSAGE = 'İnternet bağlantını kontrol edip tekrar dene.';

// Sunucu bir işlemi "sağlık verisi açık rızası yok" diye reddettiğinde
// dinleyenlere (ConsentGate) haber verir.
const consentListeners = new Set<() => void>();
export function onHealthConsentRequired(listener: () => void): () => void {
  consentListeners.add(listener);
  return () => {
    consentListeners.delete(listener);
  };
}
function notifyHealthConsentRequired() {
  consentListeners.forEach((l) => l());
}

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string> | null;
  retryAfterSeconds: number | null;

  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string> | null = null,
    retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// AuthContext kendini buraya bağlar (döngüsel import olmasın diye).
type AuthBridge = {
  getAccessToken: () => string | null;
  refresh: () => Promise<string | null>;
};
let bridge: AuthBridge | null = null;
export function setAuthBridge(next: AuthBridge | null) {
  bridge = next;
}

function friendlyFallbackMessage(status: number): string {
  if (status === 401 || status === 403) return 'Bu işlem için yetkin yok. Tekrar giriş yapmayı dene.';
  if (status === 404) return 'Aradığın şey bulunamadı.';
  if (status === 429) return 'Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar dene.';
  if (status >= 500) return 'Sunucuda bir sorun oluştu. Lütfen biraz sonra tekrar dene.';
  return 'İşlem tamamlanamadı. Lütfen tekrar dene.';
}

function rateLimitMessage(retryAfterSeconds: number | null): string {
  if (!retryAfterSeconds || retryAfterSeconds < 60) return 'Çok fazla deneme yaptın, biraz bekleyip tekrar dene.';
  return `Çok fazla deneme yaptın, yaklaşık ${Math.ceil(retryAfterSeconds / 60)} dakika sonra tekrar dene.`;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
  // false => Authorization başlığı eklenmez (giriş, kayıt...).
  auth?: boolean;
  signal?: AbortSignal;
}

export async function request<T = unknown>(
  path: string,
  { method = 'GET', body, params, auth = true, signal }: RequestOptions = {},
  retried = false,
): Promise<T> {
  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  let token: string | null = null;
  if (auth && bridge) {
    token = bridge.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let payload: string | undefined;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  // Zaman aşımı + çağıranın signal'i tek controller'da birleşir.
  const controller = new AbortController();
  const forward = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', forward, { once: true });
  }
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  let res: Response;
  let text: string;
  try {
    res = await fetch(url, { method, headers, body: payload, signal: controller.signal });
    text = res.status === 204 ? '' : await res.text();
  } catch (err) {
    if (timedOut) throw new ApiError(TIMEOUT_MESSAGE, 0);
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new ApiError(OFFLINE_MESSAGE, 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forward);
  }

  // Access token süresi dolduysa bir kez yenileyip tekrar dene.
  if (res.status === 401 && auth && token && !retried && bridge) {
    try {
      const fresh = await bridge.refresh();
      if (fresh) return request<T>(path, { method, body, params, auth, signal }, true);
    } catch {
      // yenileme başarısız; aşağıda normal 401 hatası fırlatılır
    }
  }

  if (res.status === 204) return null as T;
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const fieldErrors: Record<string, string> | null = data?.fieldErrors ?? null;
    const specific = fieldErrors && Object.keys(fieldErrors).length ? Object.values(fieldErrors).join(' ') : null;
    if (res.status === 429) {
      const raw = res.headers.get('Retry-After');
      const secs = raw ? Number(raw) : NaN;
      const retryAfter = Number.isFinite(secs) ? Math.max(0, Math.round(secs)) : null;
      throw new ApiError(rateLimitMessage(retryAfter), 429, null, retryAfter);
    }
    if (res.status === 403 && typeof data?.message === 'string' && /sağlık verisi işleme rızası/i.test(data.message)) {
      notifyHealthConsentRequired();
      throw new ApiError('Bu işlem için sağlık bilgilerinin işlenmesine izin vermen gerekiyor.', 403);
    }
    throw new ApiError(specific || data?.message || friendlyFallbackMessage(res.status), res.status, fieldErrors);
  }
  return data as T;
}

export function isAbortError(err: unknown): boolean {
  return (err as Error)?.name === 'AbortError';
}

export function errorMessage(err: unknown, fallback = 'İşlem yapılamadı.'): string {
  return err instanceof ApiError || err instanceof Error ? err.message || fallback : fallback;
}
