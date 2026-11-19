// Access token'ın bitişine kalan süre (ms); okunamazsa null.
export function msUntilExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
    return typeof json.exp === 'number' ? json.exp * 1000 - Date.now() : null;
  } catch {
    return null;
  }
}
