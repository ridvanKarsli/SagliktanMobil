import { useCallback } from 'react';
import { FlatList, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, EmptyState, ErrorState, Loading, Txt, useListContent } from '@/components/ui';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/api/endpoints';
import type { AppNotification } from '@/api/types';
import { useBadgeCounts } from '@/context/BadgeContext';
import { useTheme } from '@/theme/ThemeContext';
import { relativeTime } from '@/utils/format';
import { usePagedList } from '@/utils/usePagedList';
import { useRealtime } from '@/realtime/useRealtime';

const COPY: Record<AppNotification['type'], { text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  NEW_COMMENT: { text: 'gönderine yorum yaptı', icon: 'chatbubble-outline' },
  COMMENT_REPLY: { text: 'yorumuna yanıt verdi', icon: 'return-down-forward-outline' },
  ANSWER_ACCEPTED: { text: 'yorumunu en iyi cevap seçti', icon: 'checkmark-circle-outline' },
};

export default function NotificationsScreen() {
  const listContent = useListContent(10);
  const t = useTheme();
  const badges = useBadgeCounts();
  const list = usePagedList((page, signal) => listNotifications({ page, signal }), []);

  useRealtime('/user/queue/notifications', () => list.refresh());

  useFocusEffect(
    useCallback(() => {
      list.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const open = async (n: AppNotification) => {
    if (!n.read) {
      list.setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      markNotificationRead(n.id).then(badges.refresh).catch(() => {
        // okundu işareti ikincil; hata sessizce yok sayılır
      });
    }
    if (n.postId) router.push({ pathname: '/post/[id]', params: { id: String(n.postId) } });
  };

  const readAll = async () => {
    list.setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    try {
      await markAllNotificationsRead();
      badges.refresh();
    } catch {
      list.refresh();
    }
  };

  const header = (
    list.items.some((n) => !n.read) ? (
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button title="Tümünü okundu yap" variant="ghost" onPress={readAll} />
      </View>
    ) : (
      <View />
    )
  );

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: t.background }}>
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(n) => String(n.id)}
          ListHeaderComponent={header}
          contentContainerStyle={listContent}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          onEndReached={list.loadMore}
          ListEmptyComponent={
            list.error ? (
              <ErrorState message={list.error} onRetry={list.reload} />
            ) : (
              <EmptyState icon="notifications-outline" title="Bildirimin yok" text="Gönderine yorum geldiğinde burada görünür." />
            )
          }
          renderItem={({ item }) => {
            const c = COPY[item.type] ?? COPY.NEW_COMMENT;
            return (
              <Card
                onPress={() => open(item)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: item.read ? t.surface : t.primarySoft }}
              >
                <Ionicons name={c.icon} size={22} color={t.primary} />
                <View style={{ flex: 1 }}>
                  <Txt variant="small">
                    <Txt variant="small" style={{ fontWeight: '700' }}>{item.actorName}</Txt> {c.text}
                  </Txt>
                  <Txt variant="caption" muted>{relativeTime(item.createdAt)}</Txt>
                </View>
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
