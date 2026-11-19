// Gerçek zamanlı bağlantı: backend'in STOMP-over-WebSocket uç noktasına (/ws)
// TEK paylaşımlı bağlantı. Web'deki realtimeSocket.js'in karşılığı.
// - JWT, STOMP CONNECT başlığında taşınır; her (yeniden) bağlanmada taze token alınır.
// - Yeniden bağlanma üstel (1 sn -> 30 sn).
// - Uygulama arka plandayken bağlantı kapatılır, öne gelince açılır.
// Kaçırılan olaylar REST yoklamasıyla telafi edilir (bkz. useBadges, chat).
import { Client, ReconnectionTimeMode, type StompSubscription } from '@stomp/stompjs';
import { AppState } from 'react-native';
import Constants from 'expo-constants';

const API_BASE: string = (
  process.env.EXPO_PUBLIC_API_BASE ||
  (Constants.expoConfig?.extra?.apiBase as string | undefined) ||
  'https://api.sagliktan.com/api'
).replace(/\/$/, '');

// https://host/api -> wss://host/ws
const WS_URL: string =
  process.env.EXPO_PUBLIC_WS_URL || API_BASE.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws';

type Handler = (payload: unknown) => void;
type TokenProvider = () => Promise<string | null>;

let client: Client | null = null;
let tokenProvider: TokenProvider | null = null;
let connected = false;
const handlers = new Map<string, Set<Handler>>();
const subscriptions = new Map<string, StompSubscription>();
const statusListeners = new Set<(connected: boolean) => void>();
let appStateSub: { remove: () => void } | null = null;

function setConnected(value: boolean) {
  if (connected === value) return;
  connected = value;
  statusListeners.forEach((fn) => fn(value));
}

function subscribeOnBroker(destination: string) {
  if (!client?.connected || subscriptions.has(destination)) return;
  const sub = client.subscribe(destination, (message) => {
    let payload: unknown;
    try {
      payload = JSON.parse(message.body);
    } catch {
      return; // ayrıştırılamayan mesaj yok sayılır
    }
    handlers.get(destination)?.forEach((fn) => {
      try {
        fn(payload);
      } catch {
        // dinleyici hatası diğer dinleyicileri etkilemesin
      }
    });
  });
  subscriptions.set(destination, sub);
}

function createClient(): Client {
  const c = new Client({
    brokerURL: WS_URL,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
    heartbeatIncoming: 20000,
    heartbeatOutgoing: 20000,
    // React Native WebSocket uyumu
    forceBinaryWSFrames: true,
    appendMissingNULLonIncoming: true,
    onWebSocketClose: () => {
      subscriptions.clear();
      setConnected(false);
    },
    onDisconnect: () => {
      subscriptions.clear();
      setConnected(false);
    },
  });
  c.beforeConnect = async () => {
    const token = tokenProvider ? await tokenProvider() : null;
    if (token) c.connectHeaders = { Authorization: `Bearer ${token}` };
  };
  c.onConnect = () => {
    for (const destination of handlers.keys()) subscribeOnBroker(destination);
    setConnected(true);
  };
  return c;
}

// Bağlantıyı başlatır (oturum açıkken). provider: taze access token döner.
export function startRealtime(provider: TokenProvider) {
  tokenProvider = provider;
  if (!client) client = createClient();
  if (!client.active) client.activate();
  appStateSub?.remove();
  appStateSub = AppState.addEventListener('change', (state) => {
    if (!client) return;
    if (state === 'active') {
      if (!client.active) client.activate();
    } else if (client.active) {
      subscriptions.clear();
      setConnected(false);
      client.deactivate().catch(() => {
        // kapatma hatası önemsiz
      });
    }
  });
}

export function stopRealtime() {
  appStateSub?.remove();
  appStateSub = null;
  tokenProvider = null;
  subscriptions.clear();
  setConnected(false);
  const c = client;
  client = null;
  c?.deactivate().catch(() => {
    // kapatma hatası önemsiz
  });
}

// Bir hedefe (ör. /user/queue/notifications) abone olur; dönen fonksiyon aboneliği bırakır.
export function subscribeRealtime(destination: string, handler: Handler): () => void {
  let set = handlers.get(destination);
  if (!set) {
    set = new Set();
    handlers.set(destination, set);
  }
  set.add(handler);
  subscribeOnBroker(destination);
  return () => {
    const current = handlers.get(destination);
    if (!current) return;
    current.delete(handler);
    if (current.size === 0) {
      handlers.delete(destination);
      subscriptions.get(destination)?.unsubscribe();
      subscriptions.delete(destination);
    }
  };
}

export function onRealtimeStatus(listener: (connected: boolean) => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

export function isRealtimeConnected(): boolean {
  return connected;
}
