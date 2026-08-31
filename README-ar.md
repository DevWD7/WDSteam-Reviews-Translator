<div dir="rtl" align="right">

<p align="center">
  <img src="icons/icon128.png" width="90"/>
</p>

<p align="center">
  <a href="README.md"><img src="assets/lang-en-off.png" height="28" alt="English"/></a>
  <a href="README-ar.md"><img src="assets/lang-ar-on.png" height="28" alt="العربية"/></a>
</p>

# WDSteam Reviews Translator

![Version](https://img.shields.io/badge/version-1.0.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Tampermonkey%20%7C%20Steam-orange)

هي إضافة لمتصفح ستيم تعرض الترجمة داخل الصفحة نفسها بدون ما تغادرها, اللغات المدعومة للترجمة زر ترجمة تحت كل مراجعة وتعليق

- 🇸🇦 العربية (AR)

- 🇬🇧 الإنجليزية (EN)

- 🇫🇷 الفرنسية (FR)

- 🇪🇸 الإسبانية (ES)

- 🇩🇪 الألمانية (DE)

- 🇷🇺 الروسية (RU)

- 🇹🇷 التركية (TR)

- 🇵🇹 البرتغالية (PT)

- 🇨🇳 الصينية المبسطة (ZH-CN)

- 🇯🇵 اليابانية (JA)

- 🇰🇷 الكورية (KO)

- 🇮🇳 الهندية (HI)

- 🇮🇹 الإيطالية (IT)

- واكثر قريبا

تعمل على:

- 🌐 متصفح Chrome والمتصفحات المبنية على Chromium.

-   Tampermonkey 🐵

- 🖥️ يعمل مع برنامج Steam عبر Millennium Installer.

---

## ✨ المميزات

- ترجمة أي مراجعة أو تعليق في Steam بضغطة واحدة، وتظهر الترجمة تحت النص الأصلي مباشرة.

- ١٣ لغة للترجمة مع اكتشاف تلقائي للغة النص الأصلي.

- استخراج ذكي للنص: يُرسل نص المراجعة فقط — أما عناوين الصفحة والتواريخ وساعات اللعب وعدّادات الألعاب  تمنعها بشكل كامل.

- لا تتسرّب المراجعة المجاورة أبداً، فالترجمة دايماً تطابق المراجعة اللي ضغطت عليها.

- المراجعات الطويلة تتقسّم وتُترجم تلقائياً بدون قلق من حدود عدد الحروف.

- خفيفة، ولا تحتاج حساب، ولا تؤثر على أداء Steam.

---

## 📸 صور من الإضافة

<p align="center">
  <img src="screenshots/app-preview1.png" width="40%"/>
  <img src="screenshots/app-preview2.png" width="45%"/>
   <img src="screenshots/app-preview3.png" width="45%"/>
    <img src="screenshots/app-preview4.png" width="45%"/>
	 <img src="screenshots/app-preview5.png" width="45%"/>
</p>

---

# 📥 التثبيت

## إضافة Chrome

1. حمّل المشروع أو انسخه.

2. افتح صفحة الإضافات:

   ```
   chrome://extensions
   ```

3. فعّل **وضع المطور (Developer Mode)**.

4. اضغط **تحميل إضافة غير معبأة (Load unpacked)**.

5. اختر مجلد المشروع.

---

## Tampermonkey

1. ثبّت إضافة **Tampermonkey**.

2. استورد ملف **WDSteam-Reviews-Translator.js**.

3. افتح أي صفحة في Steam وسيعمل السكربت تلقائياً.

---

## عميل Steam (Millennium Installer)

إذا كنت ترغب باستخدام WDSteam Reviews Translator داخل **برنامج Steam نفسه** بدلاً من المتصفح، اتبع الخطوات التالية:

1. ثبّت **Millennium Installer** على جهازك.

2. افتح إعدادات Millennium.

3. ثبّت إضافة **Extensions**.

4. أدخل الكود التالي:

   ```
   788ed8554492
   ```

5. بعد تثبيت إضافة **Extensions**، ثبّت WDSteam Reviews Translator وسيعمل داخل عميل Steam مباشرة.

<p align="center">
  <img src="screenshots/millennium-install1.png" width="50%"/>
  <img src="screenshots/millennium-install2.png" width="50%"/>
  <img src="screenshots/millennium-install3.png" width="50%"/>
  <img src="screenshots/millennium-install4.png" width="50%"/>
  <img src="screenshots/millennium-install5.png" width="50%"/>
  <img src="screenshots/millennium-install6.png" width="50%"/>
  <img src="screenshots/millennium-install7.png" width="50%"/>
  <img src="screenshots/millennium-install8.png" width="50%"/>
</p>

> الصور أعلاه توضح خطوات تثبيت إضافة **Extensions** داخل إعدادات Millennium وإدخال الكود `788ed8554492`.

---

# 🚀 الاستخدام

افتح أي صفحة في متجر Steam أو صفحة مراجعة أو قائمة تعليقات، ورح يظهر زر **ترجمة المراجعة** تحت كل مراجعة وتعليق — اضغطه وتطلع لك الترجمة تحته مباشرة باللغة اللي اخترتها، واضغط مرة ثانية لإخفائها.

استخدم زر ⚙️ في الصفحة لفتح لوحة الإعدادات، وتقدر منها تغيّر لغة الواجهة، ولغة الترجمة، وألوان صندوق الترجمة.

---

# 🔐 الصلاحيات

تستخدم الإضافة الصلاحيات التالية فقط:

- `storage`

- الوصول إلى `translate.googleapis.com` لتنفيذ الترجمة.

> **لا تقوم الإضافة بجمع أو إرسال أي بيانات شخصية.**

---

# 📄 سياسة الخصوصية

راجع ملف:

`PRIVACY_POLICY.md`

---

# ⚖️ الترخيص

هذا المشروع مرخص بموجب **MIT License**.

راجع ملف:

`LICENSE`

</div>
