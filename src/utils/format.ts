// Web projesindeki utils/format.js'in karşılığı.

export function initialsFrom(name = ''): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toLocaleUpperCase('tr-TR');
  if (parts.length === 1) return ((parts[0][0] || '') + (parts[0][1] || '')).toLocaleUpperCase('tr-TR');
  return '?';
}

// Backend zaman damgalarını dilim bilgisi OLMADAN ve UTC'de üretir
// ("2026-10-03T09:00:00"); 'Z' eklenerek UTC olarak ayrıştırılır.
const HAS_ZONE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;
export function parseServerDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  const norm = String(value).replace(/(\.\d{3})\d+/, '$1');
  const dt =
    /^\d{4}-\d{2}-\d{2}T/.test(norm) && !HAS_ZONE.test(norm) ? new Date(norm + 'Z') : new Date(norm);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// "az önce", "5 dk", "3 sa", "2 gün", sonrası kısa tarih.
export function relativeTime(value: string | null | undefined, now: Date = new Date()): string {
  const dt = parseServerDate(value);
  if (!dt) return '';
  const diff = Math.max(0, (now.getTime() - dt.getTime()) / 1000);
  if (diff < 45) return 'az önce';
  if (diff < 3600) return `${Math.round(diff / 60)} dk`;
  if (diff < 86400) return `${Math.round(diff / 3600)} sa`;
  if (diff < 7 * 86400) return `${Math.round(diff / 86400)} gün`;
  const sameYear = dt.getFullYear() === now.getFullYear();
  return dt.toLocaleDateString(
    'tr-TR',
    sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' },
  );
}

export function formatCount(n: number | null | undefined): string {
  return new Intl.NumberFormat('tr-TR').format(n ?? 0);
}

export function fullNameOf(user: { firstName?: string; lastName?: string } | null | undefined): string {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Kullanıcı';
}
