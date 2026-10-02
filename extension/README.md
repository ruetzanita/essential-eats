# Essential Eats • Recipe Clipper (Manifest V3)

> **Browse the web without ads. Clip recipes directly into Essential Eats with 1 tap.**

The **Essential Eats Recipe Clipper** is a Manifest V3 Chrome Extension designed for home cooks who love scrolling food blogs and social media for dinner inspiration, but dread having to read 2,000-word personal essays, dodge video autoplay popups, and sift through dozens of advertisements just to copy ingredients.

---

## Key Features

- 🥗 **Instant Zero-Ad Extraction:** Automatically extracts clean ingredients, step-by-step instructions, prep/cook times, and yield from Schema.org (`Recipe` JSON-LD) with zero advertising, sponsored content, or blog preamble.
- ⚡ **Direct Essential Eats Sync:** Saves recipes directly into your Essential Eats Kitchen Hub favorites (`kh_sandbox_recipes`) via real-time cross-tab communication.
- 🏷️ **Automated Dietary Tag Detection:** Scans extracted ingredients to auto-tag **Gluten-Free**, **Dairy-Free**, **Nut-Free**, or **Vegetarian**.
- 🤖 **Edge AI Deep Scan Fallback:** If a recipe blog does not use structured Schema.org markup or conceals ingredients behind scripts, 1-tap **AI Deep Scan** triggers Gemini 3.8 Flash via Cloudflare Workers to structure the recipe into standardized JSON.
- 📋 **1-Tap Markdown Clipboard Export:** Cleanly copy the recipe ingredients and steps directly into Apple Notes, Google Keep, or Messages.

---

## How to Install in Google Chrome, Edge, or Brave

1. Open your browser and navigate to the Extensions management page:
   - **Chrome / Arc / Brave:** `chrome://extensions`
   - **Microsoft Edge:** `edge://extensions`
2. Toggle on **"Developer mode"** in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select the `extension/` folder from this repository:
   ```
   path/to/essential-eats/extension
   ```
5. Pin the **Essential Eats** icon to your browser toolbar!

---

## How It Works on Mobile (iOS / Android)

Since mobile Chrome and mobile Safari do not support standard desktop Chrome Web Store extensions, Essential Eats provides **two seamless mobile solutions**:

### 1. In-App "Clip Recipe from URL" Portal
1. On your phone, copy any link from Safari, Chrome, TikTok, Instagram, or Pinterest.
2. Open Essential Eats on your mobile browser (`essentialeats.ruetzanita.com`).
3. Tap **"CLIP RECIPE FROM URL"** in the Library view.
4. Paste the URL and tap **"FETCH & SAVE (NO ADS)"**.

### 2. 1-Tap Mobile Bookmarklet
Add this JavaScript bookmarklet to your phone's browser bookmarks bar:
```javascript
javascript:(function(){window.open('https://essentialeats.ruetzanita.com/?clip='+encodeURIComponent(location.href));})();
```
When browsing any recipe site on mobile, tap this bookmark to instantly open Essential Eats with the clean recipe extracted and ready to save!
