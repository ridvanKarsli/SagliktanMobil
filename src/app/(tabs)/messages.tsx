import { FlatList, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Card, EmptyState, ErrorState, Loading, Txt, useListContent } from '@/components/ui';
import { listConversations } from '@/api/endpoints';
import { useBadgeCounts } from '@/context/BadgeContext';
import { useTheme } from '@/theme/ThemeContext';
import { relativeTime } from '@/utils/format';
import { usePagedList } from '@/utils/usePagedList';
import { useRealtime } from '@/realtime/useRealtime';

export default function MessagesScreen() {
  const listContent = useListContent(10);
  const t = useTheme();
  const badges = useBadgeCounts();
  const list = usePagedList((page, signal) => listConversations({ page, signal }), []);

  useRealtime('/user/queue/messages', () => list.refresh());
  useRealtime('/user/queue/message-requests', () => badges.refresh());

  // Sohbetten dönünce liste ve rozetler tazelenir.
  useFocusEffect(
    useCallback(() => {
      list.refresh();
      badges.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const header = (
    <View style={{ gap: 12, marginBottom: 12 }}>
      <Card onPress={() => router.push('/message-requests')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name="mail-unread-outline" size={22} color={t.primary} />
        <Txt variant="small" style={{ flex: 1, fontWeight: '700' }}>
          Mesaj istekleri{badges.requests > 0 ? ` (${badges.requests})` : ''}
        </Txt>
        <Ionicons name="chevron-forward" size={20} color={t.inkMuted} />
      </Card>
    </View>
  );

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: t.background }}>
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(c) => String(c.id)}
          ListHeaderComponent={header}
          contentContainerStyle={listContent}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          onEndReached={list.loadMore}
          ListEmptyComponent={
            list.error ? (
              <ErrorState message={list.error} onRetry={list.reload} />
            ) : (
              <EmptyState icon="chatbubbles-outline" title="Henüz sohbetin yok" text="Bir üyenin profilinden mesaj isteği gönderebilirsin." />
            )
          }
          renderItem={({ item }) => (
            <Card onPress={() => router.push({ pathname: '/chat/[id]', params: { id: String(item.id) } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={item.otherUserName} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Txt variant="small" style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>{item.otherUserName}</Txt>
                  <Txt variant="caption" muted>{relativeTime(item.lastMessageAt)}</Txt>
                </View>
                <Txt variant="small" muted numberOfLines={1}>
                  {item.lastMessagePreview ?? (item.lastMessageHasAttachment ? 'Fotoğraf' : item.lastMessageHasSharedPost ? 'Paylaşılan gönderi' : 'Sohbet başladı')}
                </Txt>
              </View>
              {item.unreadCount > 0 && (
                <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                  <Txt variant="caption" color={t.onPrimary}>{item.unreadCount}</Txt>
                </View>
              )}
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}
