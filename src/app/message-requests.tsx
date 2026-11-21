import { ListSkeleton } from '@/components/feedback';
import { Alert, FlatList, View } from 'react-native';
import { Avatar, Button, Card, EmptyState, ErrorState, Txt, useListContent } from '@/components/ui';
import { errorMessage } from '@/api/client';
import { acceptMessageRequest, listMessageRequests, rejectMessageRequest } from '@/api/endpoints';
import { relativeTime } from '@/utils/format';
import { usePagedList } from '@/utils/usePagedList';

export default function MessageRequestsScreen() {
  const listContent = useListContent(12);
  const list = usePagedList((page, signal) => listMessageRequests({ page, signal }), []);

  const act = async (id: number, accept: boolean) => {
    try {
      if (accept) await acceptMessageRequest(id);
      else await rejectMessageRequest(id);
      list.setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      Alert.alert('İşlem yapılamadı', errorMessage(err));
    }
  };

  if (list.loading && list.items.length === 0) return <ListSkeleton kind="row" count={6} />;
  if (list.error && list.items.length === 0) return <ErrorState message={list.error} onRetry={list.reload} />;

  return (
    <FlatList
      data={list.items}
      keyExtractor={(r) => String(r.id)}
      contentContainerStyle={listContent}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      onEndReached={list.loadMore}
      ListEmptyComponent={<EmptyState icon="mail-open-outline" title="Bekleyen istek yok" />}
      renderItem={({ item }) => (
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={item.senderName} size={40} />
            <View style={{ flex: 1 }}>
              <Txt variant="small" style={{ fontWeight: '700' }}>{item.senderName}</Txt>
              <Txt variant="caption" muted>Sana mesaj göndermek istiyor · {relativeTime(item.createdAt)}</Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Kabul et" onPress={() => act(item.id, true)} style={{ flex: 1 }} />
            <Button title="Reddet" variant="outline" onPress={() => act(item.id, false)} style={{ flex: 1 }} />
          </View>
        </Card>
      )}
    />
  );
}
