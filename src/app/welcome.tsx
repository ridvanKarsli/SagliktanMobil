import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Banner, Button, Card, Screen, TextField, Txt } from '@/components/ui';
import { errorMessage } from '@/api/client';
import { completeOnboarding, updateProfile } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { NICKNAME_MAX, cleanText, nicknameError } from '@/utils/validation';

const POINTS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: 'people-outline', title: 'Hastalık grubuna katıl', text: 'Seninle aynı yoldan geçen hastalar ve hasta yakınlarıyla aynı yerde ol.' },
  { icon: 'help-circle-outline', title: 'Sor, anlat, oyla', text: 'Deneyimini paylaş, soru sor ya da kısa bir anket aç. Faydalı yanıtlar öne çıkar.' },
  { icon: 'lock-closed-outline', title: 'Gizliliğin sende', text: 'Sana ancak kabul ettiğin kişiler mesaj yazabilir. Profilini istediğin zaman kapatabilirsin.' },
];

// Kayıttan sonraki ilk açılışta bir kez gösterilir: uygulamanın ne olduğunu
// anlatır, takma ad seçtirir ve gruplara yönlendirir.
export default function WelcomeScreen() {
  const t = useTheme();
  const { user, applyServerUser } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [nickError, setNickError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    if (!user) return;
    const problem = nicknameError(nickname) ?? undefined;
    setNickError(problem);
    if (problem) return;
    setLoading(true);
    setError(null);
    try {
      const nick = cleanText(nickname);
      if (nick !== (user.nickname ?? '')) {
        await updateProfile({
          firstName: user.firstName,
          lastName: user.lastName,
          bio: user.bio ?? null,
          city: user.city ?? null,
          nickname: nick,
        });
      }
      applyServerUser(await completeOnboarding());
      router.replace('/groups');
    } catch (err) {
      setError(errorMessage(err, 'Devam edilemedi. Tekrar dene.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAware edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ gap: 20, paddingTop: 12 }}>
        <View style={{ gap: 6 }}>
          <Txt variant="h1">Hoş geldin{user?.firstName ? `, ${user.firstName}` : ''}</Txt>
          <Txt muted>Sağlıktan, hastalık bazlı bir sosyal platform. Teşhis koymaz, tedavi önermez; deneyimler paylaşılır.</Txt>
        </View>

        <View style={{ gap: 12 }}>
          {POINTS.map((p) => (
            <Card key={p.title} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.primarySoft }}>
                <Ionicons name={p.icon} size={22} color={t.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt style={{ fontWeight: '800' }}>{p.title}</Txt>
                <Txt variant="small" muted>{p.text}</Txt>
              </View>
            </Card>
          ))}
        </View>

        <Card style={{ gap: 10 }}>
          <Txt variant="h3">Toplulukta nasıl görünmek istersin?</Txt>
          <Txt variant="small" muted>
            Takma ad yazarsan diğer üyeler adın ve soyadın yerine yalnızca bunu görür. Boş bırakırsan adın ve soyadın
            görünür. İstediğin zaman Ayarlar&apos;dan değiştirebilirsin.
          </Txt>
          <TextField
            label="Takma ad (isteğe bağlı)"
            value={nickname}
            onChangeText={setNickname}
            error={nickError}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={NICKNAME_MAX}
          />
        </Card>

        {error && <Banner tone="error" text={error} />}
        <View style={{ gap: 10 }}>
          <Button title="Gruplara göz at" onPress={finish} loading={loading} />
          <Button title="Topluluk kurallarını oku" variant="ghost" onPress={() => router.push('/rules')} />
        </View>
      </View>
    </Screen>
  );
}
