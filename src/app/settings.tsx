import { useState, type ReactNode } from 'react';
import { Alert, Linking, Share, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Banner, Button, Card, Screen, TextField, Txt } from '@/components/ui';
import { errorMessage } from '@/api/client';
import {
  changePassword,
  deleteAccount,
  exportMyData,
  updateHealthConsent,
  updateHealthProfile,
  updatePreferences,
  updateProfile,
} from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import {
  LIMITS,
  NICKNAME_MAX,
  cleanText,
  confirmPasswordError,
  nameError,
  newPasswordError,
  nicknameError,
} from '@/utils/validation';

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ paddingHorizontal: 4 }}>
        <Txt variant="h3">{title}</Txt>
        {description ? <Txt variant="small" muted>{description}</Txt> : null}
      </View>
      {children}
    </View>
  );
}

function ProfileForm() {
  const { user, applyServerUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    const next = {
      first: nameError(firstName, 'Ad') ?? undefined,
      last: nameError(lastName, 'Soyad') ?? undefined,
      nickname: nicknameError(nickname) ?? undefined,
    };
    setErrors(next);
    if (next.first || next.last || next.nickname) return;
    setLoading(true);
    setMsg(null);
    try {
      applyServerUser(
        await updateProfile({
          firstName: cleanText(firstName),
          lastName: cleanText(lastName),
          bio: bio.trim() || null,
          city: user?.city ?? null,
          // Boş gönderilirse takma ad kaldırılır.
          nickname: cleanText(nickname),
        }),
      );
      setMsg({ tone: 'success', text: 'Profilin güncellendi.' });
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err, 'Profil güncellenemedi.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ gap: 14 }}>
      {msg && <Banner tone={msg.tone} text={msg.text} />}
      <TextField label="Ad" value={firstName} onChangeText={setFirstName} error={errors.first} autoCapitalize="words" />
      <TextField label="Soyad" value={lastName} onChangeText={setLastName} error={errors.last} autoCapitalize="words" />
      <TextField
        label="Takma ad (isteğe bağlı)"
        value={nickname}
        onChangeText={setNickname}
        error={errors.nickname}
        helper="Yazarsan diğer üyeler adın ve soyadın yerine yalnızca bunu görür. Boş bırakırsan adın görünür."
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={NICKNAME_MAX}
      />
      <TextField label="Hakkında" value={bio} onChangeText={setBio} multiline textAlignVertical="top" maxLength={LIMITS.BIO_MAX} helper="İsteğe bağlı, kısa bir tanıtım." />
      <Button title="Kaydet" onPress={save} loading={loading} />
    </Card>
  );
}

function ConsentSection() {
  const { user, applyServerUser } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const change = async (granted: boolean) => {
    setBusy(true);
    try {
      applyServerUser(await updateHealthConsent(granted));
      Alert.alert(granted ? 'Açık rızan kaydedildi' : 'Açık rızan geri alındı', granted ? undefined : 'Grup üyeliklerin kaldırıldı.');
    } catch (err) {
      Alert.alert('İşlem yapılamadı', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmWithdraw = () =>
    Alert.alert(
      'Rızanı geri almak istiyor musun?',
      'Üye olduğun tüm hastalık gruplarından çıkarılırsın, topluluk rolün silinir ve profilin diğer üyelere kapanır. Daha önce yazdığın gönderi ve yorumlar kalır; silmek istersen tek tek silebilir ya da hesabını kapatabilirsin.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Rızamı geri al', style: 'destructive', onPress: () => change(false) },
      ],
    );

  return (
    <Section title="Sağlık verisi rızası" description="Hastalık grupları ve paylaşımların sağlık durumuna ilişkin olabilir. Bu verileri açık rızanla işliyoruz.">
      <Card style={{ gap: 12 }}>
        <Txt variant="small" muted>
          {user.healthConsent
            ? 'Açık rızan var. İstediğin zaman geri alabilirsin; bu durumda grup üyeliklerin ve sağlık özetin kaldırılır, yeniden rıza verene kadar gönderi, yorum ve gruba katılma kapalı kalır.'
            : 'Şu an açık rızan yok. Gönderi paylaşmak, yorum yazmak ve gruplara katılmak için rıza vermen gerekiyor.'}
        </Txt>
        {user.healthConsent ? (
          <Button title="Rızamı geri al" variant="danger" onPress={confirmWithdraw} loading={busy} />
        ) : (
          <Button title="Açık rıza veriyorum" onPress={() => change(true)} loading={busy} />
        )}
        <Button title="Aydınlatma ve Açık Rıza Metni" variant="ghost" onPress={() => router.push('/privacy')} />
      </Card>
    </Section>
  );
}

function DigestSwitch() {
  const t = useTheme();
  const { user, applyServerUser } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      applyServerUser(await updatePreferences(next));
    } catch (err) {
      Alert.alert('İşlem yapılamadı', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Txt variant="small" style={{ fontWeight: '700' }}>Haftalık özet e-postası</Txt>
        <Txt variant="caption" muted>Gruplarındaki gelişmelerin haftalık özeti.</Txt>
      </View>
      <Switch
        accessibilityLabel="Haftalık özet e-postası"
        value={user.weeklyDigestEnabled}
        onValueChange={toggle}
        disabled={busy}
        trackColor={{ true: t.primary, false: t.borderStrong }}
      />
    </Card>
  );
}

// Profilin diğer üyelere açık olup olmadığı. Kapalıyken yalnızca görünen ad
// görünür; hakkında, şehir, gruplar ve paylaşım listesi gizlenir.
function ProfileVisibilitySwitch() {
  const t = useTheme();
  const { user, applyServerUser } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      applyServerUser(
        await updateHealthProfile({
          communityRole: user.communityRole,
          discoverable: next && user.discoverable,
          profilePublic: next,
        }),
      );
    } catch (err) {
      Alert.alert('İşlem yapılamadı', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Txt variant="small" style={{ fontWeight: '700' }}>Profilim üyelere açık</Txt>
        <Txt variant="caption" muted>Kapatırsan diğer üyeler yalnızca görünen adını görür.</Txt>
      </View>
      <Switch
        accessibilityLabel="Profilim üyelere açık"
        value={user.profilePublic}
        onValueChange={toggle}
        disabled={busy}
        trackColor={{ true: t.primary, false: t.borderStrong }}
      />
    </Card>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const e = {
      current: current ? undefined : 'Mevcut şifreni yaz.',
      next: newPasswordError(next) ?? (next === current ? 'Yeni şifren mevcut şifrenden farklı olmalı.' : undefined),
      confirm: confirmPasswordError(confirm, next) ?? undefined,
    };
    setErrors(e);
    if (e.current || e.next || e.confirm) return;
    setLoading(true);
    setMsg(null);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setMsg({ tone: 'success', text: 'Şifren güncellendi.' });
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err, 'Şifre değiştirilemedi.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ gap: 14 }}>
      {msg && <Banner tone={msg.tone} text={msg.text} />}
      <TextField label="Mevcut şifre" value={current} onChangeText={setCurrent} error={errors.current} secure autoCapitalize="none" textContentType="password" />
      <TextField label="Yeni şifre" value={next} onChangeText={setNext} error={errors.next} secure autoCapitalize="none" textContentType="newPassword" helper="En az 8 karakter" />
      <TextField label="Yeni şifre (tekrar)" value={confirm} onChangeText={setConfirm} error={errors.confirm} secure autoCapitalize="none" textContentType="newPassword" />
      <Button title="Şifreyi değiştir" onPress={submit} loading={loading} />
    </Card>
  );
}

function DangerZone() {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const confirmDelete = () => {
    if (!password) {
      setError('Şifreni yaz.');
      return;
    }
    Alert.alert('Hesabını silmek istediğine emin misin?', 'Bu işlem geri alınamaz. Adın, e-postan ve profil bilgilerin silinir; yazdığın gönderi ve yorumlar da kaldırılır.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Hesabımı sil',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          setError(null);
          try {
            await deleteAccount(password);
            await logout();
          } catch (err) {
            setError(errorMessage(err, 'Hesap silinemedi.'));
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <Section title="Hesabını kapat" description="Geri alınması zor bir işlem. Acele etme.">
      <Card style={{ gap: 12 }}>
        {!open ? (
          <Button title="Hesabımı sil" variant="outline" onPress={() => setOpen(true)} />
        ) : (
          <>
            {error && <Banner tone="error" text={error} />}
            <TextField label="Şifren" value={password} onChangeText={setPassword} secure autoCapitalize="none" textContentType="password" helper="Onay için şifreni yaz." />
            <Button title="Hesabımı kalıcı olarak sil" variant="danger" onPress={confirmDelete} loading={loading} />
            <Button title="Vazgeç" variant="ghost" onPress={() => { setOpen(false); setPassword(''); setError(null); }} />
          </>
        )}
      </Card>
    </Section>
  );
}

export default function SettingsScreen() {
  const { logout, user } = useAuth();
  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const data = await exportMyData();
      await Share.share({ title: 'sagliktan-verilerim.json', message: JSON.stringify(data, null, 2) });
    } catch (err) {
      Alert.alert('Verilerin indirilemedi', errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen scroll keyboardAware edges={['left', 'right', 'bottom']}>
      <View style={{ gap: 24, paddingBottom: 24 }}>
        <Section title="Profil" description={user?.email}>
          <ProfileForm />
        </Section>
        <Section title="Gizlilik">
          <ProfileVisibilitySwitch />
        </Section>
        <ConsentSection />
        <Section title="Görünüm" description="Yazı boyutu telefonunun yazı boyutu ayarını izler; iki katına kadar büyütebilirsin.">
          <Card>
            <Button title="Telefon ayarlarını aç" variant="outline" icon="text-outline" onPress={() => Linking.openSettings()} />
          </Card>
        </Section>
        <Section title="Bildirimler">
          <DigestSwitch />
        </Section>
        <Section title="Şifre">
          <PasswordForm />
        </Section>
        <Section title="Verilerin ve gizlilik">
          <Card style={{ gap: 10 }}>
            <Button title="Verilerimi indir" variant="outline" icon="download-outline" onPress={exportData} loading={exporting} />
            <Button title="Engellenen kullanıcılar" variant="outline" icon="ban-outline" onPress={() => router.push('/blocked')} />
            <Button title="Topluluk kuralları" variant="ghost" onPress={() => router.push('/rules')} />
            <Button title="Gizlilik ve KVKK" variant="ghost" onPress={() => router.push('/privacy')} />
          </Card>
        </Section>
        {user?.role === 'ADMIN' && (
          <Section title="Yönetim">
            <Card>
              <Button title="Yönetim paneli" icon="shield-outline" onPress={() => router.push('/admin')} />
            </Card>
          </Section>
        )}
        <Button title="Çıkış yap" variant="outline" icon="log-out-outline" onPress={logout} />
        <DangerZone />
      </View>
    </Screen>
  );
}
