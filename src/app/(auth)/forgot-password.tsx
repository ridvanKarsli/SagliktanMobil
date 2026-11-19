import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Banner, Button, Screen, TextField, Txt } from '@/components/ui';
import { errorMessage } from '@/api/client';
import { forgotPassword, resetPassword } from '@/api/endpoints';
import { confirmPasswordError, emailError, newPasswordError, normalizeEmail } from '@/utils/validation';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    const eErr = emailError(email);
    setErrors({ email: eErr ?? undefined });
    if (eErr) return;
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(normalizeEmail(email));
      setStep('reset');
    } catch (err) {
      setError(errorMessage(err, 'Kod gönderilemedi.'));
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    const next = {
      code: code.trim() ? undefined : 'Sıfırlama kodunu yaz.',
      password: newPasswordError(password) ?? undefined,
      confirm: confirmPasswordError(confirm, password) ?? undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setError(null);
    setLoading(true);
    try {
      await resetPassword(normalizeEmail(email), code.trim(), password);
      setStep('done');
    } catch (err) {
      setError(errorMessage(err, 'Şifre sıfırlanamadı.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAware edges={['left', 'right', 'bottom']}>
      <View style={{ gap: 16 }}>
        {step === 'email' && (
          <>
            <Txt variant="h2">Şifreni sıfırla</Txt>
            <Txt muted>E-posta adresini yaz, sana bir sıfırlama kodu gönderelim.</Txt>
            {error && <Banner tone="error" text={error} />}
            <TextField label="E-posta" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} />
            <Button title="Kod gönder" onPress={sendCode} loading={loading} />
          </>
        )}
        {step === 'reset' && (
          <>
            <Txt variant="h2">Yeni şifre belirle</Txt>
            <Txt muted>E-posta adresin kayıtlıysa bir kod gönderdik. Kodu ve yeni şifreni yaz.</Txt>
            {error && <Banner tone="error" text={error} />}
            <TextField label="Sıfırlama kodu" value={code} onChangeText={setCode} error={errors.code} keyboardType="number-pad" autoComplete="one-time-code" />
            <TextField label="Yeni şifre" value={password} onChangeText={setPassword} error={errors.password} helper="En az 8 karakter" secure autoCapitalize="none" textContentType="newPassword" />
            <TextField label="Yeni şifre (tekrar)" value={confirm} onChangeText={setConfirm} error={errors.confirm} secure autoCapitalize="none" textContentType="newPassword" />
            <Button title="Şifreyi güncelle" onPress={reset} loading={loading} />
          </>
        )}
        {step === 'done' && (
          <>
            <Banner tone="success" text="Şifren güncellendi. Yeni şifrenle giriş yapabilirsin." />
            <Button title="Giriş yap" onPress={() => router.replace('/login')} />
          </>
        )}
      </View>
    </Screen>
  );
}
