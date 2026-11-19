import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Banner, Button, Screen, TextField, Txt } from '@/components/ui';
import { errorMessage } from '@/api/client';
import { createPost } from '@/api/endpoints';
import type { PostType } from '@/api/types';
import { useTheme } from '@/theme/ThemeContext';
import { MAX_PHOTOS, pickPhotos, uploadPhoto, type PickedPhoto } from '@/utils/upload';
import { LIMITS } from '@/utils/validation';

const TYPES: { value: PostType; label: string }[] = [
  { value: 'DISCUSSION', label: 'Deneyim' },
  { value: 'QUESTION', label: 'Soru' },
  { value: 'POLL', label: 'Anket' },
];

export default function NewPostScreen() {
  const t = useTheme();
  const { subGroupId } = useLocalSearchParams<{ subGroupId: string }>();
  const [type, setType] = useState<PostType>('DISCUSSION');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);

  const submit = async () => {
    const pollOptions = options.map((o) => o.trim()).filter(Boolean);
    const next = {
      title: !title.trim() ? 'Başlık yaz.' : title.length > LIMITS.TITLE_MAX ? `Başlık en fazla ${LIMITS.TITLE_MAX} karakter olabilir.` : undefined,
      content: !content.trim() ? 'İçerik yaz.' : content.length > LIMITS.CONTENT_MAX ? `İçerik en fazla ${LIMITS.CONTENT_MAX} karakter olabilir.` : undefined,
      options: type === 'POLL' && pollOptions.length < 2 ? 'Anket için en az 2 seçenek yaz.' : undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setError(null);
    setLoading(true);
    try {
      const attachmentKeys = await Promise.all(photos.map(uploadPhoto));
      await createPost(Number(subGroupId), {
        title: title.trim(),
        content: content.trim(),
        postType: type,
        pollOptions: type === 'POLL' ? pollOptions : undefined,
        attachmentKeys: attachmentKeys.length ? attachmentKeys : undefined,
      });
      router.back();
    } catch (err) {
      setError(errorMessage(err, 'Gönderi paylaşılamadı.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAware edges={['left', 'right', 'bottom']}>
      <View style={{ gap: 16 }}>
        {error && <Banner tone="error" text={error} />}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {TYPES.map((x) => {
            const selected = type === x.value;
            return (
              <Pressable
                key={x.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setType(x.value)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 999,
                  backgroundColor: selected ? t.primary : t.surface,
                  borderWidth: 1,
                  borderColor: selected ? t.primary : t.borderStrong,
                }}
              >
                <Txt variant="small" color={selected ? t.onPrimary : t.ink} style={{ fontWeight: '700' }}>{x.label}</Txt>
              </Pressable>
            );
          })}
        </View>
        <TextField label="Başlık" value={title} onChangeText={setTitle} error={errors.title} maxLength={LIMITS.TITLE_MAX} />
        <TextField
          label="İçerik"
          value={content}
          onChangeText={setContent}
          error={errors.content}
          multiline
          textAlignVertical="top"
          maxLength={LIMITS.CONTENT_MAX}
          helper="Kişisel deneyimini paylaşıyorsun; bu içerik tıbbi tavsiye yerine geçmez."
        />
        {type === 'POLL' && (
          <View style={{ gap: 10 }}>
            <Txt variant="small" style={{ fontWeight: '700' }}>Seçenekler</Txt>
            {options.map((o, i) => (
              <TextField
                key={i}
                label={`Seçenek ${i + 1}`}
                value={o}
                maxLength={120}
                onChangeText={(v) => setOptions((prev) => prev.map((x, j) => (j === i ? v : x)))}
              />
            ))}
            {errors.options && <Txt variant="caption" color={t.rose}>{errors.options}</Txt>}
            {options.length < 6 && <Button title="Seçenek ekle" variant="ghost" icon="add" onPress={() => setOptions((p) => [...p, ''])} />}
          </View>
        )}
        <View style={{ gap: 10 }}>
          <Txt variant="small" style={{ fontWeight: '700' }}>Fotoğraflar (isteğe bağlı)</Txt>
          {photos.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {photos.map((p, i) => (
                <View key={p.uri}>
                  <Image source={{ uri: p.uri }} style={{ width: 88, height: 88, borderRadius: 12 }} accessibilityLabel={`Seçilen fotoğraf ${i + 1}`} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Fotoğraf ${i + 1} kaldır`}
                    onPress={() => setPhotos((prev) => prev.filter((x) => x.uri !== p.uri))}
                    style={{ position: 'absolute', top: -8, right: -8, width: 28, height: 28, borderRadius: 14, backgroundColor: t.rose, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          {photos.length < MAX_PHOTOS && (
            <Button
              title="Fotoğraf ekle"
              variant="outline"
              icon="image-outline"
              onPress={async () => {
                try {
                  const picked = await pickPhotos(MAX_PHOTOS - photos.length);
                  setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
                } catch (err) {
                  setError(errorMessage(err, 'Fotoğraf seçilemedi.'));
                }
              }}
            />
          )}
        </View>
        <Button title="Paylaş" onPress={submit} loading={loading} />
      </View>
    </Screen>
  );
}
