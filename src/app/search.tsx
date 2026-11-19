import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Card, EmptyState, ErrorState, Loading, TextField, Txt, useListContent } from '@/components/ui';
import { PostCard } from '@/components/post';
import { quickSearch } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { fullNameOf } from '@/utils/format';
import { useAsync } from '@/utils/useAsync';

export default function SearchScreen() {
  const listContent = useListContent(12);
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  const enabled = debounced.length >= 2;
  const result = useAsync(
    (signal) => (enabled ? quickSearch(debounced, signal) : Promise.resolve(null)),
    [debounced],
  );
  const data = result.data;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <TextField
          label="Ara"
          value={query}
          onChangeText={setQuery}
          placeholder="Gönderi, yorum ya da kişi ara"
          autoFocus
          autoCapitalize="none"
          returnKeyType="search"
          helper="En az 2 harf yaz."
        />
      </View>
      <ScrollView contentContainerStyle={{ ...listContent, paddingTop: 0 }} keyboardShouldPersistTaps="handled">
        {!enabled ? null : result.loading && !data ? (
          <Loading />
        ) : result.error && !data ? (
          <ErrorState message={result.error} onRetry={result.reload} />
        ) : data && data.posts.length === 0 && data.users.length === 0 ? (
          <EmptyState icon="search-outline" title="Sonuç bulunamadı" text="Farklı kelimelerle tekrar dene." />
        ) : data ? (
          <>
            {data.users.length > 0 && <Txt variant="h3">Kişiler</Txt>}
            {data.users.map((u) => (
              <Card key={u.id} onPress={() => router.push({ pathname: '/users/[id]', params: { id: String(u.id) } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={fullNameOf(u)} size={44} />
                <View style={{ flex: 1 }}>
                  <Txt variant="small" style={{ fontWeight: '700' }}>{fullNameOf(u)}</Txt>
                  {u.bio ? <Txt variant="caption" muted numberOfLines={1}>{u.bio}</Txt> : null}
                </View>
              </Card>
            ))}
            {data.posts.length > 0 && <Txt variant="h3">Gönderiler</Txt>}
            {data.posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                ownId={user?.id}
                showGroup
                onChange={(next) => result.setData((prev) => (prev ? { ...prev, posts: prev.posts.map((x) => (x.id === next.id ? next : x)) } : prev))}
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
