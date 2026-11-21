import { useRef, useState } from 'react';
import { Alert, Animated, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Chip, Txt } from '@/components/ui';
import { ActionSheet, useToast, type SheetAction } from '@/components/feedback';
import { PostMedia } from '@/components/media';
import { hapticLight, hapticSelect } from '@/utils/haptics';
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
import { spacing } from '@/theme/tokens';
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

// Tepki / kaydet / şikayet işlemlerini (iyimser güncelleme + geri alma) tek yerde toplar.
export function usePostActions(post: Post, onChange: (next: Post) => void, ownPost: boolean) {
  const toast = useToast();
  const busy = useRef(false);

  const react = async (value: ReactionValue, forceOn = false) => {
    if (busy.current) return;
    if (ownPost) {
      toast.show('Kendi gönderine oy veremezsin.');
      return;
    }
    const target = post.myReaction === value && !forceOn ? null : value;
    if (target === post.myReaction) return;
    const before = post;
    onChange(applyReaction(post, target));
    busy.current = true;
    try {
      if (target) await reactToPost(post.id, target);
      else await removePostReaction(post.id);
    } catch (err) {
      onChange(before);
      toast.show(errorMessage(err), 'error');
    } finally {
      busy.current = false;
    }
  };

  const toggleSave = async () => {
    if (busy.current) return;
    const before = post;
    onChange({ ...post, saved: !post.saved, savedCount: Math.max(0, post.savedCount + (post.saved ? -1 : 1)) });
    busy.current = true;
    try {
      if (before.saved) await unsavePost(post.id);
      else {
        await savePost(post.id);
        toast.show('Kaydedilenlere eklendi.', 'success');
      }
    } catch (err) {
      onChange(before);
      toast.show(errorMessage(err), 'error');
    } finally {
      busy.current = false;
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
            toast.show('Şikayetin alındı, teşekkürler.', 'success');
          } catch (err) {
            toast.show(errorMessage(err), 'error');
          }
        },
      },
    ]);
  };

  const share = () => router.push({ pathname: '/share-post', params: { postId: String(post.id) } });

  return { react, toggleSave, report, share };
}

// Dokunulduğunda yaylanan simge düğmesi (Instagram'daki beğeni hissi).
function IconButton({
  icon,
  activeIcon,
  active,
  color,
  activeColor,
  label,
  count,
  onPress,
  a11y,
  size = 22,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  color: string;
  activeColor?: string;
  label?: string;
  count?: string;
  onPress: () => void;
  a11y: string;
  size?: number;
}) {
  const scale = useState(() => new Animated.Value(1))[0];
  const press = () => {
    hapticLight();
    scale.setValue(0.7);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 18 }).start();
    onPress();
  };
  const fg = active && activeColor ? activeColor : color;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? a11y}
      accessibilityState={{ selected: !!active }}
      onPress={press}
      hitSlop={6}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 8 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={active && activeIcon ? activeIcon : icon} size={size} color={fg} />
      </Animated.View>
      {count ? <Txt variant="caption" color={fg} style={{ fontSize: 13 }}>{count}</Txt> : null}
    </Pressable>
  );
}

// Gönderi detayındaki eylem çubuğu (kart ile aynı dil).
export function PostActions({ post, onChange, ownPost }: { post: Post; onChange: (next: Post) => void; ownPost: boolean }) {
  const t = useTheme();
  const a = usePostActions(post, onChange, ownPost);
  const [menu, setMenu] = useState(false);
  const actions: SheetAction[] = [
    ...(!ownPost ? [{ label: 'Şikayet et', icon: 'flag-outline' as const, destructive: true, onPress: a.report }] : []),
  ];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <IconButton icon="thumbs-up-outline" activeIcon="thumbs-up" active={post.myReaction === 'HELPFUL'} color={t.inkSoft} activeColor={t.primary} count={formatCount(post.helpfulCount)} label={`Faydalı, ${post.helpfulCount}`} a11y="Faydalı bul" onPress={() => a.react('HELPFUL')} />
      <IconButton icon="thumbs-down-outline" activeIcon="thumbs-down" active={post.myReaction === 'NOT_HELPFUL'} color={t.inkSoft} activeColor={t.rose} count={formatCount(post.notHelpfulCount)} label={`Faydalı değil, ${post.notHelpfulCount}`} a11y="Faydalı bulma" onPress={() => a.react('NOT_HELPFUL')} />
      <IconButton icon="paper-plane-outline" color={t.inkSoft} a11y="Mesajla paylaş" onPress={a.share} />
      <View style={{ flex: 1 }} />
      <IconButton icon="bookmark-outline" activeIcon="bookmark" active={post.saved} color={t.inkSoft} activeColor={t.primary} a11y={post.saved ? 'Kaydı kaldır' : 'Kaydet'} onPress={a.toggleSave} />
      {!ownPost && (
        <>
        <IconButton icon="ellipsis-horizontal" color={t.inkSoft} a11y="Diğer seçenekler" size={20} onPress={() => { hapticSelect(); setMenu(true); }} />
        <ActionSheet visible={menu} actions={actions} onClose={() => setMenu(false)} />
        </>
      )}
    </View>
  );
}

