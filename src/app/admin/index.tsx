import { View } from 'react-native';
import { router } from 'expo-router';
import AdminGuard from '@/components/AdminGuard';
import { Card, ErrorState, Loading, Screen, Txt } from '@/components/ui';
import { getAdminStats } from '@/api/endpoints';
import { useTheme } from '@/theme/ThemeContext';
import { formatCount } from '@/utils/format';
import { useAsync } from '@/utils/useAsync';
import { Ionicons } from '@expo/vector-icons';

const LINKS = [
  { href: '/admin/reports', label: 'Şikayetler', icon: 'flag-outline' },
  { href: '/admin/users', label: 'Kullanıcılar', icon: 'people-outline' },
  { href: '/admin/content', label: 'İçerik', icon: 'document-text-outline' },
  { href: '/admin/groups', label: 'Gruplar', icon: 'albums-outline' },
] as const;

function Dashboard() {
  const t = useTheme();
  const stats = useAsync(() => getAdminStats(), []);
  if (stats.loading && !stats.data) return <Loading />;
  if (!stats.data) return <ErrorState message={stats.error ?? 'Yüklenemedi.'} onRetry={stats.reload} />;
  const s = stats.data;
  const items: [string, number][] = [
    ['Kullanıcı', s.totalUsers],
    ['Gönderi', s.totalPosts],
    ['Yorum', s.totalComments],
    ['Bekleyen şikayet', s.pendingReports],
  ];
  return (
    <Screen scroll edges={['left', 'right', 'bottom']} onRefresh={stats.refresh} refreshing={stats.refreshing}>
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {items.map(([label, n]) => (
            <Card key={label} style={{ width: '48%', alignItems: 'center', gap: 2 }}>
              <Txt variant="h2" color={label === 'Bekleyen şikayet' && n > 0 ? t.rose : t.ink}>{formatCount(n)}</Txt>
              <Txt variant="caption" muted>{label}</Txt>
            </Card>
          ))}
        </View>
        {LINKS.map((l) => (
          <Card key={l.href} onPress={() => router.push(l.href)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name={l.icon} size={22} color={t.primary} />
            <Txt variant="small" style={{ flex: 1, fontWeight: '700' }}>{l.label}</Txt>
            <Ionicons name="chevron-forward" size={20} color={t.inkMuted} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

export default function AdminHome() {
  return (
    <AdminGuard>
      <Dashboard />
    </AdminGuard>
  );
}
