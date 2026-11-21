import { useState } from 'react';
import { Pressable, View } from 'react-native';
import PostList from '@/components/PostList';
import { hapticSelect } from '@/utils/haptics';
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

  const stats: [string, number][] = [
    ['Gönderi', user.postCount],
    ['Yorum', user.commentCount],
    ['Faydalı oldu', user.helpedPeople],
  ];

  const header = (
    <View style={{ gap: 16, marginBottom: 16 }}>
      <View style={{ backgroundColor: t.surface, borderRadius: 20, borderWidth: 1, borderColor: t.border, padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar name={fullNameOf(user)} size={64} />
          <View style={{ flex: 1, gap: 6 }}>
            <Txt variant="h2" numberOfLines={1}>{fullNameOf(user)}</Txt>
            {user.communityRole && <Chip label={ROLE_LABEL[user.communityRole] ?? 'Üye'} />}
          </View>
        </View>
        {user.bio ? <Txt variant="small" muted>{user.bio}</Txt> : null}
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: t.border, paddingTop: 14 }}>
          {stats.map(([label, n], i) => (
            <View
              key={label}
              accessible
              accessibilityLabel={`${n} ${label}`}
              style={{ flex: 1, alignItems: 'center', gap: 2, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: t.border }}
            >
              <Txt variant="h3">{formatCount(n)}</Txt>
              <Txt variant="caption" muted>{label}</Txt>
            </View>
          ))}
        </View>
      </View>

      <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: t.surfaceAlt, borderRadius: 12, padding: 3 }}>
        {(['posts', 'saved'] as const).map((k) => {
          const selected = tab === k;
          return (
            <Pressable
              key={k}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => { hapticSelect(); setTab(k); }}
              style={{
                flex: 1,
                minHeight: 38,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? t.surface : 'transparent',
                shadowColor: '#000',
                shadowOpacity: selected ? 0.08 : 0,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 1 },
                elevation: selected ? 1 : 0,
              }}
            >
              <Txt variant="small" color={selected ? t.ink : t.inkSoft} style={{ fontWeight: selected ? '700' : '600' }}>
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