// Akış / liste kartı: kenardan kenara, Instagram gönderisi düzeninde.
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
  const own = post.authorId === ownId;
  const a = usePostActions(post, onChange, own);
  const [menu, setMenu] = useState(false);
  const open = () => router.push({ pathname: '/post/[id]', params: { id: String(post.id) } });
  const hasMedia = post.attachments?.length > 0;

  const actions: SheetAction[] = [
    { label: post.saved ? 'Kaydı kaldır' : 'Kaydet', icon: post.saved ? 'bookmark' : 'bookmark-outline', onPress: a.toggleSave },
    { label: 'Mesajla paylaş', icon: 'paper-plane-outline', onPress: a.share },
    ...(!own ? [{ label: 'Şikayet et', icon: 'flag-outline' as const, destructive: true, onPress: a.report }] : []),
  ];

  return (
    <View style={{ backgroundColor: t.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.border, marginHorizontal: -spacing.lg, paddingTop: spacing.md }}>
      {/* Başlık satırı */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${post.authorName} profili`} onPress={() => router.push({ pathname: '/users/[id]', params: { id: String(post.authorId) } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <Avatar name={post.authorName} size={32} />
          <View style={{ flex: 1 }}>
            <Txt variant="small" style={{ fontWeight: '700' }} numberOfLines={1}>{post.authorName}</Txt>
            <Txt variant="caption" muted numberOfLines={1}>
              {showGroup && post.diseaseGroupName ? `${post.diseaseGroupName} · ` : ''}
              {relativeTime(post.createdAt)}
            </Txt>
          </View>
        </Pressable>
        <PostTypeChip type={post.postType} />
        <Pressable accessibilityRole="button" accessibilityLabel="Diğer seçenekler" hitSlop={8} onPress={() => { hapticSelect(); setMenu(true); }} style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="ellipsis-horizontal" size={20} color={t.inkSoft} />
        </Pressable>
      </View>

      {hasMedia && <PostMedia attachments={post.attachments} onDoubleTap={() => a.react('HELPFUL', true)} />}

      {/* Metin */}
      <Pressable accessibilityRole="button" accessibilityLabel={`Gönderiyi aç: ${post.title}`} onPress={open} style={{ paddingHorizontal: spacing.lg, paddingTop: hasMedia ? spacing.md : 0, paddingBottom: spacing.sm, gap: 4 }}>
        {post.pinned && <Txt variant="caption" color={t.primary}>Sabitlenmiş</Txt>}
        <Txt variant="h3">{post.title}</Txt>
        <Txt variant="small" muted numberOfLines={hasMedia ? 2 : 5}>{post.content}</Txt>
        {post.postType === 'QUESTION' && (
          <Txt variant="caption" color={post.acceptedCommentId ? t.primary : t.sky}>
            {post.acceptedCommentId ? 'Cevaplandı' : 'Cevap bekliyor'}
          </Txt>
        )}
      </Pressable>

      {/* Eylem çubuğu: her zaman gönderinin altında */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingBottom: spacing.xs, borderTopWidth: 1, borderTopColor: t.border, marginTop: spacing.xs }}>
        <IconButton icon="thumbs-up-outline" activeIcon="thumbs-up" active={post.myReaction === 'HELPFUL'} color={t.inkSoft} activeColor={t.primary} count={formatCount(post.helpfulCount)} label={`Faydalı, ${post.helpfulCount}`} a11y="Faydalı bul" onPress={() => a.react('HELPFUL')} />
        <IconButton icon="thumbs-down-outline" activeIcon="thumbs-down" active={post.myReaction === 'NOT_HELPFUL'} color={t.inkSoft} activeColor={t.rose} count={formatCount(post.notHelpfulCount)} label={`Faydalı değil, ${post.notHelpfulCount}`} a11y="Faydalı bulma" onPress={() => a.react('NOT_HELPFUL')} />
        <IconButton icon="chatbubble-outline" color={t.inkSoft} count={formatCount(post.commentCount)} label={`Yorumlar, ${post.commentCount}`} a11y="Yorumlar" onPress={open} />
        <IconButton icon="paper-plane-outline" color={t.inkSoft} a11y="Mesajla paylaş" onPress={a.share} />
        <View style={{ flex: 1 }} />
        <IconButton icon="bookmark-outline" activeIcon="bookmark" active={post.saved} color={t.inkSoft} activeColor={t.primary} a11y={post.saved ? 'Kaydı kaldır' : 'Kaydet'} onPress={a.toggleSave} />
      </View>
      <ActionSheet visible={menu} actions={actions} onClose={() => setMenu(false)} />
    </View>
  );
}
