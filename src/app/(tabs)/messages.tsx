import { ListSkeleton } from '@/components/feedback';
import { FlatList, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Card, EmptyState, ErrorState, Txt, useListContent } from '@/components/ui';
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
        <ListSkeleton kind="row" count={6} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(c) => String(c.id)}
          ListHeaderComponent={header}
          contentContainerStyle={{ ...listContent, gap: 0 }}
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
          renderItem={({ item }) => {
            const unread = item.unreadCount > 0;
            const preview = item.lastMessagePreview ?? (item.lastMessageHasAttachment ? 'Fotoğraf' : item.lastMessageHasSharedPost ? 'Bir gönderi paylaştı' : 'Sohbet başladı');
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.otherUserName} ile sohbet${unread ? `, ${item.unreadCount} okunmamış mesaj` : ''}`}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: String(item.id) } })}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'flex-start', paddingRight: 16, marginHorizontal: -16, paddingLeft: 22, backgroundColor: pressed ? t.surfaceAlt : 'transparent' })}
              >
                <View style={{ position: 'absolute', left: 8, top: 29, width: 10, height: 10, borderRadius: 5, backgroundColor: unread ? t.primary : 'transparent' }} />
                <View style={{ paddingVertical: 10, paddingRight: 12 }}>
                  <Avatar name={item.otherUserName} size={48} />
                </View>
                <View style={{ flex: 1, paddingVertical: 10, gap: 2, borderBottomWidth: 1, borderBottomColor: t.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Txt variant="body" style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>{item.otherUserName}</Txt>
                    <Txt variant="small" color={unread ? t.primary : t.inkMuted}>{relativeTime(item.lastMessageAt)}</Txt>
                    <Ionicons name="chevron-forward" size={14} color={t.inkMuted} />
                  </View>
                  <Txt variant="small" color={unread ? t.ink : t.inkSoft} numberOfLines={2} style={{ fontWeight: unread ? '600' : '400' }}>{preview}</Txt>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
