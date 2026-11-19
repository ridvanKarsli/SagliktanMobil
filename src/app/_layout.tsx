import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BadgeProvider } from '@/context/BadgeContext';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { Loading } from '@/components/ui';
import ConsentGate from '@/components/ConsentGate';

function RootNavigator() {
  const t = useTheme();
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <Loading label="Oturum açılıyor" />;

  return (
    <>
      <StatusBar style={t.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.background },
          headerTintColor: t.primary,
          headerTitleStyle: { color: t.ink, fontWeight: '800' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: t.background },
        }}
      >
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="groups/[id]" options={{ title: 'Hastalık grubu' }} />
          <Stack.Screen name="sub-groups/[id]" options={{ title: 'Konular' }} />
          <Stack.Screen name="post/[id]" options={{ title: 'Gönderi' }} />
          <Stack.Screen name="new-post" options={{ title: 'Yeni gönderi', presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ title: 'Ayarlar' }} />
          <Stack.Screen name="search" options={{ title: 'Ara' }} />
          <Stack.Screen name="users/[id]" options={{ title: 'Profil' }} />
          <Stack.Screen name="message-requests" options={{ title: 'Mesaj istekleri' }} />
          <Stack.Screen name="chat/[id]" options={{ title: 'Sohbet' }} />
          <Stack.Screen name="blocked" options={{ title: 'Engellenenler' }} />
          <Stack.Screen name="share-post" options={{ title: 'Gönderiyi paylaş', presentation: 'modal' }} />
          <Stack.Screen name="admin/index" options={{ title: 'Yönetim' }} />
          <Stack.Screen name="admin/users" options={{ title: 'Kullanıcılar' }} />
          <Stack.Screen name="admin/reports" options={{ title: 'Şikayetler' }} />
          <Stack.Screen name="admin/content" options={{ title: 'İçerik' }} />
          <Stack.Screen name="admin/groups" options={{ title: 'Gruplar' }} />
        </Stack.Protected>
        <Stack.Screen name="privacy" options={{ title: 'Aydınlatma ve Açık Rıza' }} />
      </Stack>
      {isAuthenticated && <ConsentGate />}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <BadgeProvider>
            <RootNavigator />
          </BadgeProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
