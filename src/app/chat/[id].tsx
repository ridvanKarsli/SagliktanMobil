import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ErrorState, Loading, Txt } from '@/components/ui';
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
import { relativeTime } from '@/utils/format';
import { pickPhotos, uploadPhoto } from '@/utils/upload';
import { useAsync } from '@/utils/useAsync';
import { useRealtime } from '@/realtime/useRealtime';

const POLL_MS = 8000;

export default function ChatScreen() {
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

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const msg = await sendChatMessage(conversationId, { content });
      setText('');
      merge([msg]);
    } catch (err) {
      Alert.alert('Mesaj gönderilemedi', errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const sendPhoto = async () => {
    if (sending) return;
    try {
      const [photo] = await pickPhotos(1);
      if (!photo) return;
      setSending(true);
      const attachmentKey = await uploadPhoto(photo);
      merge([await sendChatMessage(conversationId, { attachmentKey })]);
    } catch (err) {
      Alert.alert('Fotoğraf gönderilemedi', errorMessage(err));
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
            Alert.alert('Teşekkürler', 'Şikayetin alındı.');
          } catch (err) {
            Alert.alert('İşlem yapılamadı', errorMessage(err));
          }
        },
      },
    ]);

  if (loading && messages.length === 0) return <Loading />;
  if (error && messages.length === 0) return <ErrorState message={error} onRetry={loadNewest} />;
  const canMessage = conv.data?.canMessage ?? true;

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: t.background }}>
      <Stack.Screen
        options={{
          title: conv.data?.otherUserName ?? 'Sohbet',
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Kullanıcıyı engelle" onPress={block} hitSlop={10}>
              <Ionicons name="ban-outline" size={22} color={t.inkSoft} />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={kbOffset}>
        <FlatList
          inverted
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Txt variant="small" muted style={{ textAlign: 'center', padding: 24 }}>Henüz mesaj yok. İlk mesajı sen yaz.</Txt>}
          renderItem={({ item }) => {
            const mine = item.senderId === user?.id;
            return (
              <Pressable
                onLongPress={mine ? undefined : () => report(item)}
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  backgroundColor: mine ? t.primary : t.surface,
                  borderRadius: 18,
                  borderBottomRightRadius: mine ? 6 : 18,
                  borderBottomLeftRadius: mine ? 18 : 6,
                  borderWidth: mine ? 0 : 1,
                  borderColor: t.border,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  gap: 4,
                }}
              >
                {item.attachmentUrl && (
                  <Image source={{ uri: item.attachmentUrl }} style={{ width: 200, height: 200, borderRadius: 12 }} accessibilityLabel="Gönderilen fotoğraf" />
                )}
                {item.sharedPost && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Paylaşılan gönderi: ${item.sharedPost.title}`}
                    onPress={() => router.push({ pathname: '/post/[id]', params: { id: String(item.sharedPost!.id) } })}
                    style={{ backgroundColor: t.background, borderRadius: 12, padding: 10, gap: 2, borderWidth: 1, borderColor: t.border }}
                  >
                    <Txt variant="caption" muted>{item.sharedPost.authorName}</Txt>
                    <Txt variant="small" style={{ fontWeight: '700' }} numberOfLines={2}>{item.sharedPost.title}</Txt>
                    {item.sharedPost.contentSnippet ? <Txt variant="caption" muted numberOfLines={2}>{item.sharedPost.contentSnippet}</Txt> : null}
                  </Pressable>
                )}
                {item.content ? <Txt variant="small" color={mine ? t.onPrimary : t.ink}>{item.content}</Txt> : null}
                <Txt variant="caption" color={mine ? t.onPrimary : t.inkMuted} style={{ opacity: 0.8, alignSelf: 'flex-end' }}>
                  {relativeTime(item.createdAt)}
                </Txt>
              </Pressable>
            );
          }}
        />
        {canMessage ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.surface }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fotoğraf gönder"
              disabled={sending}
              onPress={sendPhoto}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', opacity: sending ? 0.5 : 1 }}
            >
              <Ionicons name="image-outline" size={24} color={t.primary} />
            </Pressable>
            <View style={{ flex: 1, backgroundColor: t.background, borderRadius: 20, borderWidth: 1, borderColor: t.borderStrong, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' }}>
              <TextInput
                accessibilityLabel="Mesaj yaz"
                value={text}
                onChangeText={setText}
                placeholder="Mesaj yaz..."
                placeholderTextColor={t.inkMuted}
                multiline
                maxLength={4000}
                style={{ color: t.ink, fontSize: 16, maxHeight: 110, paddingVertical: 10 }}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mesajı gönder"
              disabled={sending || !text.trim()}
              onPress={send}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', opacity: sending || !text.trim() ? 0.5 : 1 }}
            >
              <Ionicons name="send" size={18} color={t.onPrimary} />
            </Pressable>
          </View>
        ) : (
          <View style={{ padding: 14, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border }}>
            <Txt variant="small" muted style={{ textAlign: 'center' }}>Bu sohbete mesaj gönderemezsin.</Txt>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
