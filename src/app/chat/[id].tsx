import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ImageViewer } from '@/components/media';
import { hapticLight } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, ErrorState, Loading, Txt } from '@/components/ui';
import { ActionSheet, useToast, type SheetAction } from '@/components/feedback';
import { errorMessage } from '@/api/client';
import {
  blockUser,
  getConversation,
  listConversationMessages,
  markConversationRead,
  reportMessage,
  sendChatMessage,
} from '@/api/endpoints';
import type { ChatMessage } from '@/api/types';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { chatTimeLabel, parseServerDate } from '@/utils/format';
import { pickPhotos, uploadPhoto } from '@/utils/upload';
import { useAsync } from '@/utils/useAsync';
import { useRealtime } from '@/realtime/useRealtime';

const POLL_MS = 8000;
const GROUP_GAP_MS = 5 * 60 * 1000; // aynı kişiden 5 dk içindeki mesajlar tek grup
const SEPARATOR_GAP_MS = 30 * 60 * 1000; // 30 dk sessizlikten sonra saat ayracı

type Row = ChatMessage & { status?: 'sending' | 'failed'; retry?: () => void };

const ms = (m: ChatMessage) => parseServerDate(m.createdAt)?.getTime() ?? 0;

export default function ChatScreen() {
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<Row[]>([]);
  const [sheet, setSheet] = useState<{ title?: string; actions: SheetAction[] } | null>(null);
  const toast = useToast();
  const kbOffset = useSafeAreaInsets().top + (Platform.OS === 'ios' ? 44 : 56);
  const t = useTheme();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);

  const conv = useAsync(() => getConversation(conversationId), [conversationId]);
  // Mesajlar en yeniden eskiye gelir; ters çevrilmiş liste bunu doğal gösterir.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const pageRef = useRef(0);
  const lastRef = useRef(true);
  const loadingMoreRef = useRef(false);

  const merge = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, m);
      return [...map.values()].sort((a, b) => b.id - a.id);
    });
  }, []);

  const loadNewest = useCallback(async () => {
    try {
      const res = await listConversationMessages(conversationId, { page: 0 });
      merge(res.content);
      if (pageRef.current === 0) lastRef.current = res.last;
      setError(null);
      markConversationRead(conversationId).catch(() => {
        // okundu işareti ikincil; hata sohbeti engellemez
      });
    } catch (err) {
      setError((e) => e ?? errorMessage(err, 'Mesajlar yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, [conversationId, merge]);

  useEffect(() => {
    loadNewest();
    const timer = setInterval(loadNewest, POLL_MS);
    return () => clearInterval(timer);
  }, [loadNewest]);

  // Anlık mesaj: bu sohbete aitse listeye eklenir ve okundu işaretlenir.
  useRealtime<ChatMessage>('/user/queue/messages', (m) => {
    if (m.conversationId !== conversationId) return;
    merge([m]);
    markConversationRead(conversationId).catch(() => {
      // okundu işareti ikincil
    });
  });

  const loadOlder = async () => {
    if (loadingMoreRef.current || lastRef.current) return;
    loadingMoreRef.current = true;
    try {
      const res = await listConversationMessages(conversationId, { page: pageRef.current + 1 });
      pageRef.current += 1;
      lastRef.current = res.last;
      merge(res.content);
    } catch {
      // eski mesajlar sonraki kaydırmada tekrar denenir
    } finally {
      loadingMoreRef.current = false;
    }
  };

  const dispatch = useCallback(
    async (tempId: number, body: { content?: string; attachmentKey?: string }, preview: Partial<Row>) => {
      const temp: Row = {
        id: tempId,
        conversationId,
        senderId: user?.id ?? 0,
        content: null,
        attachmentUrl: null,
        sharedPost: null,
        readAt: null,
        createdAt: new Date().toISOString(),
        status: 'sending',
        ...preview,
      };
      setPending((p) => [temp, ...p.filter((x) => x.id !== tempId)]);
      try {
        const msg = await sendChatMessage(conversationId, body);
        merge([msg]);
        setPending((p) => p.filter((x) => x.id !== tempId));
      } catch (err) {
        toast.show(errorMessage(err, 'Mesaj gönderilemedi.'), 'error');
        setPending((p) =>
          p.map((x) => (x.id === tempId ? { ...x, status: 'failed', retry: () => dispatch(tempId, body, preview) } : x)),
        );
      }
    },
    [conversationId, merge, toast, user?.id],
  );

  const send = () => {
    const content = text.trim();
    if (!content) return;
    hapticLight();
    setText('');
    dispatch(-Date.now(), { content }, { content });
  };

  const sendPhoto = async () => {
    if (sending) return;
    try {
      const [photo] = await pickPhotos(1);
      if (!photo) return;
      setSending(true);
      const tempId = -Date.now();
      setPending((p) => [{ id: tempId, conversationId, senderId: user?.id ?? 0, content: null, attachmentUrl: photo.uri, sharedPost: null, readAt: null, createdAt: new Date().toISOString(), status: 'sending' }, ...p]);
      try {
        const attachmentKey = await uploadPhoto(photo);
        merge([await sendChatMessage(conversationId, { attachmentKey })]);
        setPending((p) => p.filter((x) => x.id !== tempId));
      } catch (err) {
        setPending((p) => p.filter((x) => x.id !== tempId));
        toast.show(errorMessage(err, 'Fotoğraf gönderilemedi.'), 'error');
      }
    } catch (err) {
      toast.show(errorMessage(err, 'Fotoğraf seçilemedi.'), 'error');
    } finally {
      setSending(false);
    }
  };

  const block = () => {
    const other = conv.data;
    if (!other) return;
    Alert.alert('Kullanıcıyı engelle', `${other.otherUserName} sana mesaj gönderemeyecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Engelle',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(other.otherUserId);
            router.back();
          } catch (err) {
            Alert.alert('İşlem yapılamadı', errorMessage(err));
          }
        },
      },
    ]);
  };

  const report = (m: ChatMessage) =>
    Alert.alert('Mesajı şikayet et', 'Bu mesaj topluluk kurallarına aykırı mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Şikayet et',
        style: 'destructive',
        onPress: async () => {
          try {
            await reportMessage(m.id);
            toast.show('Şikayetin alındı, teşekkürler.', 'success');
          } catch (err) {
            Alert.alert('İşlem yapılamadı', errorMessage(err));
          }
        },
      },
    ]);

  if (loading && messages.length === 0) return <Loading />;
  if (error && messages.length === 0) return <ErrorState message={error} onRetry={loadNewest} />;
  const canMessage = conv.data?.canMessage ?? true;
  const otherName = conv.data?.otherUserName ?? 'Sohbet';

  const received = t.mode === 'dark' ? '#26332F' : '#E6EBE9';
  const rows: Row[] = [...pending, ...messages];
  // Karşı tarafın okuduğu son mesajım / hâlâ okunmamış en yeni mesajım
  const lastMineId = rows.find((m) => m.senderId === user?.id && m.status !== 'sending')?.id;

  const openMenu = () =>
    setSheet({
      title: otherName,
      actions: [
        ...(conv.data ? [{ label: 'Profili gör', icon: 'person-outline' as const, onPress: () => router.push({ pathname: '/users/[id]', params: { id: String(conv.data!.otherUserId) } }) }] : []),
        { label: 'Kullanıcıyı engelle', icon: 'ban-outline', destructive: true, onPress: block },
      ],
    });

  const renderItem = ({ item, index }: { item: Row; index: number }) => {
    const mine = item.senderId === user?.id;
    const newer = rows[index - 1]; // listede bir önceki = daha yeni
    const older = rows[index + 1];
    const sameAsOlder = !!older && older.senderId === item.senderId && ms(item) - ms(older) < GROUP_GAP_MS;
    const sameAsNewer = !!newer && newer.senderId === item.senderId && ms(newer) - ms(item) < GROUP_GAP_MS;
    const showSeparator = !older || ms(item) - ms(older) > SEPARATOR_GAP_MS;
    const lastInGroup = !sameAsNewer;
    const firstInGroup = !sameAsOlder;
    const photoOnly = !!item.attachmentUrl && !item.content && !item.sharedPost;
    const R = 20;
    const small = 5;

    // iMessage gibi: yalnızca grubun son balonunda "kuyruk" (küçük köşe) olur.
    const bubbleRadius = {
      borderTopLeftRadius: R,
      borderTopRightRadius: R,
      borderBottomLeftRadius: !mine && lastInGroup ? small : R,
      borderBottomRightRadius: mine && lastInGroup ? small : R,
    };

    const body = (
      <>
        {item.attachmentUrl && (
          <Pressable accessibilityRole="imagebutton" accessibilityLabel="Fotoğrafı büyüt" onPress={() => setViewerUrl(item.attachmentUrl)} disabled={item.status === 'sending'}>
            <Image source={{ uri: item.attachmentUrl }} contentFit="cover" transition={150} style={{ width: 230, height: 230, borderRadius: photoOnly ? R : 14, opacity: item.status === 'sending' ? 0.6 : 1, backgroundColor: t.surfaceAlt }} accessibilityLabel="Gönderilen fotoğraf" />
          </Pressable>
        )}
        {item.sharedPost && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Paylaşılan gönderi: ${item.sharedPost.title}`}
            onPress={() => router.push({ pathname: '/post/[id]', params: { id: String(item.sharedPost!.id) } })}
            style={{ backgroundColor: mine ? 'rgba(255,255,255,0.16)' : t.surface, borderRadius: 14, overflow: 'hidden', width: 230 }}
          >
            {item.sharedPost.thumbnailUrl ? (
              <Image source={{ uri: item.sharedPost.thumbnailUrl }} contentFit="cover" style={{ width: '100%', height: 120, backgroundColor: t.surfaceAlt }} />
            ) : null}
            <View style={{ padding: 10, gap: 2 }}>
              <Txt variant="caption" color={mine ? 'rgba(255,255,255,0.8)' : t.inkMuted}>{item.sharedPost.authorName}</Txt>
              <Txt variant="small" color={mine ? t.onPrimary : t.ink} style={{ fontWeight: '700' }} numberOfLines={2}>{item.sharedPost.title}</Txt>
              {item.sharedPost.contentSnippet ? <Txt variant="caption" color={mine ? 'rgba(255,255,255,0.8)' : t.inkSoft} numberOfLines={2}>{item.sharedPost.contentSnippet}</Txt> : null}
            </View>
          </Pressable>
        )}
        {item.content ? <Txt variant="body" color={mine ? t.onPrimary : t.ink} style={{ fontSize: 16, lineHeight: 21 }}>{item.content}</Txt> : null}
      </>
    );

    const statusText =
      item.status === 'failed'
        ? 'Gönderilemedi. Tekrar denemek için dokun.'
        : item.id === lastMineId && mine
          ? item.readAt
            ? 'Okundu'
            : 'İletildi'
          : null;

    return (
      <View style={{ marginTop: firstInGroup ? 10 : 2 }}>
        {showSeparator && (
          <Txt variant="caption" muted style={{ textAlign: 'center', marginVertical: 10 }}>{chatTimeLabel(item.createdAt)}</Txt>
        )}
        <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
          <Pressable
            onPress={item.status === 'failed' ? item.retry : undefined}
            onLongPress={
              mine || item.status
                ? undefined
                : () => {
                    hapticLight();
                    setSheet({ actions: [{ label: 'Mesajı şikayet et', icon: 'flag-outline', destructive: true, onPress: () => report(item) }] });
                  }
            }
            delayLongPress={300}
            style={
              photoOnly
                ? { borderRadius: R, overflow: 'hidden' }
                : {
                    backgroundColor: item.status === 'failed' ? t.rose : mine ? t.primary : received,
                    ...bubbleRadius,
                    paddingHorizontal: 13,
                    paddingVertical: 8,
                    gap: 6,
                    opacity: item.status === 'sending' ? 0.7 : 1,
                  }
            }
          >
            {body}
          </Pressable>
          {statusText && (
            <Txt variant="caption" color={item.status === 'failed' ? t.rose : t.inkMuted} style={{ marginTop: 3, marginRight: 4, fontSize: 11.5 }}>{statusText}</Txt>
          )}
        </View>
      </View>
    );
  };

  const hasText = text.trim().length > 0;

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: t.background }}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${otherName} profili`}
              disabled={!conv.data}
              onPress={() => conv.data && router.push({ pathname: '/users/[id]', params: { id: String(conv.data.otherUserId) } })}
              style={{ alignItems: 'center', gap: 2 }}
            >
              <Avatar name={otherName} size={32} />
              <Txt variant="caption" style={{ fontWeight: '700' }} numberOfLines={1}>{otherName}</Txt>
            </Pressable>
          ),
          headerTitleAlign: 'center',
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Diğer seçenekler" onPress={openMenu} hitSlop={10}>
              <Ionicons name="ellipsis-horizontal-circle-outline" size={26} color={t.primary} />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={kbOffset}>
        <FlatList
          inverted
          data={rows}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          ListEmptyComponent={<Txt variant="small" muted style={{ textAlign: 'center', padding: 24 }}>Henüz mesaj yok. İlk mesajı sen yaz.</Txt>}
          renderItem={renderItem}
        />
        {canMessage ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: t.background }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fotoğraf gönder"
              disabled={sending}
              hitSlop={6}
              onPress={sendPhoto}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: received, alignItems: 'center', justifyContent: 'center', marginBottom: 2, opacity: sending ? 0.5 : 1 }}
            >
              <Ionicons name="add" size={24} color={t.inkSoft} />
            </Pressable>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: t.surface, borderRadius: 20, borderWidth: 1, borderColor: t.borderStrong, paddingLeft: 14, paddingRight: 4, minHeight: 38 }}>
              <TextInput
                accessibilityLabel="Mesaj yaz"
                value={text}
                onChangeText={setText}
                placeholder="Mesaj"
                placeholderTextColor={t.inkMuted}
                multiline
                maxLength={4000}
                style={{ flex: 1, color: t.ink, fontSize: 16, maxHeight: 120, paddingTop: Platform.OS === 'ios' ? 9 : 7, paddingBottom: Platform.OS === 'ios' ? 9 : 7 }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mesajı gönder"
                hitSlop={8}
                disabled={!hasText}
                onPress={send}
                style={{ width: 36, height: 36, borderRadius: 18, margin: 2, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', opacity: hasText ? 1 : 0.35, alignSelf: 'flex-end' }}
              >
                <Ionicons name="arrow-up" size={19} color={t.onPrimary} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ padding: 14, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border }}>
            <Txt variant="small" muted style={{ textAlign: 'center' }}>Bu sohbete mesaj gönderemezsin.</Txt>
          </View>
        )}
      </KeyboardAvoidingView>
      <ImageViewer images={viewerUrl ? [{ id: 0, url: viewerUrl, sortOrder: 0 }] : []} index={0} visible={!!viewerUrl} onClose={() => setViewerUrl(null)} />
      <ActionSheet visible={!!sheet} title={sheet?.title} actions={sheet?.actions ?? []} onClose={() => setSheet(null)} />
    </SafeAreaView>
  );
}
