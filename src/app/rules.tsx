import { View } from 'react-native';
import { Screen, Txt } from '@/components/ui';
import { CRISIS_LINE_NAME } from '@/config';

const RULES: { title: string; body: string }[] = [
  {
    title: 'Neden kurallarımız var',
    body: 'Sağlıktan, hassas sağlık deneyimlerinin paylaşıldığı bir alan. Herkesin kendini güvende hissedebilmesi için birbirimize saygılı davranıyoruz.',
  },
  {
    title: 'Yapılması gerekenler',
    body: 'Deneyimini dürüstçe paylaş. Diğer üyelere nazik ve destekleyici davran. Paylaştığın bilginin kişisel deneyimin olduğunu, tıbbi tavsiye olmadığını unutma. Uygunsuz bir içerik gördüğünde şikayet et.',
  },
  {
    title: 'Yasak olanlar',
    body: 'Küfür, hakaret, taciz, nefret söylemi ve spam yayınlanmaz. Yasa dışı içerik paylaşmak, başkasının kimliğine bürünmek ve bilerek yanıltıcı sağlık bilgisi yaymak yasaktır.\n\nİlaç, takviye, cihaz ya da herhangi bir ürünün satışı, takası ve reklamı yasaktır; reçeteli ilaç alıp vermek için yapılan paylaşımlar hemen kaldırılır. "Kesin tedavi", "mucize kür" gibi iddialar ve bir tedaviyi bırakmaya yönlendiren paylaşımlar da yasaktır. Bir yöntemin sana nasıl geldiğini anlatabilirsin; başkasına tedavi öneremezsin.',
  },
  {
    title: 'Sağlık profesyoneli beyanı',
    body: 'Bir üyenin "sağlık profesyoneli" olduğu bilgisi yalnızca kendi beyanıdır; Sağlıktan bu beyanı doğrulamaz. Burada okuduğun hiçbir şey doktorunun yerini tutmaz.',
  },
  {
    title: 'Zor anlar için',
    body: `Zor bir anını paylaşırsan gönderin engellenmez ya da gizlenmez; yanına bir destek notu eklenir. Acil bir durumda ${CRISIS_LINE_NAME} 7/24 ücretsiz aranabilir.`,
  },
  {
    title: 'Bir şeyi bildirmek istersen',
    body: 'Gönderi, yorum, mesaj ya da profildeki şikayet seçeneğini kullanabilir veya iletisim@sagliktan.com adresine yazabilirsin.',
  },
];

export default function RulesScreen() {
  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <Txt variant="h2" style={{ marginBottom: 16 }}>Topluluk kuralları</Txt>
      <View style={{ gap: 20 }}>
        {RULES.map((s) => (
          <View key={s.title} style={{ gap: 6 }}>
            <Txt variant="h3">{s.title}</Txt>
            <Txt variant="small" style={{ lineHeight: 22 }}>{s.body}</Txt>
          </View>
        ))}
      </View>
    </Screen>
  );
}
