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
  NICKNAME_MAX,
  nicknameError,
  normalizeEmail,
} from '@/utils/validation';

const ROLES: { value: CommunityRole; label: string }[] = [
  { value: 'PATIENT', label: 'Hastayım' },
  { value: 'CAREGIVER', label: 'Hasta yakınıyım' },
  { value: 'PROFESSIONAL', label: 'Sağlık profesyoneliyim' },
  { value: 'OTHER', label: 'Diğer' },
];

type Errors = Partial<Record<'firstName' | 'lastName' | 'email' | 'password' | 'confirm' | 'kvkk' | 'age' | 'nickname', string>>;

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
  const [age, setAge] = useState(false);
  const [nickname, setNickname] = useState('');
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
      nickname: nicknameError(nickname) ?? undefined,
      age: age ? undefined : 'Kayıt olmak için 18 yaşından büyük olduğunu onaylaman gerekiyor.',
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
        ageConfirmed: age,
        nickname: cleanText(nickname) || null,
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
        <TextField
          label="Takma ad (isteğe bağlı)"
          value={nickname}
          onChangeText={setNickname}
          error={errors.nickname}
          helper="Yazarsan toplulukta adın ve soyadın yerine yalnızca bu görünür."
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={NICKNAME_MAX}
        />
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
          <CheckRow checked={age} onChange={setAge} error={errors.age}>
            <Txt variant="small">18 yaşından büyüğüm.</Txt>
          </CheckRow>
          <CheckRow checked={health} onChange={setHealth}>
            <Txt variant="small">
              <Txt variant="small" style={{ fontWeight: '800' }}>İsteğe bağlı: </Txt>
              Katıldığım gruplar ve paylaşımlarım gibi sağlıkla ilgili bilgilerimin (kendimin ya da paylaştığım
              kadarıyla yakınımın),{' '}
              <Link href="/privacy" style={{ color: t.primary, fontWeight: '700' }}>Açık Rıza Metni</Link>
              &apos;nde belirtilen amaçlarla ve yurt dışındaki hizmet sağlayıcılara aktarılarak işlenmesine açık rıza
              veriyorum.
            </Txt>
          </CheckRow>
          <Txt variant="small" muted>
            Şimdi işaretlemezsen hesabın yine açılır; gruba katılmak, paylaşım yapmak ve mesaj yazmak için sonradan
            sorarız. Rızanı Ayarlar&apos;dan istediğin zaman geri alabilirsin.
          </Txt>
        </View>

        <Button title="Kayıt ol" onPress={submit} loading={loading} />
      </View>
    </Screen>
  );
}
