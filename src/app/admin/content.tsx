import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import AdminGuard from '@/components/AdminGuard';
import { Button, Card, EmptyState, ErrorState, Loading, TextField, Txt, useListContent } from '@/components/ui';
import { errorMessage } from '@/api/client';
import { deleteComment, deletePost, listAdminComments, listAdminPosts } from '@/api/endpoints';
import { useTheme } from '@/theme/ThemeContext';
import { relativeTime } from '@/utils/format';
import { usePagedList } from '@/utils/usePagedList';

function Content() {
  const listContent = useListContent(12);
  const t = useTheme();
  const [tab, setTab] = useState<'posts' | 'comments'>('posts');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  const posts = usePagedList((page, signal) => (tab === 'posts' ? listAdminPosts({ q: debounced || undefined, page, signal }) : Promise.resolve({ content: [], page: 0, size: 0, totalElements: 0, totalPages: 0, last: true })), [tab, debounced]);
  const comments = usePagedList((page, signal) => (tab === 'comments' ? listAdminComments({ q: debounced || undefined, page, signal }) : Promise.resolve({ content: [], page: 0, size: 0, totalElements: 0, totalPages: 0, last: true })), [tab, debounced]);

  const confirmDelete = (what: string, run: () => Promise<unknown>, after: () => void) =>
    Alert.alert(`${what} silinsin mi?`, 'Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await run();
            after();
          } catch (err) {
            Alert.alert('Silinemedi', errorMessage(err));
          }
        },
      },
    ]);

  const header = (
    <View style={{ gap: 12, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['posts', 'comments'] as const).map((k) => {
          const selected = tab === k;
          return (
            <Pressable
              key={k}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setTab(k)}
              style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: selected ? t.primary : t.surface, borderWidth: 1, borderColor: selected ? t.primary : t.borderStrong }}
            >
              <Txt variant="small" color={selected ? t.onPrimary : t.ink} style={{ fontWeight: '700' }}>{k === 'posts' ? 'Gönderiler' : 'Yorumlar'}</Txt>
            </Pressable>
          );
        })}
      </View>
      <TextField label="Ara" value={query} onChangeText={setQuery} autoCapitalize="none" />
    </View>
  );

  const active = tab === 'posts' ? posts : comments;
  if (active.loading && active.items.length === 0) return <Loading />;

  if (tab === 'posts') {
    return (
      <FlatList
        data={posts.items}
        keyExtractor={(p) => String(p.id)}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={listContent}
        refreshing={posts.refreshing}
        onRefresh={posts.refresh}
        onEndReached={posts.loadMore}
        ListEmptyComponent={posts.error ? <ErrorState message={posts.error} onRetry={posts.reload} /> : <EmptyState title="Gönderi yok" />}
        renderItem={({ item }) => (
          <Card style={{ gap: 8 }}>
            <Txt variant="caption" muted>{item.authorName} · {relativeTime(item.createdAt)}</Txt>
            <Txt variant="h3">{item.title}</Txt>
            <Txt variant="small" muted numberOfLines={4}>{item.content}</Txt>
            {item.attachments.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {item.attachments.slice(0, 3).map((a) => (
                  <Image key={a.id} source={{ uri: a.url }} style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: t.surfaceAlt }} accessibilityLabel="Gönderideki fotoğraf" />
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Aç" variant="outline" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/post/[id]', params: { id: String(item.id) } })} />
              <Button title="Sil" variant="danger" style={{ flex: 1 }} onPress={() => confirmDelete('Gönderi', () => deletePost(item.id), () => posts.setItems((prev) => prev.filter((x) => x.id !== item.id)))} />
            </View>
          </Card>
        )}
      />
    );
  }
  return (
    <FlatList
      data={comments.items}
      keyExtractor={(c) => String(c.id)}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={listContent}
      refreshing={comments.refreshing}
      onRefresh={comments.refresh}
      onEndReached={comments.loadMore}
      ListEmptyComponent={comments.error ? <ErrorState message={comments.error} onRetry={comments.reload} /> : <EmptyState title="Yorum yok" />}
      renderItem={({ item }) => (
        <Card style={{ gap: 8 }}>
          <Txt variant="caption" muted>{item.authorName} · {relativeTime(item.createdAt)}{item.deleted ? ' · silinmiş' : ''}</Txt>
          <Txt variant="small">{item.content}</Txt>
          {!item.deleted && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Gönderiyi aç" variant="outline" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/post/[id]', params: { id: String(item.postId) } })} />
              <Button title="Sil" variant="danger" style={{ flex: 1 }} onPress={() => confirmDelete('Yorum', () => deleteComment(item.id), () => comments.setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, deleted: true } : x))))} />
            </View>
          )}
        </Card>
      )}
    />
  );
}

export default function AdminContent() {
  return (
    <AdminGuard>
      <Content />
    </AdminGuard>
  );
}
