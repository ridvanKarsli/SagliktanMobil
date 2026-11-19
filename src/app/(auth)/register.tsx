import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Banner, Button, CheckRow, Screen, TextField, Txt } from '@/components/ui';
import { errorMessage } from '@/api/client';
import type { CommunityRole } from '@/api/types';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import {
  cleanText,
  confirmPasswordError,
  emailError,
  nameError,
  newPasswordError,
  normalizeEmail,
} from '@/utils/validation';

const ROLES: { value: CommunityRole; label: string }[] = [
  { value: 'PATIENT', label: 'Hastayım' },
  { value: 'CAREGIVER', label: 'Hasta yakınıyım' },
  { value: 'PROFESSIONAL', label: 'Sağlık profesyoneliyim' },
  { value: 'OTHER', label: 'Diğer' },
];

type Errors = Partial<Record<'firstName' | 'lastName' | 'email' | 'password' | 'confirm' | 'kvkk' | 'health', string>>;

export default function RegisterScreen() {
  const t = useTheme();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<CommunityRole | null>(null);
  const [kvkk, setKvkk] = useState(false);
  const [health, setHealth] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: Errors = {
      firstName: nameError(firstName, 'Ad') ?? undefined,
      lastName: nameError(lastName, 'Soyad') ?? undefined,
      email: emailError(email) ?? undefined,
      password: newPasswordError(password) ?? undefined,
      confirm: confirmPasswordError(confirm, password) ?? undefined,
      kvkk: kvkk ? undefined : 'Kayıt olmak için aydınlatma metnini onaylaman gerekiyor.',
      health: health ? undefined : 'Kayıt olmak için sağlık verisi açık rızası vermen gerekiyor.',
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setFormError(null);
    setLoading(true);
    try {
      const cleanEmail = normalizeEmail(email);
      await register({
        firstName: cleanText(firstName),
        lastName: cleanText(lastName),
        email: cleanEmail,
        password,
        kvkkConsent: kvkk,
        healthConsent: health,
        communityRole: role,
      });
      router.replace({ pathname: '/verify-email', params: { email: cleanEmail } });
    } catch (err) {
      setFormError(errorMessage(err, 'Kayıt tamamlanamadı.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAware edges={['left', 'right', 'bottom']}>
      <View style={{ gap: 16 }}>
        <Txt variant="h2">Aramıza katıl</Txt>
        <Txt muted>Seni anlayan insanlar burada. Kayıt bir dakika sürer.</Txt>
        {formError && <Banner tone="error" text={formError} />}
        <TextField label="Ad" value={firstName} onChangeText={setFirstName} error={errors.firstName} autoComplete="given-name" textContentType="givenName" autoCapitalize="words" />
        <TextField label="Soyad" value={lastName} onChangeText={setLastName} error={errors.lastName} autoComplete="family-name" textContentType="familyName" autoCapitalize="words" />
        <TextField label="E-posta" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} textContentType="emailAddress" />
        <TextField label="Şifre" value={password} onChangeText={setPassword} error={errors.password} helper="En az 8 karakter" secure autoCapitalize="none" textContentType="newPassword" />
        <TextField label="Şifre (tekrar)" value={confirm} onChangeText={setConfirm} error={errors.confirm} secure autoCapitalize="none" textContentType="newPassword" />

        <View style={{ gap: 8 }}>
          <Txt variant="small" style={{ fontWeight: '700' }}>Toplulukta rolün (isteğe bağlı)</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ROLES.map((r) => {
              const selected = role === r.value;
              return (
                <Pressable
                  key={r.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setRole(selected ? null : r.value)}
                  style={{
                    minHeight: 44,
                    justifyContent: 'center',
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: selected ? t.primary : t.borderStrong,
                    backgroundColor: selected ? t.primarySoft : t.surface,
                  }}
                >
                  <Txt variant="small" color={selected ? t.primary : t.ink} style={{ fontWeight: '700' }}>{r.label}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <CheckRow checked={kvkk} onChange={setKvkk} error={errors.kvkk}>
            <Txt variant="small" muted>
              <Link href="/privacy" style={{ color: t.primary, fontWeight: '700' }}>KVKK Aydınlatma Metni ve Gizlilik Politikası</Link>
              &apos;nı okudum.
            </Txt>
          </CheckRow>
          <CheckRow checked={health} onChange={setHealth} error={errors.health}>
            <Txt variant="small" muted>
              Üye olduğum hastalık grupları, paylaşımlarım ve profilimde belirttiğim bilgiler gibi sağlık durumuma
              ilişkin verilerimin,{' '}
              <Link href="/privacy" style={{ color: t.primary, fontWeight: '700' }}>Açık Rıza Metni</Link>
              &apos;nde belirtilen amaçlarla ve yurt dışındaki hizmet sağlayıcılara aktarılarak işlenmesine açık rıza
              veriyorum. Rızamı Ayarlar&apos;dan istediğim zaman geri alabileceğimi biliyorum.
            </Txt>
          </CheckRow>
        </View>

        <Button title="Kayıt ol" onPress={submit} loading={loading} />
      </View>
    </Screen>
  );
}
