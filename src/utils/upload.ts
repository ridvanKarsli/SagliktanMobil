import * as ImagePicker from 'expo-image-picker';
import { ApiError } from '@/api/client';
import { isHttps } from '@/config';
import { requestPresignedUpload } from '@/api/endpoints';

export const MAX_PHOTOS = 6;
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export interface PickedPhoto {
  uri: string;
  mimeType: string;
}

// Galeriden en fazla `limit` fotoğraf seçtirir (sunucu jpeg/png/webp kabul eder).
export async function pickPhotos(limit: number): Promise<PickedPhoto[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new ApiError('Fotoğraf eklemek için galeri iznine ihtiyaç var. Ayarlardan izin verebilirsin.', 0);
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 0.8,
  });
  if (res.canceled) return [];
  return res.assets.map((a) => ({
    uri: a.uri,
    mimeType: a.mimeType && ALLOWED.includes(a.mimeType) ? a.mimeType : 'image/jpeg',
  }));
}

// Fotoğrafı presigned URL ile doğrudan depolamaya yükler, storage anahtarını döner.
export async function uploadPhoto(photo: PickedPhoto): Promise<string> {
  const blob = await (await fetch(photo.uri)).blob();
  if (blob.size > MAX_BYTES) throw new ApiError('Fotoğraf çok büyük (en fazla 8 MB).', 0);
  const presigned = await requestPresignedUpload(photo.mimeType);
  if (!isHttps(presigned.uploadUrl) && !__DEV__) throw new ApiError('Güvenli olmayan yükleme adresi reddedildi.', 0);
  const res = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': photo.mimeType },
    body: blob,
  });
  if (!res.ok) throw new ApiError('Fotoğraf yüklenemedi. Lütfen tekrar dene.', res.status);
  return presigned.storageKey;
}
