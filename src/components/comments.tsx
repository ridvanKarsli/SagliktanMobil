import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '@/components/feedback';
import { hapticLight } from '@/utils/haptics';
import { Avatar, Txt } from '@/components/ui';
import { errorMessage } from '@/api/client';
import {
  deleteComment,
  listCommentReplies,
  reactToComment,
  removeCommentReaction,
  reportComment,
} from '@/api/endpoints';
import type { Comment, ReactionValue } from '@/api/types';
import { useTheme } from '@/theme/ThemeContext';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { formatCount, relativeTime } from '@/utils/format';

// Bu sayıya kadar yanıtı olan yorumların yanıtları açık gelir; daha uzun
// zincirler "N yanıtı gör" ile açılır.
const AUTO_OPEN_MAX_REPLIES = 3;
const ROOT_AVATAR = 40;
const REPLY_AVATAR = 32;
const AVATAR_GAP = spacing.md;
const DELETED_TEXT = 'Bu yorum silindi.';

function withReaction(c: Comment, value: ReactionValue | null): Comment {
  let helpful = c.helpfulCount;
  let notHelpful = c.notHelpfulCount;
  if (c.myReaction === 'HELPFUL') helpful -= 1;
  if (c.myReaction === 'NOT_HELPFUL') notHelpful -= 1;
  if (value === 'HELPFUL') helpful += 1;
  if (value === 'NOT_HELPFUL') notHelpful += 1;
  return { ...c, myReaction: value, helpfulCount: Math.max(0, helpful), notHelpfulCount: Math.max(0, notHelpful) };
}

