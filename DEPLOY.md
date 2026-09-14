# 🚀 راهنمای دیپلوی روی Vercel

## قدم ۰: نصب سورس (فقط بار اول / هر بار که فایل جدید گرفتی)

```bash
rm -rf ~/trading-os
mkdir -p ~/trading-os
tar -xzf ~/storage/downloads/project-source.tar.gz -C ~/trading-os
cd ~/trading-os
git init
git branch -M main
git add .
git commit -m "Trading OS v5 — growth hub, theme gallery, aurora UI"
git remote add origin https://github.com/Grandtyphon/trading-os.git
git push -u origin main --force
```

> اگه remote از قبل وجود داره، به جای خط‌های آخر فقط بزن:
> `git push origin main --force`

## قدم ۱: دریافت Gemini API Key

1. به [Google AI Studio](https://aistudio.google.com/apikey) برو
2. با Google account لاگین کن
3. کلیک **"Create API Key"**
4. کلید رو کپی کن (شروعش با `AIza...` هست)

---

## قدم ۲: تنظیم Environment Variables در Vercel

1. به [vercel.com](https://vercel.com) برو
2. پروژه‌ی `trading-os` رو باز کن
3. **Settings** → **Environment Variables**
4. این متغیرها رو اضافه کن:

| Key | Value | ضروری |
|-----|-------|------|
| `GEMINI_API_KEY` | (کلید Gemini از قدم ۱) | ✅ بله |
| `GEMINI_MODEL` | `gemini-3.7-flash` | اختیاری (پیش‌فرض) |
| `GEMINI_THINKING_LEVEL` | `medium` | اختیاری (پیش‌فرض) |

### توضیح متغیرها:

- **`GEMINI_API_KEY`**: کلید API از Google AI Studio (الزامی)
- **`GEMINI_MODEL`**: مدل Gemini (پیش‌فرض: `gemini-3.7-flash`)
- **`GEMINI_THINKING_LEVEL`**: سطح reasoning/thinking (پیش‌فرض: `medium`)
  - `none` / `low` / `medium` / `high`

> ⚠️ اگه چت منتور خطای «درخواست نامعتبر — مدل یا تنظیمات را بررسی کن» داد،
> مقدار `GEMINI_MODEL` رو به `gemini-2.5-flash` تغییر بده و Redeploy کن.

---

## قدم ۳: دیپلوی

- اگه پروژه به گیت‌هاب وصله، خودِ پوش یک دیپلوی جدید رو راه می‌ندازه — فقط صبر کن build سبز بشه.
- اگه دیپلوی خودکار نشد: برو به **Deployments** → آخرین دیپلوی → منوی ⋯ → **Redeploy** (۲-۳ دقیقه)

---

## قدم ۴: تست

لینک `https://trading-os-xxx.vercel.app` رو باز کن:
1. برو به **چت منتور**
2. یه پیام بزن: "سلام"
3. اگه جواب داد 🎉 موفق بودی!

---

## ⚠️ نکته‌ی مهم

متغیرهای قدیمی z.ai رو پاک کن (اگه هستن):
- ❌ `ZAI_API_KEY`
- ❌ `ZAI_BASE_URL`
- ❌ `ZAI_TOKEN`
- ❌ `ZAI_CHAT_ID`
- ❌ `ZAI_USER_ID`

این‌ها دیگر استفاده نمی‌شن.

---

## آفلاین بودن

داده‌ها (تریدها، گفتگوها، عادت‌ها) روی IndexedDB مرورگر ذخیره می‌شن — یعنی:
- ✅ کامل آفلاین کار می‌کنن
- ✅ بدون سرور
- ❌ فقط روی همون مرورگر قابل دسترسن (از تنظیمات → پشتیبان‌گیری بگیر)
