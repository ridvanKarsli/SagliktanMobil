import Constants from 'expo-constants';

const DEFAULT_API = 'https://api.sagliktan.com/api';

// Üretimde yalnızca https/wss kabul edilir; geliştirmede (__DEV__) http serbest.
// Yanlış yapılandırma durumunda token'lar düz metin gitmesin diye varsayılana düşer.
function secureOrDefault(value: string | undefined, fallback: string, schemes: string[]): string {
  const v = (value ?? '').trim().replace(/\/$/, '');
  if (!v) return fallback;
  const ok = schemes.some((s) => v.startsWith(s));
  if (!ok && !__DEV__) return fallback;
  return v;
}

export const API_BASE: string = secureOrDefault(
  process.env.EXPO_PUBLIC_API_BASE || (Constants.expoConfig?.extra?.apiBase as string | undefined),
  DEFAULT_API,
  ['https://'],
);

export const WS_URL: string = secureOrDefault(
  process.env.EXPO_PUBLIC_WS_URL,
  API_BASE.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws',
  ['wss://'],
);

export const isHttps = (url: string) => url.startsWith('https://');

// Kriz anında yönlendirilen hat. Numara değişirse yalnızca burası güncellenir.
export const CRISIS_LINE_NAME = '112 Acil Çağrı Merkezi';
