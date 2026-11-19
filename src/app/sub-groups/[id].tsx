import { useCallback, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PostList from '@/components/PostList';
import { Button, Txt } from '@/components/ui';
import { getSubGroup, listPostsBySubGroup } from '@/api/endpoints';
import type { PostSort } from '@/api/types';
import { useTheme } from '@/theme/ThemeContext';
import { useAsync } from '@/utils/useAsync';
import { usePagedList } from '@/utils/usePagedList';

export default function SubGroupScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const subGroupId = Number(id);
  const [sort, setSort] = useState<PostSort>('RECENT');
  const sub = useAsync(() => getSubGroup(subGroupId), [subGroupId]);
  const list = usePagedList((page, signal) => listPostsBySubGroup(subGroupId, { page, sort, signal }), [subGroupId, sort]);

  // Yeni gönderi ekranından dönünce listeyi tazele.
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      list.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subGroupId, sort]),
  );

  const newPost = () => router.push({ pathname: '/new-post', params: { subGroupId: String(subGroupId) } });

  const header = (
    <View style={{ gap: 12, marginBottom: 12 }}>
      {sub.data?.description ? <Txt muted>{sub.data.description}</Txt> : null}
      <Button title="Yeni gönderi" icon="create-outline" onPress={newPost} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['RECENT', 'POPULAR'] as PostSort[]).map((s) => {
          const selected = sort === s;
          return (
            <Pressable
              key={s}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setSort(s)}
              style={{
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 16,
                borderRadius: 999,
                backgroundColor: selected ? t.primary : t.surface,
                borderWidth: 1,
                borderColor: selected ? t.primary : t.borderStrong,
              }}
            >
              <Ionicons name={s === 'RECENT' ? 'time-outline' : 'flame-outline'} size={16} color={selected ? t.onPrimary : t.ink} />
              <Txt variant="small" color={selected ? t.onPrimary : t.ink} style={{ fontWeight: '700' }}>
                {s === 'RECENT' ? 'En yeni' : 'Popüler'}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: sub.data?.name ?? 'Konu' }} />
      <PostList
        list={list}
        header={header}
        emptyTitle="Henüz paylaşım yok"
        emptyText="İlk paylaşımı sen yap; deneyimin birine iyi gelebilir."
      />
    </>
  );
}
