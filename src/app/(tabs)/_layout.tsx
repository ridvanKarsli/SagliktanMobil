import { Pressable } from 'react-native';
import { Redirect, router, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useBadgeCounts } from '@/context/BadgeContext';
import { useTheme } from '@/theme/ThemeContext';
import { hapticSelect } from '@/utils/haptics';

export default function TabsLayout() {
  const t = useTheme();
  const badges = useBadgeCounts();
  const { user } = useAuth();
  // İlk girişte bir kez karşılama ekranı gösterilir.
  if (user && !user.onboardingCompleted) return <Redirect href="/welcome" />;
  return (
    <Tabs
      screenListeners={{ tabPress: () => hapticSelect() }}
      screenOptions={{
        headerStyle: { backgroundColor: t.background },
        headerTitleStyle: { color: t.ink, fontWeight: '800' },
        headerShadowVisible: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.inkSoft,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border },
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarBadgeStyle: { backgroundColor: t.rose, color: t.onRose, fontWeight: '800', fontSize: 11 },
        sceneStyle: { backgroundColor: t.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Akış',
          tabBarAccessibilityLabel: 'Akış',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Gruplar',
          tabBarAccessibilityLabel: 'Gruplar',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "people" : "people-outline"} size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesajlar',
          tabBarAccessibilityLabel: 'Mesajlar',
          tabBarBadge: badges.messages + badges.requests > 0 ? badges.messages + badges.requests : undefined,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Bildirimler',
          tabBarAccessibilityLabel: 'Bildirimler',
          tabBarBadge: badges.notifications > 0 ? badges.notifications : undefined,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "notifications" : "notifications-outline"} size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ayarlar"
              hitSlop={10}
              onPress={() => router.push('/settings')}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}
            >
              <Ionicons name="settings-outline" size={23} color={t.ink} />
            </Pressable>
          ),
          tabBarAccessibilityLabel: 'Profil',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
