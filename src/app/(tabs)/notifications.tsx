import { ListSkeleton } from '@/components/feedback';
import { useCallback } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Button, EmptyState, ErrorState, Txt, useListContent } from '@/components/ui';
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
        <ListSkeleton kind="row" count={6} />
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.actorName} ${c.text}${item.read ? '' : ', okunmamış'}`}
                onPress={() => open(item)}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, marginHorizontal: -16, paddingHorizontal: 16, backgroundColor: pressed ? t.surfaceAlt : item.read ? 'transparent' : t.primarySoft })}
              >
                <View>
                  <Avatar name={item.actorName} size={40} />
                  <View style={{ position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border }}>
                    <Ionicons name={c.icon} size={13} color={t.primary} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="small">
                    <Txt variant="small" style={{ fontWeight: '800' }}>{item.actorName}</Txt> {c.text}
                  </Txt>
                  <Txt variant="caption" muted>{relativeTime(item.createdAt)}</Txt>
                </View>
                {!item.read && <View accessibilityElementsHidden style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.primary }} />}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
