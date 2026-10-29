# SunoSuraksha Android app

`hackfinal.html` ko jaisa hai waisa hi Android app ke andar chalata hai (UI mein koi change nahi).
App ke upar teen cheezein add hoti hain:

1. **Internet ke bina SMS**: phone ki SIM se seedha SMS jaata hai.
2. **Background monitoring**: foreground service + wake lock, screen off hone par bhi mic chalta rehta hai.
3. **Asli Android notification**: alarm sound + vibration, net ke bina bhi aati hai.

## APK banana (sabse aasan: GitHub Actions)

1. Is zip ka `android-app/` folder aur `.github/` folder repo ke **root** mein daalo (jahan `hackfinal.html` hai).
2. Push karo. GitHub par **Actions -> Build Android APK -> Run workflow** (push par apne aap bhi chalta hai).
3. Run poora hone par **SunoSuraksha-apk** artifact download karo. Usme `app-debug.apk` hai.
4. Phone mein install karo (Unknown sources allow karna padega).

Laptop par banana ho to (Node 20, Java 17, Android SDK chahiye):

```
cd android-app
npm install
node scripts/prepare-www.js
npx cap add android
python3 scripts/patch-android.py
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Pehli baar chalane par

- Mic, SMS aur Notification ki permission "Allow" karo.
- "Battery optimisation" ka popup aaye to **Allow / Don't optimise** karo.
- Number poochhe to `+919876543210` jaisa daalo (country code ke saath, comma se alag karke kai number).
- Baad mein number badalna ho to existing **"SMS relay URL"** box mein likho: `native:+919876543210,+911111111111`.
  Us box mein `http://...` likhoge to purana relay-server wala tareeka chalega, native SMS nahi.
- Ab normal tarah **Start microphone** dabao. Notification bar mein "SunoSuraksha is listening" dikhega, matlab background service chal rahi hai.

## SMS ke rules (app jaisa hi)

- SMS sirf asli (non-DEMO) **High Risk** aur **Critical** events par jaata hai.
- "Send test SMS" button se test ho sakta hai.
- Message SIM ko de diya jaata hai. Delivery confirm nahi hoti. SIM mein balance aur mobile network chahiye (internet nahi).
- Native SMS use karo to relay server (`server.js`/Twilio) band rakho, nahi to dobara SMS jaayega.

## Limits (imandari se)

- **Pehli baar kisi asli phone par test karna zaroori hai.** Ye code yahan compile ya phone par run nahi ho paya.
- Kuch brands (Xiaomi, Oppo, Vivo, Realme, Samsung) apps ko background mein maar dete hain. Settings mein is app ko "Autostart" aur "No restrictions" do.
- User ya Android app ko force-stop kar de to monitoring band ho jaati hai. Phone restart ke baad apne aap shuru nahi hoti.
- Android 14+ mein mic wali service tabhi shuru hoti hai jab app screen par khula ho. Isliye **Start microphone** app khol kar dabao, uske baad screen off kar sakte ho.
- Sirf Android. iPhone par silent SMS ya background mic possible nahi.
- Google Play Store SMS permission wali apps par roak lagata hai. Ye APK direct install ke liye hai.
