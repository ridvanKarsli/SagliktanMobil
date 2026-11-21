import { useRef, useState, type ComponentRef, type RefObject } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Banner, Button, ErrorState, Loading, Txt } from '@/components/ui';
import { PostActions, PostTypeChip, applyReaction } from '@/components/post';
import { PostMedia } from '@/components/media';
import { CommentRow } from '@/components/comments';
import { errorMessage } from '@/api/client';
import {
  acceptAnswer,
  createComment,
  deletePost,
  getPost,
  listComments,
  reactToPost,
  removePollVote,
  unacceptAnswer,
  votePoll,
} from '@/api/endpoints';
import type { Comment, Post } from '@/api/types';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { LIMITS } from '@/utils/validation';
import { formatCount, relativeTime } from '@/utils/format';
import { useAsync } from '@/utils/useAsync';
import { CRISIS_LINE_NAME } from '@/config';
import { usePagedList } from '@/utils/usePagedList';

type TextInputHandle = ComponentRef<typeof TextInput>;

export default function PostScreen() {
  const kbOffset = useSafeAreaInsets().top + (Platform.OS === 'ios' ? 44 : 56);
  const t = useTheme();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);

  const postState = useAsync((signal) => getPost(postId, signal), [postId]);
  const comments = usePagedList((page, signal) => listComments(postId, { page, signal }), [postId]);

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  // Ana yorum id -> o yoruma bu ekranda eklenen yanıt sayısı (yanıt listesini tazeler).
  const [replyVersions, setReplyVersions] = useState<Record<number, number>>({});
  const inputRef = useRef<TextInputHandle>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const post = postState.data;
  if (postState.loading && !post) return <Loading />;
  if (!post) return <ErrorState message={postState.error ?? 'Gönderi yüklenemedi.'} onRetry={postState.reload} />;

  const own = post.authorId === user?.id;
  const setPost = (next: Post) => postState.setData(next);

  // Yanıtla: kime yazıldığını gösteren bant açılır ve yazma alanı odaklanır.
  const startReply = (c: Comment) => {
    setReplyTo(c);
    inputRef.current?.focus();
  };

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    if (content.length > LIMITS.COMMENT_MAX) {
      setSendError(`Yorum en fazla ${LIMITS.COMMENT_MAX} karakter olabilir.`);
      return;
    }
    setSendError(null);
    setSending(true);
    try {
      // Yanıtlar tek düzeydir: bir yanıta yanıt yazılırsa o da aynı ana yorumun
      // altına düşer; kime yazıldığı metnin başındaki "@Ad" ile belli olur.
      const rootId = replyTo ? replyTo.parentCommentId ?? replyTo.id : undefined;
      const mention = replyTo?.parentCommentId ? `@${replyTo.authorName}` : '';
      const body = mention && !content.startsWith(mention) ? `${mention} ${content}` : content;
      await createComment(postId, body, rootId);
      setText('');
      setReplyTo(null);
      if (rootId) {
        comments.setItems((prev) => prev.map((c) => (c.id === rootId ? { ...c, replyCount: c.replyCount + 1 } : c)));
        setReplyVersions((prev) => ({ ...prev, [rootId]: (prev[rootId] ?? 0) + 1 }));
      } else {
        await comments.refresh();
      }
      setPost({ ...post, commentCount: post.commentCount + 1 });
    } catch (err) {
      setSendError(errorMessage(err, 'Yorum gönderilemedi.'));
    } finally {
      setSending(false);
    }
  };

  const vote = async (optionId: number) => {
    try {
      if (post.poll?.myOptionId === optionId) await removePollVote(postId);
      else await votePoll(postId, optionId);
      await postState.refresh();
    } catch (err) {
      Alert.alert('Oy verilemedi', errorMessage(err));
    }
  };

  const toggleAccept = async (c: Comment) => {
    try {
      if (post.acceptedCommentId === c.id) await unacceptAnswer(postId);
      else await acceptAnswer(postId, c.id);
      await postState.refresh();
    } catch (err) {
      Alert.alert('İşlem yapılamadı', errorMessage(err));
    }
  };

  const removePost = () =>
    Alert.alert('Gönderiyi sil', 'Bu gönderiyi silmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(postId);
            router.back();
          } catch (err) {
            Alert.alert('Silinemedi', errorMessage(err));
          }
        },
      },
    ]);

  const header = (
    <View style={{ gap: 12, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar name={post.authorName} size={40} />
        <View style={{ flex: 1 }}>
          <Txt variant="small" style={{ fontWeight: '700' }}>{post.authorName}</Txt>
          <Txt variant="caption" muted>
            {[post.diseaseGroupName, post.subGroupName].filter(Boolean).join(' · ')}
            {post.diseaseGroupName || post.subGroupName ? ' · ' : ''}
            {relativeTime(post.createdAt)}
          </Txt>
        </View>
        <PostTypeChip type={post.postType} />
      </View>
      <Txt variant="h2">{post.title}</Txt>
      <Txt>{post.content}</Txt>
      {post.attachments?.length > 0 && (
        <View style={{ marginHorizontal: -16 }}>
          <PostMedia attachments={post.attachments} onDoubleTap={() => { if (!own && post.myReaction !== 'HELPFUL') { setPost(applyReaction(post, 'HELPFUL')); reactToPost(post.id, 'HELPFUL').catch(() => setPost(post)); } }} />
        </View>
      )}
      {post.flaggedSensitive && (
        <Banner text={`Zor bir dönemden geçiyorsan yalnız değilsin. Acil bir durumda ${CRISIS_LINE_NAME} 7/24 ücretsiz aranabilir.`} />
      )}
      {post.postType === 'POLL' && post.poll && (
        <View style={{ gap: 8 }}>
          {post.poll.options.map((o) => {
            const pct = post.poll!.totalVotes ? Math.round((o.votes / post.poll!.totalVotes) * 100) : 0;
            const mine = post.poll!.myOptionId === o.id;
            return (
              <Pressable
                key={o.id}
                accessibilityRole="button"
                accessibilityState={{ selected: mine }}
                accessibilityLabel={`${o.label}, yüzde ${pct}`}
                onPress={() => vote(o.id)}
                style={{
                  minHeight: 48,
                  borderRadius: 14,
                  borderWidth: mine ? 2 : 1,
                  borderColor: mine ? t.lilac : t.borderStrong,
                  backgroundColor: t.surface,
                  overflow: 'hidden',
                  justifyContent: 'center',
                }}
              >
                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: t.lilacSoft }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 }}>
                  <Txt variant="small" style={{ flex: 1, fontWeight: mine ? '700' : '400' }}>{o.label}</Txt>
                  <Txt variant="caption" muted>%{pct} · {formatCount(o.votes)}</Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      <PostActions post={post} onChange={setPost} ownPost={own} />
      {own && <Button title="Gönderiyi sil" variant="ghost" icon="trash-outline" onPress={removePost} />}
      <Txt variant="h3">Yorumlar ({formatCount(post.commentCount)})</Txt>
    </View>
  );

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: t.background }}>
      <Stack.Screen options={{ title: 'Gönderi' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={kbOffset}>
        <FlatList
          data={comments.items}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          onEndReached={comments.loadMore}
          onEndReachedThreshold={0.5}
          refreshing={postState.refreshing}
          onRefresh={() => {
            postState.refresh();
            comments.refresh();
          }}
          ListEmptyComponent={
            comments.loading ? <Loading /> : <Txt variant="small" muted>Henüz yorum yok. İlk yazan sen ol.</Txt>
          }
          renderItem={({ item }) => (
            <CommentRow
              comment={item}
              ownId={user?.id}
              isAccepted={post.acceptedCommentId === item.id}
              canAccept={own && post.postType === 'QUESTION' && !item.deleted}
              onAccept={toggleAccept}
              replyVersion={replyVersions[item.id] ?? 0}
              onReply={startReply}
              onChange={(next) => comments.setItems((prev) => prev.map((c) => (c.id === next.id ? next : c)))}
              onDeleted={(cid) => {
                // Yanıtı olan yorum yer tutucu olarak kalır; yanıtları kaybolmaz.
                comments.setItems((prev) =>
                  prev.flatMap((c) => (c.id !== cid ? [c] : c.replyCount > 0 ? [{ ...c, deleted: true }] : [])),
                );
                setPost({ ...post, commentCount: Math.max(0, post.commentCount - 1) });
              }}
            />
          )}
        />
        <View style={{ borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.surface, padding: 10, gap: 6 }}>
          {replyTo && (
            <View
              accessibilityLiveRegion="polite"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.primarySoft, borderRadius: 12, paddingLeft: 12 }}
            >
              <Txt variant="small" style={{ flex: 1, fontWeight: '700' }}>{replyTo.authorName} kişisine yanıt yazıyorsun</Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Yanıtlamaktan vazgeç"
                onPress={() => setReplyTo(null)}
                style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }}
              >
                <Txt variant="small" color={t.primary} style={{ fontWeight: '700' }}>Vazgeç</Txt>
              </Pressable>
            </View>
          )}
          {sendError && <Txt variant="caption" color={t.rose}>{sendError}</Txt>}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: t.background, borderRadius: 20, borderWidth: 1, borderColor: t.borderStrong, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' }}>
              <TextInputLite inputRef={inputRef} value={text} onChangeText={setText} placeholder={replyTo ? 'Yanıtını yaz…' : 'Yorum yaz…'} color={t.ink} placeholderColor={t.inkSoft} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Yorumu gönder"
              disabled={sending || !text.trim()}
              onPress={send}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', opacity: sending || !text.trim() ? 0.5 : 1 }}
            >
              <Ionicons name="send" size={18} color={t.onPrimary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TextInputLite({ inputRef, value, onChangeText, placeholder, color, placeholderColor }: { inputRef: RefObject<TextInputHandle | null>; value: string; onChangeText: (v: string) => void; placeholder: string; color: string; placeholderColor: string }) {
  return (
    <TextInput
      ref={inputRef}
      accessibilityLabel={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderColor}
      multiline
      maxLength={LIMITS.COMMENT_MAX}
      style={{ color, fontSize: 17, maxHeight: 130, paddingVertical: 10 }}
    />
  );
}
