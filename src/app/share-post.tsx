import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Avatar, Card, EmptyState, ErrorState, Loading, Txt, useListContent } from '@/components/ui';
import { errorMessage } from '@/api/client';
import { useToast } from '@/components/feedback';
import { listConversations, sendChatMessage } from '@/api/endpoints';
import { usePagedList } from '@/utils/usePagedList';

// Bir gönderiyi mevcut bir sohbete gönderir.
export default function SharePostScreen() {
  const listContent = useListContent(10);
  const toast = useToast();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const list = usePagedList((page, signal) => listConversations({ page, signal }), []);
  const [sendingId, setSendingId] = useState<number | null>(null);

  const send = async (conversationId: number) => {
    setSendingId(conversationId);
    try {
      await sendChatMessage(conversationId, { sharedPostId: Number(postId) });
      toast.show('Gönderi gönderildi.', 'success');
      router.back();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setSendingId(null);
    }
  };

  if (list.loading && list.items.length === 0) return <Loading />;
  if (list.error && list.items.length === 0) return <ErrorState message={list.error} onRetry={list.reload} />;
  const available = list.items.filter((c) => c.canMessage);

  return (
    <FlatList
      data={available}
      keyExtractor={(c) => String(c.id)}
      contentContainerStyle={listContent}
      onEndReached={list.loadMore}
      ListHeaderComponent={<Txt variant="small" muted style={{ marginBottom: 8 }}>Gönderiyi kime göndermek istiyorsun?</Txt>}
      ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title="Gönderebileceğin sohbet yok" text="Önce bir üyeyle sohbet başlat." />}
      renderItem={({ item }) => (
        <Card
          onPress={() => (sendingId ? undefined : send(item.id))}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: sendingId === item.id ? 0.6 : 1 }}
        >
          <Avatar name={item.otherUserName} size={40} />
          <View style={{ flex: 1 }}>
            <Txt variant="small" style={{ fontWeight: '700' }}>{item.otherUserName}</Txt>
          </View>
        </Card>
      )}
    />
  );
}
