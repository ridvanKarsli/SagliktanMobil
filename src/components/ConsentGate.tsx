import { useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, CheckRow, Txt } from '@/components/ui';
import { errorMessage } from '@/api/client';
import { updateHealthConsent } from '@/api/endpoints';
import { PRIVACY_SECTIONS } from '@/content/privacy';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeContext';

export const HEALTH_CONSENT_TEXT =
  'Sağlık durumuma ilişkin verilerimin, aşağıdaki Açık Rıza Metni\'nde belirtilen amaçlarla ve yurt dışındaki hizmet sağlayıcılara aktarılarak işlenmesine açık rıza veriyorum.';

// Sağlık verisi açık rızası olmayan (ya da eski metin sürümüne rıza vermiş)
// oturum açık kullanıcıdan rızayı yeniden ister. Verilmezse çıkış yapabilir.
export default function ConsentGate() {
  const t = useTheme();
  const { user, applyServerUser, logout } = useAuth();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user || user.healthConsent) return null;

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
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => {}}>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Txt variant="h2">Sağlık verisi açık rızası</Txt>
          <Txt muted>
            Kişisel verilerin korunması metinlerimizi güncelledik. Hastalık grupları ve paylaşımların sağlık durumuna
            ilişkin olabileceği için bu verileri ayrı bir açık rızayla işliyoruz. Rıza vermeden gönderi paylaşamaz,
            yorum yazamaz ve gruplara katılamazsın.
          </Txt>
          <CheckRow checked={checked} onChange={setChecked}>
            <Txt variant="small" muted>{HEALTH_CONSENT_TEXT}</Txt>
          </CheckRow>
          <View style={{ backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 16, gap: 8 }}>
            <Txt variant="h3">{PRIVACY_SECTIONS[7].title}</Txt>
            <Txt variant="small" muted>{PRIVACY_SECTIONS[7].body}</Txt>
          </View>
          <View style={{ gap: 10 }}>
            <Button title="Onaylıyorum" onPress={accept} disabled={!checked} loading={busy} />
            <Button title="Çıkış yap" variant="outline" onPress={logout} disabled={busy} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
