import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PostList from '@/components/PostList';
import { Avatar, Chip, Txt } from '@/components/ui';
import { getMyPosts, getMySavedPosts } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { formatCount, fullNameOf } from '@/utils/format';
import { usePagedList } from '@/utils/usePagedList';
import { SafeAreaView } from 'react-native-safe-area-context';

const ROLE_LABEL: Record<string, string> = {
  PATIENT: 'Hasta',
  CAREGIVER: 'Hasta yakını',
  PROFESSIONAL: 'Sağlık profesyoneli',
  OTHER: 'Üye',
};

export default function ProfileScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const [tab, setTab] = useState<'posts' | 'saved'>('posts');
  const list = usePagedList(
    (page, signal) => (tab === 'posts' ? getMyPosts({ page, signal }) : getMySavedPosts({ page, signal })),
    [tab],
  );

  if (!user) return null;

  const header = (
    <View style={{ gap: 14, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={fullNameOf(user)} size={72} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="h2" numberOfLines={1}>{fullNameOf(user)}</Txt>
          {user.communityRole && <Chip label={ROLE_LABEL[user.communityRole] ?? 'Üye'} />}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ayarlar"
          onPress={() => router.push('/settings')}
          style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}
        >
          <Ionicons name="settings-outline" size={22} color={t.ink} />
        </Pressable>
      </View>
      {user.bio ? <Txt muted>{user.bio}</Txt> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          ['Gönderi', user.postCount],
          ['Yorum', user.commentCount],
          ['Faydalı', user.helpedPeople],
        ].map(([label, n]) => (
          <View key={label as string} style={{ flex: 1, backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, paddingVertical: 12, alignItems: 'center' }}>
            <Txt variant="h3">{formatCount(n as number)}</Txt>
            <Txt variant="caption" muted>{label as string}</Txt>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['posts', 'saved'] as const).map((k) => {
          const selected = tab === k;
          return (
            <Pressable
              key={k}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setTab(k)}
              style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: selected ? t.primary : t.surface, borderWidth: 1, borderColor: selected ? t.primary : t.borderStrong }}
            >
              <Txt variant="small" color={selected ? t.onPrimary : t.ink} style={{ fontWeight: '700' }}>
                {k === 'posts' ? 'Gönderilerim' : 'Kaydedilenler'}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: t.background }}>
      <PostList
        list={list}
        header={header}
        showGroup
        emptyTitle={tab === 'posts' ? 'Henüz gönderin yok' : 'Kaydettiğin gönderi yok'}
        emptyText={tab === 'posts' ? 'Bir gruba katılıp ilk deneyimini paylaşabilirsin.' : 'Gönderilerdeki yer imi simgesiyle kaydedebilirsin.'}
      />
    </SafeAreaView>
  );
}
