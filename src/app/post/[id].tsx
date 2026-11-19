import { useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Banner, Button, ErrorState, Loading, Txt } from '@/components/ui';
import { PostActions, PostTypeChip } from '@/components/post';
import { CommentRow } from '@/components/comments';
import { errorMessage } from '@/api/client';
import {
  acceptAnswer,
  createComment,
  deletePost,
  getPost,
  listComments,
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
import { usePagedList } from '@/utils/usePagedList';

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
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const post = postState.data;
  if (postState.loading && !post) return <Loading />;
  if (!post) return <ErrorState message={postState.error ?? 'Gönderi yüklenemedi.'} onRetry={postState.reload} />;

  const own = post.authorId === user?.id;
  const setPost = (next: Post) => postState.setData(next);

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
      const created = await createComment(postId, content, replyTo?.id);
      setText('');
      setReplyTo(null);
      if (created.parentCommentId) {
        comments.setItems((prev) => prev.map((c) => (c.id === created.parentCommentId ? { ...c, replyCount: c.replyCount + 1 } : c)));
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
        <Avatar name={post.authorName} size={42} />
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
        <View style={{ gap: 8 }}>
          {[...post.attachments].sort((a, b) => a.sortOrder - b.sortOrder).map((a) => (
            <Image key={a.id} source={{ uri: a.url }} resizeMode="cover" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: t.surfaceAlt }} accessibilityLabel="Gönderideki fotoğraf" />
          ))}
        </View>
      )}
      {post.flaggedSensitive && (
        <Banner text="Zor bir dönemden geçiyorsan yalnız değilsin. 182 ALO Yaşam Hattı'ndan destek alabilirsin." />
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
      <Button
        title="Mesajla paylaş"
        variant="outline"
        icon="paper-plane-outline"
        onPress={() => router.push({ pathname: '/share-post', params: { postId: String(post.id) } })}
      />
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
            comments.loading ? <Loading /> : <Txt variant="small" muted>Henüz yorum yok. İlk yorumu sen yaz.</Txt>
          }
          renderItem={({ item }) => (
            <CommentRow
              comment={item}
              ownId={user?.id}
              isAccepted={post.acceptedCommentId === item.id}
              canAccept={own && post.postType === 'QUESTION' && !item.deleted}
              onAccept={toggleAccept}
              onReply={setReplyTo}
              onChange={(next) => comments.setItems((prev) => prev.map((c) => (c.id === next.id ? next : c)))}
              onDeleted={(cid) => {
                comments.setItems((prev) => prev.filter((c) => c.id !== cid));
                setPost({ ...post, commentCount: Math.max(0, post.commentCount - 1) });
              }}
            />
          )}
        />
        <View style={{ borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.surface, padding: 10, gap: 6 }}>
          {replyTo && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt variant="caption" muted style={{ flex: 1 }} numberOfLines={1}>{replyTo.authorName} kişisine yanıt</Txt>
              <Pressable accessibilityRole="button" accessibilityLabel="Yanıtı iptal et" onPress={() => setReplyTo(null)} hitSlop={10}>
                <Ionicons name="close-circle" size={20} color={t.inkMuted} />
              </Pressable>
            </View>
          )}
          {sendError && <Txt variant="caption" color={t.rose}>{sendError}</Txt>}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: t.background, borderRadius: 20, borderWidth: 1, borderColor: t.borderStrong, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' }}>
              <TextInputLite value={text} onChangeText={setText} placeholder="Yorum yaz..." color={t.ink} placeholderColor={t.inkMuted} />
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

function TextInputLite({ value, onChangeText, placeholder, color, placeholderColor }: { value: string; onChangeText: (v: string) => void; placeholder: string; color: string; placeholderColor: string }) {
  return (
    <TextInput
      accessibilityLabel="Yorum yaz"
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderColor}
      multiline
      maxLength={LIMITS.COMMENT_MAX}
      style={{ color, fontSize: 16, maxHeight: 110, paddingVertical: 10 }}
    />
  );
}
