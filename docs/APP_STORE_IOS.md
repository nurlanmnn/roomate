# iOS App Store checklist (Roomate)

Expo project lives in [`mobile/`](../mobile/). Config is [`mobile/app.config.js`](../mobile/app.config.js) (not `app.json`).

## Before Apple account is fully active

You can still:

- Deploy the backend ([`DEPLOY_BACKEND.md`](DEPLOY_BACKEND.md)).
- Set production API URL for builds (below).
- Finalize legal text ([`legal/PRIVACY_POLICY.md`](legal/PRIVACY_POLICY.md)) and host it publicly.
- Prepare screenshots and App Store copy.

## Production API URL (required for release builds)

1. Deploy the API to HTTPS and note the base URL (no trailing slash), e.g. `https://api.example.com`.

2. **EAS (recommended)** — create a project environment variable so release builds embed the URL:

   ```bash
   cd mobile
   eas env:create --name EXPO_PUBLIC_API_URL --value https://api.example.com --scope project --type string
   ```

   Or use the [Expo dashboard](https://expo.dev) → Project → Environment variables.

3. Rebuild: `eas build --platform ios --profile production`.

`app.config.js` reads `EXPO_PUBLIC_API_URL` at build time into `extra.apiUrl`, which the app uses in production ([`mobile/src/api/apiClient.ts`](../mobile/src/api/apiClient.ts)).

## Bundle identifier

Current iOS bundle ID is set in [`mobile/app.config.js`](../mobile/app.config.js) as `com.roomate.app`. It **must match** the App ID you create in [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list).

If you need a different ID (e.g. `com.yourcompany.roomate`), change the `BUNDLE_ID` constant in `app.config.js` before your first App Store upload.

## Apple Developer (when enrollment is active)

1. Create an **App ID** with the same bundle identifier and enable capabilities you use (e.g. Push Notifications).
2. In **App Store Connect**, create the app record with that bundle ID.
3. Link your Apple account to EAS: `eas credentials` or follow prompts on first `eas build`.

## Build and submit

From `mobile/`:

```bash
npm run build:ios
# after QA on TestFlight:
npm run submit:ios
```

See [EAS Submit](https://docs.expo.dev/submit/ios/) for App Store Connect API keys if you use non-interactive submit.

## Store listing (your help)

- **Privacy Policy URL** — host the filled-in policy from [`legal/PRIVACY_POLICY.md`](legal/PRIVACY_POLICY.md).
- **Support URL** — see [`legal/SUPPORT.md`](legal/SUPPORT.md).
- Screenshots (required iPhone sizes; iPad if you keep tablet support).
- App Privacy questionnaire in App Store Connect (align with the privacy policy).

## What we need from you

- Final **API base URL** after deploy.
- Confirm or change **bundle ID** (`com.roomate.app` vs your company).
- **Hosted URLs** for privacy policy and support once you publish them (GitHub Pages, Notion, your site, etc.).
