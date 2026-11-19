// Backend kurallarıyla uyumlu istemci doğrulaması (bkz. SagliktanWeb utils/validation.js).

export const LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 50,
  EMAIL_MAX: 254,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 100,
  TITLE_MAX: 255,
  CONTENT_MAX: 10000,
  COMMENT_MAX: 2000,
  BIO_MAX: 500,
} as const;

const TR_CHARS = /[çğıöşüÇĞİÖŞÜ]/;
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function emailError(value: string): string | null {
  const v = value.trim();
  if (!v) return 'E-posta adresini yaz.';
  if (/\s/.test(v)) return 'E-posta adresinde boşluk olamaz.';
  if (TR_CHARS.test(v)) return 'E-posta adresinde Türkçe karakter (ç, ğ, ı, ö, ş, ü) olamaz.';
  if (!v.includes('@')) return 'E-posta adresinde "@" işareti eksik görünüyor.';
  if (v.length > LIMITS.EMAIL_MAX) return 'E-posta adresi çok uzun.';
  if (!EMAIL_PATTERN.test(v) || v.includes('..')) return 'Geçerli bir e-posta adresi yaz (örn. ad@ornek.com).';
  return null;
}

export function nameError(value: string, noun: 'Ad' | 'Soyad'): string | null {
  const v = cleanText(value);
  if (!v) return `${noun} zorunlu.`;
  if (v.length < LIMITS.NAME_MIN) return `${noun} en az ${LIMITS.NAME_MIN} karakter olmalı.`;
  if (v.length > LIMITS.NAME_MAX) return `${noun} en fazla ${LIMITS.NAME_MAX} karakter olabilir.`;
  return null;
}

export function newPasswordError(value: string): string | null {
  if (!value) return 'Bir şifre belirle.';
  if (value.length < LIMITS.PASSWORD_MIN) return `Şifre en az ${LIMITS.PASSWORD_MIN} karakter olmalı.`;
  if (value.length > LIMITS.PASSWORD_MAX) return `Şifre en fazla ${LIMITS.PASSWORD_MAX} karakter olabilir.`;
  if (value !== value.trim()) return 'Şifrenin başında ya da sonunda boşluk var; yanlışlıkla eklendiyse sil.';
  return null;
}

export function confirmPasswordError(confirm: string, password: string): string | null {
  if (!confirm) return 'Şifreni bir kez daha yaz.';
  if (confirm !== password) return 'Şifreler aynı değil.';
  return null;
}
