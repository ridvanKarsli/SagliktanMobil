import { useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Card, Chip, Txt } from '@/components/ui';
import { errorMessage } from '@/api/client';
import {
  reactToPost,
  removePostReaction,
  reportPost,
  savePost,
  unsavePost,
} from '@/api/endpoints';
import type { Post, ReactionValue } from '@/api/types';
import { useTheme } from '@/theme/ThemeContext';
import { MIN_TOUCH, spacing } from '@/theme/tokens';
import { formatCount, relativeTime } from '@/utils/format';

// Tepki sayaçlarını (faydalı / faydalı değil) iyimser olarak günceller.
export function applyReaction(post: Post, value: ReactionValue | null): Post {
  let helpful = post.helpfulCount;
  let notHelpful = post.notHelpfulCount;
  if (post.myReaction === 'HELPFUL') helpful -= 1;
  if (post.myReaction === 'NOT_HELPFUL') notHelpful -= 1;
  if (value === 'HELPFUL') helpful += 1;
  if (value === 'NOT_HELPFUL') notHelpful += 1;
  return { ...post, myReaction: value, helpfulCount: Math.max(0, helpful), notHelpfulCount: Math.max(0, notHelpful) };
}

const TYPE_LABEL: Record<Post['postType'], { label: string; tone: 'primary' | 'sky' | 'lilac'; icon: keyof typeof Ionicons.glyphMap }> = {
  DISCUSSION: { label: 'Deneyim', tone: 'primary', icon: 'chatbubbles-outline' },
  QUESTION: { label: 'Soru', tone: 'sky', icon: 'help-circle-outline' },
  POLL: { label: 'Anket', tone: 'lilac', icon: 'stats-chart-outline' },
};

export function PostTypeChip({ type }: { type: Post['postType'] }) {
  const m = TYPE_LABEL[type] ?? TYPE_LABEL.DISCUSSION;
  return <Chip label={m.label} tone={m.tone} icon={m.icon} />;
}

