# TestFlight: do these steps in order

Your app is **Roomate** in [`mobile/`](../mobile/). Bundle ID: **`com.roomate.app`** ([`app.config.js`](../mobile/app.config.js)).

Release builds call whatever you set as **`EXPO_PUBLIC_API_URL`** at build time. They **cannot** use `http://localhost` — you need a **deployed HTTPS API** before the TestFlight build is useful for real testing.

---

## Phase A — Backend (do this first if it is not live yet)

1. Deploy the Node API from [`backend/`](../backend/) to a host with HTTPS (Railway, Render, Fly.io, etc.).
2. Confirm it works: `curl https://YOUR-API-URL/health` → `{"status":"ok"}`.
3. Copy your **exact base URL** (no trailing slash), e.g. `https://roomate-api.onrender.com`.

**Stop here until you have that URL.** Everything below needs it.

---

## Phase B — Apple Developer (website)

4. Open [Certificates, Identifiers & Profiles → Identifiers](https://developer.apple.com/account/resources/identifiers/list).
5. Click **+** → **App IDs** → **App**.
6. **Bundle ID**: choose **Explicit** and enter: **`com.roomate.app`** (must match `app.config.js`).
7. Enable capabilities you need (at minimum the app runs; enable **Push Notifications** if you use remote push).
8. **Register**, then **Save**.

---

## Phase C — App Store Connect (website)

9. Open [App Store Connect](https://appstoreconnect.apple.com/) → **My Apps**.
10. Click **+** → **New App**.
11. **Platforms**: iOS. **Name**: Roomate (or your public name). **Bundle ID**: pick **`com.roomate.app`** from the dropdown (it appears after Phase B).
12. **SKU**: any unique string (e.g. `roomate-ios-1`). **User Access**: Full Access unless you use a team with limited roles.
13. Create the app. You can fill Privacy / support URLs later for **App Review**; TestFlight internal testing works with minimal metadata.

---

## Phase D — EAS (on your machine)

Install CLI once (from repo root or `mobile/`):

```bash
cd mobile
npm install
```

Log in and link the project:

14. `npx eas login` (Expo account — create one at [expo.dev](https://expo.dev) if needed).
15. `npx eas whoami` — confirm you’re logged in.
16. `npx eas project:info` — should show project `roomate-app` / projectId from `app.config.js`. If prompted to link, accept.

Set the **production API URL** for iOS release builds (pick **one** method):

**Option 1 — Expo dashboard (easiest)**  
[expo.dev](https://expo.dev) → your project → **Environment variables** → add **`EXPO_PUBLIC_API_URL`** = `https://YOUR-API-URL` for the **production** (or **preview**, matching your build profile) environment used by `eas build`.

**Option 2 — CLI** (command name may vary by EAS version; if it fails, use the dashboard):

```bash
cd mobile
npx eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://YOUR-API-URL
```

Verify config picks it up (optional):

```bash
cd mobile
EXPO_PUBLIC_API_URL=https://YOUR-API-URL npx expo config --json | grep apiUrl
```

You should see your URL under `extra.apiUrl`.

---

## Phase E — First iOS production build

17. From **`mobile/`**:

```bash
npm run build:ios
```

Or: `npx eas build --platform ios --profile production`

18. When asked about credentials, let **EAS manage** certificates and provisioning (recommended). Sign in with the **Apple ID** that is in the Developer Program.
19. Wait for the cloud build to finish (Expo dashboard shows logs). Download the `.ipa` only if you need it; submit step below uploads for you.

---

## Phase F — Upload to App Store Connect (TestFlight)

20. From **`mobile/`**:

```bash
npm run submit:ios
```

Or: `npx eas submit --platform ios --profile production --latest`

21. Follow prompts: usually **log in with Apple ID** or use an **App Store Connect API key** (Expo docs: [Submit to App Store](https://docs.expo.dev/submit/ios/)).
22. When submit succeeds, open **App Store Connect** → your app → **TestFlight**. Processing can take **10–30 minutes** (sometimes longer) before the build appears.

---

## Phase G — Install on your iPhone

23. **TestFlight** tab → **Internal Testing** → create a group → add your Apple ID email as an internal tester (must be users listed in App Store Connect **Users and Access**).
24. On the iPhone, install the **TestFlight** app from the App Store, accept the invite, install **Roomate**.

---

## If something fails

| Problem | What to check |
|--------|----------------|
| Build fails on signing | Apple ID has **Account Holder** or **Admin** / **App Manager**; bundle ID exists and matches. |
| App opens but API errors | Rebuild after setting **`EXPO_PUBLIC_API_URL`**; confirm URL in production with `curl /health`. |
| Submit can’t find app | App record created in App Store Connect with same **bundle ID**. |
| `eas env:create` not found | Use Expo dashboard → Environment variables, or run `npx eas env --help`. |

---

## What’s already done in the repo

- [`mobile/app.config.js`](../mobile/app.config.js) — bundle ID, iOS permission strings, `extra.apiUrl` from env.
- [`mobile/eas.json`](../mobile/eas.json) — `production` profile with `autoIncrement` for iOS build number.
- [`mobile/package.json`](../mobile/package.json) — `build:ios` and `submit:ios` scripts.
- [`docs/DEPLOY_BACKEND.md`](DEPLOY_BACKEND.md) — hosting the API.

---

## Your checklist (copy/paste)

- [ ] HTTPS API URL working (`/health`)
- [ ] App ID `com.roomate.app` registered in Apple Developer
- [ ] New app in App Store Connect with that bundle ID
- [ ] `EXPO_PUBLIC_API_URL` set in EAS / Expo for production builds
- [ ] `npm run build:ios` completed successfully
- [ ] `npm run submit:ios` completed; build visible in TestFlight after processing
- [ ] TestFlight app installed on device; login/signup tested against production API

When you’re ready for **public App Store review** (not just TestFlight), fill [privacy](legal/PRIVACY_POLICY.md) and [support](legal/SUPPORT.md), host them, and add URLs in App Store Connect.
