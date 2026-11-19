# Sağlıktan Mobil (sagliktanRN)

Sağlıktan'ın React Native (Expo, TypeScript) mobil uygulaması. Web projesi
(`../SagliktanWeb`) ile aynı backend'i (`../SagliktanApi`) kullanır.

## Çalıştırma

```bash
npm install
npx expo start          # Expo Go ile telefonda aç ya da i / a ile simülatörde
npm run typecheck       # tsc --noEmit
npm run lint
```

API adresi varsayılan olarak `https://api.sagliktan.com/api`. Değiştirmek için
`.env.example` dosyasını `.env` olarak kopyalayıp `EXPO_PUBLIC_API_BASE` değerini
düzenle (ör. yerel backend için `http://<bilgisayar-ip>:8080/api`).

## Kapsam (v2)

- Giriş, kayıt (iki ayrı onay: KVKK aydınlatma + sağlık verisi açık rızası),
  e-posta doğrulama, şifre sıfırlama
- Kişisel akış, hastalık grupları, konular, gönderi listesi/detay/yazma
  (deneyim, soru, anket), yorum ve yanıtlar, faydalı tepkisi, kaydetme, şikayet
- Arama (gönderi + kişi), kişi profili, mesaj isteği gönderme
- Mesajlaşma: istekler (kabul/red), sohbet listesi, sohbet ekranı (8 sn'de bir yoklama), mesaj şikayeti
- Bildirimler (sekme rozeti ve okundu işaretleme); rozetler uygulama açıkken 45 sn'de bir yoklanır
- Gönderiye fotoğraf ekleme (en fazla 6, galeriden; presigned URL ile yükleme)
- Profil (gönderilerim / kaydedilenler)
- Ayarlar: profil, sağlık verisi rızasını geri alma, haftalık özet, şifre
  değiştirme, verilerimi indir, hesabı silme
- Eski rıza sürümüne sahip üyeler için açılışta rıza ekranı (`ConsentGate`)

- Anlık bildirim ve mesajlar (STOMP/WebSocket, `/ws`), sohbette fotoğraf gönderme, gönderiyi mesajla paylaşma, engellenenler ekranı
- Yönetim paneli (yalnızca ADMIN): istatistik, şikayetler, kullanıcılar, içerik, gruplar

Henüz yok: push bildirimleri (uygulama kapalıyken).

## Yapı

```
src/app          Expo Router ekranları ((auth), (tabs), groups, post, ...)
src/api          fetch istemcisi (token yenileme dahil), endpoint'ler, tipler
src/context      AuthContext (SecureStore'da saklanan oturum)
src/components   ortak arayüz bileşenleri
src/theme        web ile aynı renk paleti (açık/koyu)
src/content      aydınlatma / açık rıza metni (web ile aynı, v2)
```

Oturum anahtarları cihazın güvenli deposunda (Keychain / Keystore) saklanır.
Aydınlatma metni sürümü değişirse hem `src/content/privacy.ts` hem backend'deki
`ConsentPolicy.CURRENT_VERSION` güncellenmelidir.

## Mağaza yayını

`app.json` içindeki `ios.bundleIdentifier` ve `android.package`
(`com.sagliktan.app`) değerlerini kendi hesabına göre kontrol et; build için
`npx eas-cli@latest build`.