// Tepki + kaydet + (isteğe bağlı) şikayet çubuğu.
export function PostActions({ post, onChange, ownPost }: { post: Post; onChange: (next: Post) => void; ownPost: boolean }) {
  const t = useTheme();
  const [busy, setBusy] = useState(false);

  const react = async (value: ReactionValue) => {
    if (busy || ownPost) return;
    const target = post.myReaction === value ? null : value;
    const before = post;
    onChange(applyReaction(post, target));
    setBusy(true);
    try {
      if (target) await reactToPost(post.id, target);
      else await removePostReaction(post.id);
    } catch (err) {
      onChange(before);
      Alert.alert('İşlem yapılamadı', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleSave = async () => {
    if (busy) return;
    const before = post;
    onChange({ ...post, saved: !post.saved, savedCount: Math.max(0, post.savedCount + (post.saved ? -1 : 1)) });
    setBusy(true);
    try {
      if (before.saved) await unsavePost(post.id);
      else await savePost(post.id);
    } catch (err) {
      onChange(before);
      Alert.alert('İşlem yapılamadı', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const report = () => {
    Alert.alert('Gönderiyi şikayet et', 'Bu gönderi topluluk kurallarına aykırı mı? Moderatörlerimiz inceleyecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Şikayet et',
        style: 'destructive',
        onPress: async () => {
          try {
            await reportPost(post.id);
            Alert.alert('Teşekkürler', 'Şikayetin alındı.');
          } catch (err) {
            Alert.alert('İşlem yapılamadı', errorMessage(err));
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
      <ActionButton
        icon={post.myReaction === 'HELPFUL' ? 'thumbs-up' : 'thumbs-up-outline'}
        label={`Faydalı ${formatCount(post.helpfulCount)}`}
        active={post.myReaction === 'HELPFUL'}
        activeColor={t.apricotInk}
        activeBg={t.apricotSoft}
        disabled={ownPost}
        onPress={() => react('HELPFUL')}
        a11y={ownPost ? 'Kendi gönderine oy veremezsin' : 'Faydalı bul'}
      />
      <ActionButton
        icon={post.myReaction === 'NOT_HELPFUL' ? 'thumbs-down' : 'thumbs-down-outline'}
        label={formatCount(post.notHelpfulCount)}
        active={post.myReaction === 'NOT_HELPFUL'}
        activeColor={t.rose}
        activeBg={t.roseSoft}
        disabled={ownPost}
        onPress={() => react('NOT_HELPFUL')}
        a11y="Faydalı bulma"
      />
      <ActionButton
        icon={post.saved ? 'bookmark' : 'bookmark-outline'}
        label={post.saved ? 'Kaydedildi' : 'Kaydet'}
        active={post.saved}
        activeColor={t.primary}
        activeBg={t.primarySoft}
        onPress={toggleSave}
        a11y={post.saved ? 'Kaydı kaldır' : 'Kaydet'}
      />
      {!ownPost && (
        <ActionButton icon="flag-outline" label="" onPress={report} a11y="Şikayet et" />
      )}
    </View>
  );
}

function ActionButton({
  icon,
  label,
  active,
  activeColor,
  activeBg,
  onPress,
  disabled,
  a11y,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  activeColor?: string;
  activeBg?: string;
  onPress: () => void;
  disabled?: boolean;
  a11y: string;
}) {
  const t = useTheme();
  const fg = active && activeColor ? activeColor : t.inkSoft;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ? `${a11y}, ${label}` : a11y}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: MIN_TOUCH,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: active && activeBg ? activeBg : 'transparent',
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={19} color={fg} />
      {label ? <Txt variant="caption" color={fg}>{label}</Txt> : null}
    </Pressable>
  );
}

// Akış / liste kartı.
export function PostCard({
  post,
  onChange,
  ownId,
  showGroup = false,
}: {
  post: Post;
  onChange: (next: Post) => void;
  ownId: number | undefined;
  showGroup?: boolean;
}) {
  const t = useTheme();
  const open = () => router.push({ pathname: '/post/[id]', params: { id: String(post.id) } });
  return (
    <Card style={{ gap: spacing.md }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Gönderiyi aç: ${post.title}`} onPress={open} style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar name={post.authorName} size={38} />
          <View style={{ flex: 1 }}>
            <Txt variant="small" style={{ fontWeight: '700' }} numberOfLines={1}>
              {post.authorName}
            </Txt>
            <Txt variant="caption" muted numberOfLines={1}>
              {showGroup && post.diseaseGroupName ? `${post.diseaseGroupName} · ` : ''}
              {relativeTime(post.createdAt)}
            </Txt>
          </View>
          <PostTypeChip type={post.postType} />
        </View>
        {post.pinned && <Txt variant="caption" color={t.primary}>Sabitlenmiş</Txt>}
        <Txt variant="h3">{post.title}</Txt>
        <Txt variant="small" muted numberOfLines={4}>
          {post.content}
        </Txt>
        {post.attachments?.length > 0 && (
          <Image source={{ uri: post.attachments[0].url }} resizeMode="cover" style={{ width: '100%', height: 160, borderRadius: 12, backgroundColor: t.surfaceAlt }} accessibilityLabel="Gönderideki fotoğraf" />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="chatbubble-outline" size={15} color={t.inkMuted} />
          <Txt variant="caption" muted>
            {formatCount(post.commentCount)} yorum
          </Txt>
          {post.postType === 'QUESTION' && (
            <Txt variant="caption" color={post.acceptedCommentId ? t.primary : t.sky}>
              {post.acceptedCommentId ? '· Cevaplandı' : '· Cevap bekliyor'}
            </Txt>
          )}
        </View>
      </Pressable>
      <PostActions post={post} onChange={onChange} ownPost={post.authorId === ownId} />
    </Card>
  );
}
