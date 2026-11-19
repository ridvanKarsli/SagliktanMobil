import { View } from 'react-native';
import { Screen, Txt } from '@/components/ui';
import { PRIVACY_DATE, PRIVACY_SECTIONS, PRIVACY_VERSION } from '@/content/privacy';

export default function PrivacyScreen() {
  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <Txt variant="h2">KVKK Aydınlatma Metni, Açık Rıza Metni ve Gizlilik Politikası</Txt>
      <Txt variant="small" muted style={{ marginTop: 4, marginBottom: 16 }}>
        Sürüm {PRIVACY_VERSION} · Yürürlük tarihi: {PRIVACY_DATE}
      </Txt>
      <View style={{ gap: 20 }}>
        {PRIVACY_SECTIONS.map((s) => (
          <View key={s.title} style={{ gap: 6 }}>
            <Txt variant="h3">{s.title}</Txt>
            <Txt variant="small" style={{ lineHeight: 22 }}>{s.body}</Txt>
          </View>
        ))}
      </View>
    </Screen>
  );
}