export function CommentRow({
  comment,
  ownId,
  isAccepted,
  canAccept,
  onAccept,
  onReply,
  onChange,
  onDeleted,
  depth = 0,
  replyVersion = 0,
}: {
  comment: Comment;
  ownId: number | undefined;
  isAccepted?: boolean;
  canAccept?: boolean;
  onAccept?: (c: Comment) => void;
  onReply?: (c: Comment) => void;
  onChange: (next: Comment) => void;
  onDeleted: (id: number) => void;
  depth?: number;
  // Bu yoruma yeni bir yanıt eklendiğinde artar; yanıt listesi yeniden
  // yüklenip açılır, böylece gönderilen yanıt hemen görünür.
  replyVersion?: number;
}) {
  const t = useTheme();
  const toast = useToast();
  const own = comment.authorId === ownId;
  const [replies, setReplies] = useState<Comment[] | null>(null);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const isReply = depth > 0;

  const shouldLoadReplies =
    !isReply && (replyVersion > 0 || (comment.replyCount > 0 && comment.replyCount <= AUTO_OPEN_MAX_REPLIES));
  useEffect(() => {
    if (!shouldLoadReplies) return undefined;
    let alive = true;
    listCommentReplies(comment.id, { size: 50 })
      .then((res) => { if (alive) setReplies(res.content); })
      .catch(() => { /* açılamazsa "yanıtı gör" düğmesi kalır */ });
    return () => { alive = false; };
  }, [comment.id, replyVersion, shouldLoadReplies]);

  const react = async (value: ReactionValue) => {
    if (own || comment.deleted) return;
    const target = comment.myReaction === value ? null : value;
    const before = comment;
    onChange(withReaction(comment, target));
    try {
      if (target) await reactToComment(comment.id, target);
      else await removeCommentReaction(comment.id);
    } catch (err) {
      onChange(before);
      Alert.alert('İşlem yapılamadı', errorMessage(err));
    }
  };

  const showReplies = async () => {
    if (replies) {
      setReplies(null);
      return;
    }
    setLoadingReplies(true);
    try {
      setReplies((await listCommentReplies(comment.id, { size: 50 })).content);
    } catch (err) {
      Alert.alert('Yanıtlar yüklenemedi', errorMessage(err));
    } finally {
      setLoadingReplies(false);
    }
  };

  const remove = () =>
    Alert.alert('Yorumu sil', 'Bu yorumu silmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(comment.id);
            onDeleted(comment.id);
          } catch (err) {
            Alert.alert('Silinemedi', errorMessage(err));
          }
        },
      },
    ]);

  const report = () =>
    Alert.alert('Yorumu şikayet et', 'Bu yorum topluluk kurallarına aykırı mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Şikayet et',
        style: 'destructive',
        onPress: async () => {
          try {
            await reportComment(comment.id);
            toast.show('Şikayetin alındı, teşekkürler.', 'success');
          } catch (err) {
            Alert.alert('İşlem yapılamadı', errorMessage(err));
          }
        },
      },
    ]);

  const small = (icon: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void, active = false, a11y?: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      onPress={() => { hapticLight(); onPress(); }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: MIN_TOUCH, paddingRight: spacing.lg }}
    >
      <Ionicons name={icon} size={19} color={active ? t.primary : t.inkSoft} />
      {label ? <Txt variant="small" color={active ? t.primary : t.inkSoft} style={{ fontWeight: '600' }}>{label}</Txt> : null}
    </Pressable>
  );

  const avatarSize = isReply ? REPLY_AVATAR : ROOT_AVATAR;
  const contentInset = avatarSize + AVATAR_GAP;
  const helpfulLabel = comment.helpfulCount > 0 ? `Faydalı · ${formatCount(comment.helpfulCount)}` : 'Faydalı';
  const displayName = comment.deleted ? 'Silinmiş yorum' : comment.authorName;

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', gap: AVATAR_GAP }}>
        <Avatar name={comment.deleted ? '·' : comment.authorName} size={avatarSize} />
        <View
          style={{
            flex: 1,
            gap: spacing.xs,
            ...(isAccepted ? { backgroundColor: t.primarySoft, borderRadius: radius.md, padding: spacing.md } : { paddingTop: 2 }),
          }}
        >
          {isAccepted && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="checkmark-circle" size={18} color={t.primary} />
              <Txt variant="small" color={t.primary} style={{ fontWeight: '800' }}>En iyi cevap</Txt>
            </View>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: spacing.sm }}>
            <Txt muted={comment.deleted} style={{ fontWeight: '700', flexShrink: 1 }}>{displayName}</Txt>
            {!comment.deleted && <Txt variant="small" muted>{relativeTime(comment.createdAt)}</Txt>}
          </View>
          <Txt muted={comment.deleted} style={{ fontStyle: comment.deleted ? 'italic' : 'normal' }}>
            {comment.deleted ? DELETED_TEXT : comment.content}
          </Txt>
        </View>
      </View>
      {!comment.deleted && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginLeft: contentInset }}>
          {small(
            comment.myReaction === 'HELPFUL' ? 'thumbs-up' : 'thumbs-up-outline',
            helpfulLabel,
            () => react('HELPFUL'),
            comment.myReaction === 'HELPFUL',
            'Faydalı bul',
          )}
          {onReply && small('return-down-forward-outline', 'Yanıtla', () => onReply(comment), false, `${comment.authorName} kişisine yanıt yaz`)}
          {canAccept && onAccept && small(isAccepted ? 'checkmark-circle' : 'checkmark-circle-outline', isAccepted ? 'Seçimi kaldır' : 'En iyi cevap seç', () => onAccept(comment), !!isAccepted)}
          {own ? small('trash-outline', 'Sil', remove, false, 'Yorumu sil') : small('flag-outline', 'Şikayet et', report, false, 'Yorumu şikayet et')}
        </View>
      )}
      {!isReply && comment.replyCount > 0 && (replies === null || comment.replyCount > AUTO_OPEN_MAX_REPLIES) && (
        <Pressable
          accessibilityRole="button"
          onPress={showReplies}
          style={{ marginLeft: contentInset, minHeight: MIN_TOUCH, justifyContent: 'center' }}
        >
          <Txt variant="small" color={t.primary} style={{ fontWeight: '700' }}>
            {loadingReplies ? 'Yanıtlar yükleniyor…' : replies ? 'Yanıtları gizle' : `${formatCount(comment.replyCount)} yanıtı gör`}
          </Txt>
        </Pressable>
      )}
      {replies && replies.length > 0 && (
        // Yanıtlar ana yorumun altında, sol kılavuz çizgisiyle tek girintide durur.
        <View
          style={{
            marginLeft: ROOT_AVATAR / 2 - 1,
            paddingLeft: spacing.lg,
            borderLeftWidth: 3,
            borderLeftColor: t.borderStrong,
            gap: spacing.md,
            marginTop: spacing.xs,
          }}
        >
          {replies.map((r) => (
            <CommentRow
              key={r.id}
              comment={r}
              ownId={ownId}
              depth={1}
              onReply={onReply}
              onChange={(next) => setReplies((prev) => prev?.map((x) => (x.id === next.id ? next : x)) ?? null)}
              onDeleted={(id) => setReplies((prev) => prev?.map((x) => (x.id === id ? { ...x, deleted: true } : x)) ?? null)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
