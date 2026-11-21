import { ActivityIndicator, FlatList, View, type ListRenderItem } from 'react-native';
import { EmptyState, ErrorState, useListContent } from '@/components/ui';
import { ListSkeleton } from '@/components/feedback';
import { PostCard } from '@/components/post';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import type { Post } from '@/api/types';
import type { usePagedList } from '@/utils/usePagedList';
import type { ReactElement, ReactNode } from 'react';

type Paged = ReturnType<typeof usePagedList<Post>>;

// Gönderi listesi: yükleme, hata, boş durum, sonsuz kaydırma, çek-yenile.
export default function PostList({
  list,
  header,
  emptyTitle,
  emptyText,
  emptyAction,
  showGroup = false,
}: {
  list: Paged;
  header?: ReactElement;
  emptyTitle: string;
  emptyText?: string;
  emptyAction?: ReactNode;
  showGroup?: boolean;
}) {
  const t = useTheme();
  const { user } = useAuth();
  const listContent = useListContent(spacing.md);

  const render: ListRenderItem<Post> = ({ item }) => (
    <PostCard
      post={item}
      ownId={user?.id}
      showGroup={showGroup}
      onChange={(next) => list.setItems((prev) => prev.map((p) => (p.id === next.id ? next : p)))}
    />
  );

  if (list.loading && list.items.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ padding: spacing.lg, paddingBottom: 0 }}>{header}</View>
        <ListSkeleton kind="post" />
      </View>
    );
  }

  return (
    <FlatList
      data={list.items}
      keyExtractor={(p) => String(p.id)}
      renderItem={render}
      ListHeaderComponent={header}
      contentContainerStyle={listContent}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      ListEmptyComponent={
        list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : (
          <EmptyState title={emptyTitle} text={emptyText} action={emptyAction} />
        )
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={t.primary} style={{ padding: 16 }} /> : undefined}
    />
  );
}
