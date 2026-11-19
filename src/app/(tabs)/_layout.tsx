import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBadgeCounts } from '@/context/BadgeContext';
import { useTheme } from '@/theme/ThemeContext';

export default function TabsLayout() {
  const t = useTheme();
  const badges = useBadgeCounts();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.background },
        headerTitleStyle: { color: t.ink, fontWeight: '800' },
        headerShadowVisible: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.inkMuted,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 12 },
        sceneStyle: { backgroundColor: t.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Akış',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Gruplar',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesajlar',
          tabBarBadge: badges.messages + badges.requests > 0 ? badges.messages + badges.requests : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Bildirimler',
          tabBarBadge: badges.notifications > 0 ? badges.notifications : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
