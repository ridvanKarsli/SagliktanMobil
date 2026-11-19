import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { MIN_TOUCH } from '@/theme/tokens';
import { formatCount, relativeTime } from '@/utils/format';

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
}) {
  const t = useTheme();
  const own = comment.authorId === ownId;
  const [replies, setReplies] = useState<Comment[] | null>(null);
  const [loadingReplies, setLoadingReplies] = useState(false);

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
            Alert.alert('Teşekkürler', 'Şikayetin alındı.');
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
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: MIN_TOUCH, paddingRight: 14 }}
    >
      <Ionicons name={icon} size={17} color={active ? t.primary : t.inkSoft} />
      {label ? <Txt variant="caption" color={active ? t.primary : t.inkSoft}>{label}</Txt> : null}
    </Pressable>
  );

  return (
    <View style={{ marginLeft: depth * 24, gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Avatar name={comment.authorName} size={depth ? 30 : 36} />
        <View
          style={{
            flex: 1,
            backgroundColor: isAccepted ? t.primarySoft : t.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isAccepted ? t.primary : t.border,
            padding: 12,
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt variant="small" style={{ fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>{comment.authorName}</Txt>
            <Txt variant="caption" muted>{relativeTime(comment.createdAt)}</Txt>
            {isAccepted && <Txt variant="caption" color={t.primary}>· En iyi cevap</Txt>}
          </View>
          <Txt variant="small" muted={comment.deleted} style={{ fontStyle: comment.deleted ? 'italic' : 'normal' }}>
            {comment.content}
          </Txt>
        </View>
      </View>
      {!comment.deleted && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginLeft: 46 }}>
          {small(
            comment.myReaction === 'HELPFUL' ? 'thumbs-up' : 'thumbs-up-outline',
            formatCount(comment.helpfulCount),
            () => react('HELPFUL'),
            comment.myReaction === 'HELPFUL',
            'Faydalı bul',
          )}
          {depth === 0 && onReply && small('return-down-forward-outline', 'Yanıtla', () => onReply(comment))}
          {canAccept && onAccept && small(isAccepted ? 'checkmark-circle' : 'checkmark-circle-outline', isAccepted ? 'Seçildi' : 'En iyi cevap', () => onAccept(comment), !!isAccepted)}
          {own ? small('trash-outline', '', remove, false, 'Yorumu sil') : small('flag-outline', '', report, false, 'Şikayet et')}
        </View>
      )}
      {depth === 0 && comment.replyCount > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={showReplies}
          style={{ marginLeft: 46, minHeight: MIN_TOUCH, justifyContent: 'center' }}
        >
          <Txt variant="caption" color={t.primary}>
            {loadingReplies ? 'Yükleniyor...' : replies ? 'Yanıtları gizle' : `${formatCount(comment.replyCount)} yanıtı göster`}
          </Txt>
        </Pressable>
      )}
      {replies?.map((r) => (
        <CommentRow
          key={r.id}
          comment={r}
          ownId={ownId}
          depth={1}
          onChange={(next) => setReplies((prev) => prev?.map((x) => (x.id === next.id ? next : x)) ?? null)}
          onDeleted={(id) => setReplies((prev) => prev?.filter((x) => x.id !== id) ?? null)}
        />
      ))}
    </View>
  );
}
