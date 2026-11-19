import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';

export default function AuthLayout() {
  const t = useTheme();
  return (
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
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Kayıt ol' }} />
      <Stack.Screen name="verify-email" options={{ title: 'E-postanı doğrula' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Şifremi unuttum' }} />
    </Stack>
  );
}
