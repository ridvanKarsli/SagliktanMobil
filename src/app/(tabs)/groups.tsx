import { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip, EmptyState, ErrorState, Loading, Screen, TextField, Txt, useListContent } from '@/components/ui';
import { listDiseaseGroups } from '@/api/endpoints';
import { useTheme } from '@/theme/ThemeContext';
import { formatCount } from '@/utils/format';
import { useAsync } from '@/utils/useAsync';

export default function GroupsScreen() {
  const listContent = useListContent(12);
  const t = useTheme();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const groups = useAsync((signal) => listDiseaseGroups(debounced || undefined, signal), [debounced]);

  return (
    <Screen edges={['left', 'right']} padded={false}>
      <View style={{ padding: 16, gap: 12 }}>
        <TextField label="Grup ara" value={query} onChangeText={setQuery} placeholder="Örn. diyabet" autoCapitalize="none" returnKeyType="search" />
      </View>
      {groups.loading && !groups.data ? (
        <Loading />
      ) : groups.error && !groups.data ? (
        <ErrorState message={groups.error} onRetry={groups.reload} />
      ) : (
        <FlatList
          data={groups.data ?? []}
          keyExtractor={(g) => String(g.id)}
          contentContainerStyle={{ ...listContent, paddingTop: 0 }}
          refreshing={groups.refreshing}
          onRefresh={groups.refresh}
          ListEmptyComponent={<EmptyState title="Grup bulunamadı" text="Farklı bir arama dene." />}
          renderItem={({ item }) => (
            <Card onPress={() => router.push({ pathname: '/groups/[id]', params: { id: String(item.id) } })} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Txt variant="h3" style={{ flex: 1 }}>{item.name}</Txt>
                <Ionicons name="chevron-forward" size={20} color={t.inkMuted} />
              </View>
              {item.description ? <Txt variant="small" muted numberOfLines={2}>{item.description}</Txt> : null}
              <Chip label={`${formatCount(item.memberCount)} üye`} icon="people-outline" />
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
