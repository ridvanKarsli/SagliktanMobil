import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, CheckRow, Txt } from '@/components/ui';
import { errorMessage, onHealthConsentRequired } from '@/api/client';
import { updateHealthConsent } from '@/api/endpoints';
import { PRIVACY_SECTIONS } from '@/content/privacy';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeContext';

export const HEALTH_CONSENT_TEXT =
  'Sağlıkla ilgili bilgilerimin (kendimin ya da paylaştığım kadarıyla yakınımın), aşağıdaki Açık Rıza Metni\'nde belirtilen amaçlarla ve yurt dışındaki hizmet sağlayıcılara aktarılarak işlenmesine açık rıza veriyorum.';

// Sağlık verisi açık rızası olmayan (ya da eski metin sürümüne rıza vermiş)
// oturum açık kullanıcıya rızayı sorar. Rıza hizmet şartı değildir: "Şimdi
// değil" ile kapatılır ve kişi içerikleri okumaya devam eder. Rıza gerektiren
// bir işlem sunucu tarafından reddedildiğinde pencere yeniden açılır.
export default function ConsentGate() {
  const t = useTheme();
  const { user, applyServerUser } = useAuth();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => onHealthConsentRequired(() => setDismissed(false)), []);

  // Kişi rızasını Ayarlar'dan az önce kendisi geri aldıysa pencere hemen
  // önüne çıkmaz; rıza gerektiren bir işlem denediğinde yeniden açılır.
  const hasConsent = !!user?.healthConsent;
  const [lastConsent, setLastConsent] = useState(hasConsent);
  if (hasConsent !== lastConsent) {
    setLastConsent(hasConsent);
    if (!hasConsent) setDismissed(true);
  }

  if (!user || user.healthConsent || dismissed) return null;

  const later = () => setDismissed(true);

  const accept = async () => {
    setBusy(true);
    try {
      applyServerUser(await updateHealthConsent(true));
    } catch (err) {
      Alert.alert('Rıza kaydedilemedi', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={later}>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Txt variant="h2">Sağlık bilgilerin için iznin</Txt>
          <Txt muted>
            Katıldığın hastalık grupları ve yazdıkların sağlıkla ilgili bilgi sayılır. Bu bilgileri yalnızca senin
            açık rızanla işleyebiliriz. Rıza vermeden de paylaşımları okuyabilirsin; gruba katılmak, gönderi ve yorum
            yazmak ya da mesaj göndermek için rızan gerekir.
          </Txt>
          <CheckRow checked={checked} onChange={setChecked}>
            <Txt variant="small">{HEALTH_CONSENT_TEXT}</Txt>
          </CheckRow>
          <View style={{ backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 16, gap: 8 }}>
            <Txt variant="h3">{PRIVACY_SECTIONS[7].title}</Txt>
            <Txt variant="small" muted>{PRIVACY_SECTIONS[7].body}</Txt>
          </View>
          <View style={{ gap: 10 }}>
            <Button title="Rıza veriyorum" onPress={accept} disabled={!checked} loading={busy} />
            <Button title="Şimdi değil" variant="outline" onPress={later} disabled={busy} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
