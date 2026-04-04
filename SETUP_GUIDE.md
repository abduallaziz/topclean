# 🚗 TOP CLEAN CLOUD
## دليل الإعداد والنشر الكامل

---

## 📋 المتطلبات
- Node.js 18+
- حساب Supabase (مجاني)
- حساب Vercel (مجاني)
- Android Studio (لبناء APK)

---

## 🗄️ الخطوة 1 — إعداد Supabase (قاعدة البيانات)

### 1.1 إنشاء المشروع
1. اذهب إلى [supabase.com](https://supabase.com)
2. اضغط **New Project**
3. اختر اسماً للمشروع (مثلاً: `topclean`)
4. اختر كلمة مرور قوية
5. اختر المنطقة: **Middle East (Bahrain)**

### 1.2 تشغيل قاعدة البيانات
1. افتح **SQL Editor** في Supabase
2. انسخ محتوى ملف `supabase/migrations/001_init.sql`
3. اضغط **Run** — سيُنشئ كل الجداول تلقائياً

### 1.3 الحصول على المفاتيح
من **Settings → API**:
- `Project URL` → ضعه في `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → ضعه في `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → ضعه في `SUPABASE_SERVICE_ROLE_KEY`

### 1.4 إضافة مستخدم أول (المدير)
في **SQL Editor**:
```sql
-- 1. أنشئ المتجر
INSERT INTO shops (name, phone, address, tax_rate)
VALUES ('TOP CLEAN', '0500000000', 'الرياض', 15)
RETURNING id;

-- 2. خذ الـ id وأنشئ مستخدماً في Authentication
-- اذهب إلى Authentication → Users → Add user
-- Email: admin@topclean.local
-- Password: ضع كلمة مرور قوية

-- 3. خذ الـ UUID من الجدول وأضف المستخدم
INSERT INTO shop_users (auth_id, shop_id, name, username, role)
VALUES (
  'UUID_من_auth.users',
  'UUID_من_shops',
  'المدير العام',
  'admin',
  'admin'
);
```

---

## 💻 الخطوة 2 — تشغيل المشروع محلياً

```bash
# 1. نسخ المشروع
git clone https://github.com/YOUR_USERNAME/topclean-cloud
cd topclean-cloud

# 2. تثبيت المكتبات
npm install

# 3. إعداد متغيرات البيئة
cp .env.example .env.local
# افتح .env.local وأدخل مفاتيح Supabase

# 4. تشغيل المشروع
npm run dev
# افتح http://localhost:3000
```

---

## 🚀 الخطوة 3 — النشر على Vercel (الإنترنت)

```bash
# 1. ثبّت Vercel CLI
npm i -g vercel

# 2. ارفع المشروع
vercel

# 3. أضف متغيرات البيئة في لوحة Vercel:
#    vercel.com → Project → Settings → Environment Variables
#    أضف: NEXT_PUBLIC_SUPABASE_URL
#    أضف: NEXT_PUBLIC_SUPABASE_ANON_KEY
#    أضف: SUPABASE_SERVICE_ROLE_KEY

# 4. أعد النشر
vercel --prod
```

✅ التطبيق سيكون متاحاً على: `https://topclean.vercel.app`

---

## 📱 الخطوة 4 — بناء APK للأندرويد

### 4.1 تثبيت Capacitor
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/splash-screen @capacitor/status-bar

npx cap init "TOP CLEAN" "com.topclean.app"
```

### 4.2 بناء Next.js Static
```bash
# أضف في next.config.js:
# output: 'export'

npm run build
npx cap add android
npx cap sync android
```

### 4.3 فتح Android Studio
```bash
npx cap open android
```
ثم في Android Studio:
1. **Build → Generate Signed Bundle/APK**
2. اختر **APK**
3. أنشئ keystore جديد
4. اضغط **Finish**

الـ APK في: `android/app/release/app-release.apk`

---

## 🔄 الخطوة 5 — التحديث التلقائي (CI/CD)

أنشئ ملف `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: '18' }
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 🏗️ هيكل المشروع

```
topclean-cloud/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # صفحات تسجيل الدخول
│   │   │   └── login/
│   │   ├── (dashboard)/        # لوحة التحكم
│   │   │   ├── pos/            # الكاشير
│   │   │   ├── orders/         # الطلبات
│   │   │   ├── customers/      # العملاء
│   │   │   ├── analytics/      # التحليلات
│   │   │   ├── expenses/       # المصروفات
│   │   │   └── settings/       # الإعدادات
│   │   └── api/                # API Routes
│   │       ├── checkout/       # POST /api/checkout
│   │       ├── orders/         # GET/POST /api/orders
│   │       └── customers/      # GET/POST /api/customers
│   ├── components/
│   │   ├── pos/                # مكونات الكاشير
│   │   ├── reports/            # مكونات التقارير والطباعة
│   │   └── ui/                 # مكونات عامة
│   ├── hooks/                  # React hooks للبيانات
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   └── db.ts               # Database operations
│   └── types/
│       └── database.ts         # TypeScript types
├── supabase/
│   └── migrations/
│       └── 001_init.sql        # Schema كامل
├── capacitor.config.ts         # إعدادات APK
├── .env.example                # متغيرات البيئة
└── package.json
```

---

## 💰 تكاليف الاستضافة

| الخدمة | الخطة المجانية | عدد المستخدمين |
|--------|---------------|----------------|
| Supabase | 500MB DB + 2GB bandwidth | كافي لـ 5-10 متاجر |
| Vercel | 100GB bandwidth | كافي للاستخدام العادي |
| **المجموع** | **$0/شهر** | مجاني تماماً للبداية |

عند النمو:
- Supabase Pro: $25/شهر
- Vercel Pro: $20/شهر

---

## 🔧 إضافات مستقبلية مقترحة

| الميزة | الأداة | الوقت |
|--------|--------|-------|
| إشعارات Push | Supabase Edge Functions + FCM | 2 أيام |
| تعدد الفروع | Multi-tenant بالـ shop_id الموجود | جاهز! |
| لوحة مدير مركزية | صفحة جديدة | 3 أيام |
| تصدير Excel | xlsx library | يوم واحد |
| طباعة بلوتوث | Capacitor + Bluetooth plugin | أسبوع |
| نقطة البيع على تابلت | CSS responsive | يومان |
| تطبيق iOS | Capacitor + Xcode | أسبوع |

---

## 📞 الدعم والتطوير

لأي استفسار أو طلب تطوير، أرسل على:
- المشروع جاهز للتسليم والنشر الفوري ✅
