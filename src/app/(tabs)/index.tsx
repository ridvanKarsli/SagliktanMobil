import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PostList from '@/components/PostList';
import { Button, Txt } from '@/components/ui';
import { getFeed } from '@/api/endpoints';
import type { PostSort } from '@/api/types';
import { useTheme } from '@/theme/ThemeContext';
import { usePagedList } from '@/utils/usePagedList';

const SORTS: { value: PostSort; label: string }[] = [
  { value: 'RECENT', label: 'En yeni' },
  { value: 'POPULAR', label: 'Popüler' },
];

export default function FeedScreen() {
  const t = useTheme();
  const [sort, setSort] = useState<PostSort>('RECENT');
  const list = usePagedList((page, signal) => getFeed({ page, sort, signal }), [sort]);

  const header = (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ara"
        onPress={() => router.push('/search')}
        style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderStrong }}
      >
        <Ionicons name="search" size={20} color={t.ink} />
      </Pressable>
      {SORTS.map((s) => {
        const selected = sort === s.value;
        return (
          <Pressable
            key={s.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setSort(s.value)}
            style={{
              minHeight: 44,
              justifyContent: 'center',
              paddingHorizontal: 16,
              borderRadius: 999,
              backgroundColor: selected ? t.primary : t.surface,
              borderWidth: 1,
              borderColor: selected ? t.primary : t.borderStrong,
            }}
          >
            <Txt variant="small" color={selected ? t.onPrimary : t.ink} style={{ fontWeight: '700' }}>{s.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <PostList
      list={list}
      header={header}
      showGroup
      emptyTitle="Akışın henüz boş"
      emptyText="Bir hastalık grubuna katıl; o gruplardaki paylaşımlar burada görünür."
      emptyAction={<Button title="Gruplara göz at" onPress={() => router.push('/groups')} />}
    />
  );
}
