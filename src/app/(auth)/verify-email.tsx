import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Banner, Button, Screen, TextField, Txt } from '@/components/ui';
import { errorMessage } from '@/api/client';
import { verifyEmail } from '@/api/endpoints';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!code.trim()) {
      setError('Doğrulama kodunu yaz.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyEmail(email, code.trim());
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, 'Doğrulama yapılamadı.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAware edges={['left', 'right', 'bottom']}>
      <View style={{ gap: 16 }}>
        <Txt variant="h2">E-postanı doğrula</Txt>
        <Txt muted>
          {email ? `${email} adresine` : 'E-posta adresine'} bir doğrulama kodu gönderdik. Kodu aşağıya yaz ya da
          e-postadaki bağlantıya dokun.
        </Txt>
        {done ? (
          <>
            <Banner tone="success" text="E-postan doğrulandı. Artık giriş yapabilirsin." />
            <Button title="Giriş yap" onPress={() => router.replace('/login')} />
          </>
        ) : (
          <>
            {error && <Banner tone="error" text={error} />}
            <TextField label="Doğrulama kodu" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={12} />
            <Button title="Doğrula" onPress={submit} loading={loading} />
            <Button title="Girişe dön" variant="ghost" onPress={() => router.replace('/login')} />
          </>
        )}
      </View>
    </Screen>
  );
}
