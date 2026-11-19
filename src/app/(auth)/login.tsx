import { useState } from 'react';
import { Image, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Banner, Button, Screen, TextField, Txt } from '@/components/ui';
import { ApiError, errorMessage } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { emailError, normalizeEmail } from '@/utils/validation';

export default function LoginScreen() {
  const t = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const eErr = emailError(email);
    setEmailErr(eErr);
    if (eErr) return;
    if (!password) {
      setError('Şifreni yaz.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(normalizeEmail(email), password);
    } catch (err) {
      // E-posta doğrulanmamışsa doğrulama ekranına yönlendir.
      if (err instanceof ApiError && err.status === 403 && /doğrula/i.test(err.message)) {
        router.push({ pathname: '/verify-email', params: { email: normalizeEmail(email) } });
      }
      setError(errorMessage(err, 'Giriş yapılamadı.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAware>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
        <Image source={require('../../../assets/icon.png')} style={{ width: 72, height: 72, borderRadius: 18 }} accessibilityIgnoresInvertColors />
        <Txt variant="h1" color={t.primary}>Sağlıktan</Txt>
        <Txt muted style={{ textAlign: 'center' }}>Seninle aynı yoldan geçenler burada.</Txt>
      </View>
      <View style={{ gap: 16 }}>
        {error && <Banner tone="error" text={error} />}
        <TextField
          label="E-posta"
          value={email}
          onChangeText={setEmail}
          error={emailErr}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label="Şifre"
          value={password}
          onChangeText={setPassword}
          secure
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Button title="Giriş yap" onPress={submit} loading={loading} />
        <Link href="/forgot-password" style={{ color: t.primary, textAlign: 'center', fontWeight: '700', paddingVertical: 8 }}>
          Şifremi unuttum
        </Link>
        <View style={{ height: 1, backgroundColor: t.border }} />
        <Button title="Hesap oluştur" variant="outline" onPress={() => router.push('/register')} />
        <Link href="/privacy" style={{ color: t.inkSoft, textAlign: 'center', paddingVertical: 8 }}>
          Gizlilik ve KVKK
        </Link>
      </View>
    </Screen>
  );
}
