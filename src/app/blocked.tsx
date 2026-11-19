import { Alert, FlatList, View } from 'react-native';
import { Avatar, Button, Card, EmptyState, ErrorState, Loading, Txt, useListContent } from '@/components/ui';
import { errorMessage } from '@/api/client';
import { listBlockedUsers, unblockUser } from '@/api/endpoints';
import { useAsync } from '@/utils/useAsync';

export default function BlockedScreen() {
  const listContent = useListContent(12);
  const blocked = useAsync(() => listBlockedUsers(), []);

  const unblock = async (userId: number) => {
    try {
      await unblockUser(userId);
      blocked.setData((prev) => (prev ? prev.filter((b) => b.userId !== userId) : prev));
    } catch (err) {
      Alert.alert('İşlem yapılamadı', errorMessage(err));
    }
  };

  if (blocked.loading && !blocked.data) return <Loading />;
  if (!blocked.data) return <ErrorState message={blocked.error ?? 'Liste yüklenemedi.'} onRetry={blocked.reload} />;

  return (
    <FlatList
      data={blocked.data}
      keyExtractor={(b) => String(b.id)}
      contentContainerStyle={listContent}
      refreshing={blocked.refreshing}
      onRefresh={blocked.refresh}
      ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" title="Engellediğin kimse yok" text="Engellediğin kişiler sana mesaj gönderemez." />}
      renderItem={({ item }) => (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={item.userName} size={44} />
          <View style={{ flex: 1 }}>
            <Txt variant="small" style={{ fontWeight: '700' }}>{item.userName}</Txt>
          </View>
          <Button title="Engeli kaldır" variant="outline" onPress={() => unblock(item.userId)} />
        </Card>
      )}
    />
  );
}
