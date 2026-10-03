# 🚛 Nakliye Takip — Kurulum Kılavuzu

## 1. Firebase Projesi Oluşturma

### Adım 1: Firebase Console
1. [Firebase Console](https://console.firebase.google.com)'a gidin
2. **"Proje Ekle"** butonuna tıklayın
3. Proje adını girin: `nakliye-takip` (veya istediğiniz)
4. Google Analytics'i isteğe bağlı olarak etkinleştirin
5. Projeyi oluşturun

### Adım 2: Web Uygulaması Ekle
1. Firebase Console'da **Proje Ayarları** (⚙️ ikonu) → **Genel** sekmesi
2. **"Uygulamalarınız"** bölümünde `</>` (Web) ikonuna tıklayın
3. Uygulama adını girin (örn: "Nakliye Takip Web")
4. **"Firebase SDK'yı Ekle"** ekranında `firebaseConfig` değerlerini kopyalayın

### Adım 3: Firebase Yapılandırması
`lib/firebase.ts` dosyasını açın ve şu alanları doldurun:
```typescript
const firebaseConfig = {
  apiKey: "Buraya_kopyaladığınız_API_key",
  authDomain: "projeniz.firebaseapp.com",
  projectId: "projeniz-id",
  storageBucket: "projeniz.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};
```

## 2. Firebase Servislerini Etkinleştirme

### Authentication
1. Firebase Console → **Authentication** → **"Başla"**
2. **"Sign-in method"** sekmesi → **Email/Password** → Etkinleştir → Kaydet

### Firestore Database
1. Firebase Console → **Firestore Database** → **"Veritabanı Oluştur"**
2. **"Test modunda başla"** seçin (başlangıç için)
3. Konum seçin: `europe-west1` (Avrupa - önerilir)
4. Oluşturun

### Firestore Güvenlik Kuralları (Production)
1. Firestore → **Kurallar** sekmesi
2. `firestore.rules` dosyasının içeriğini yapıştırın
3. **Yayınla**

## 3. Uygulamayı Çalıştırma

```bash
# Terminal'de proje klasörüne gidin
cd ~/Desktop/NakliyeTakip

# Bağımlılıkları yükle (ilk kez)
npm install

# Uygulamayı başlat
npm start
```

Expo Go uygulamasını telefonunuza indirin ve QR kodu tarayın.

## 4. İlk Kullanım

1. **"Kayıt Ol"** ile yönetici hesabı oluşturun
2. **Şirket adı** girin (örn: "XYZ Nakliye")
3. **Araçlar** sekmesinden ilk aracı ekleyin
4. **Sefer Ekle** ile ilk seferi kaydedin

## 5. Sürücü Ekleme

> Not: Sürücü ekleme şu an sadece Firebase Authentication Console üzerinden yapılabilir. İleride yönetici panelinden sürücü ekleme özelliği eklenecek.

Manuel yöntem:
1. Firebase Console → Authentication → Kullanıcı Ekle
2. Email ve şifre belirleyin
3. Sürücü, uygulamaya giriş yapınca şirket ID'si eşleşmezse giriş yapamaz

---

## 📁 Proje Yapısı

```
NakliyeTakip/
├── app/
│   ├── (auth)/           # Giriş / Kayıt ekranları
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/           # Ana sekmeler
│   │   ├── index.tsx     # Dashboard
│   │   ├── trips.tsx     # Seferler
│   │   ├── fuel.tsx      # Yakıt
│   │   ├── vehicles.tsx  # Araçlar
│   │   └── reports.tsx   # Raporlar
│   ├── trip/             # Sefer detay & ekle
│   ├── fuel/             # Yakıt ekle
│   └── vehicle/          # Araç detay & ekle
├── components/           # Yeniden kullanılabilir bileşenler
├── constants/colors.ts   # Renk paleti
├── hooks/
│   ├── useAuth.tsx       # Authentication context
│   └── useData.tsx       # Veri context (gerçek zamanlı)
├── lib/
│   ├── firebase.ts       # Firebase yapılandırması
│   └── firestore.ts      # Firestore CRUD işlemleri
└── types/index.ts        # TypeScript tipleri
```

## 🛠️ Özellikler

| Özellik | Açıklama |
|---------|----------|
| 🔐 Auth | Email/şifre ile giriş, admin ve sürücü rolleri |
| 🚛 Sefer Takibi | Başlangıç-bitiş km, rota, yük, gelir |
| ⛽ Yakıt Takibi | Litre, fiyat, otomatik toplam hesaplama |
| 🚗 Araç Yönetimi | Plaka, marka, model, aktif/pasif durumu |
| 📊 Raporlama | Aylık KM ve yakıt grafikleri, araç bazlı özet |
| ☁️ Firebase | Gerçek zamanlı veri senkronizasyonu |

## 5. Müşteri Cari Hesapları

**Müşteriler** sekmesi (sadece yönetici görür) her müşteri için bir kart tutar. Kartta üç bölüm vardır:

- **Sohbet:** Ne olduğunu düz yazıyla yazın, tutar/tür/tarih otomatik çıkarılıp listeye eklenir.
  - `İzmir seferi 12.500 TL` → İş/Fatura (müşteri borcu)
  - `Ahmet bey 5 bin ödedi`, `havale geldi 20000` → Tahsilat
  - `dün otoban 450, yakıt 3.200` → iki ayrı Masraf
  - `15.09`, `3 eylül`, `dün` gibi tarihler anlaşılır; yoksa bugünün tarihi kullanılır.
  - Eklenen kayda dokunarak türünü/tutarını düzeltebilirsiniz; mesaja uzun basarak silebilirsiniz.
- **Ekstre:** Müşteriye gönderilecek hesap dökümü (sadece iş ve tahsilatlar, yürüyen bakiye). "Ekstre Gönder" ile WhatsApp, e-posta vb. üzerinden paylaşılır.
- **Masraflar:** Sadece size özel sayfa. Bu müşteri için yapılan giderler ve kâr hesabı; ekstreye girmez.

Veriler Supabase'de `customers`, `customer_tx`, `customer_messages` tablolarında tutulur.

## 6. Supabase'e Geçiş (Firebase'den)

Uygulama artık veritabanı ve giriş için **Supabase** kullanıyor (proje: `qkyifdfcvfbngdguhqci`).
Firebase sadece eski hesapları taşımak için duruyor.

- **Şema:** `supabase/migrations/` — tablolar, RLS kuralları (şirketler birbirinin verisini göremez,
  müşteri cari sadece yöneticiye açık, kullanıcı kendi rolünü/şirketini değiştiremez).
- **Edge Function'lar:** `supabase/functions/`
  - `migrate-user`: Firebase ID token'ını doğrular, aynı e-posta ve şifreyle Supabase hesabını açar,
    profili Firestore'dan taşır.
  - `import-company`: Yöneticinin şirketine ait kullanıcı, araç, sefer, yakıt ve müşteri verilerini
    Firestore'dan Supabase'e kopyalar (belge kimlikleri korunur, tekrar çalıştırmak güvenlidir).
  - Firebase Admin anahtarı gerekmez; Firestore, kullanıcının kendi token'ıyla okunur.

### Geçiş nasıl işler?
1. Kullanıcı yeni sürümde her zamanki e-posta ve şifresiyle giriş yapar.
2. Supabase'de hesabı yoksa uygulama şifreyi Firebase'le doğrular ve hesabı otomatik taşır.
3. **Yönetici** ilk girişinde şirketin tüm verileri otomatik aktarılır. Aktarım yarıda kalırsa
   bir sonraki girişte tekrar denenir.
4. Kimse şifre yenilemek zorunda kalmaz.

> Yöneticinin, yeni sürüme sürücülerden **önce** girmesi önerilir; böylece seferler ve araçlar hazır olur.
> Aktarım tamamlanana kadar eski sürümle Firebase'e yazılan kayıtlar, yöneticinin girişinde aktarılır;
> aktarımdan **sonra** eski sürümle girilen kayıtlar taşınmaz. Herkesin güncellemeyi alması önemlidir.

`firestore.rules` geçiş süresince yerinde kalmalı (aktarım bu kurallarla okuma yapar).
Tüm kullanıcılar taşındıktan sonra Firebase kapatılabilir.

### Yeni kayıtlar
Supabase varsayılan olarak yeni kayıtlarda e-posta doğrulaması ister. Doğrulamasız kayıt için:
Supabase Dashboard → Authentication → Sign In / Providers → Email → "Confirm email" kapatılabilir.
