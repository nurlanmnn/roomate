# Roomate

Roomate is a household coordination app for roommates to manage shared expenses, shopping, and calendar tasks in one place.

## What it does

- **Expense tracking**: add shared expenses, split evenly or manually, and see who owes whom.
- **Settle up flow**: upload payment proof, track settlement history, and handle debt forgiveness or balance netting.
- **Spending insights**: view category breakdowns and period-based trends.
- **Shopping lists**: manage multiple lists, quick-add items, and mark items complete with simple gestures.
- **Calendar and chores**: create household events and chores, and browse upcoming or past items.
- **Households**: create or join households using invite codes and switch between multiple households.

## Repository structure

- `mobile/` — Expo React Native app (`roommate-mobile`)
- `backend/` — Node.js/Express TypeScript API (`roommate-backend`)
- `docs/` — release, deployment, and legal documentation

## Local development

### 1) Start the backend

```bash
cd backend
npm install
npm run dev
```

### 2) Start the mobile app

In a second terminal:

```bash
cd mobile
npm install
npm start
```

Then run on iOS simulator/device with Expo options from the CLI, or use:

```bash
npm run ios
```

## Available scripts

### Backend (`backend/package.json`)

- `npm run dev` — start API with hot reload (`ts-node-dev`)
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run compiled API from `dist/index.js`

### Mobile (`mobile/package.json`)

- `npm start` — start Expo dev server
- `npm run ios` — run app on iOS
- `npm run web` — run Expo web target
- `npm run build:ios` — build iOS app with EAS production profile
- `npm run submit:ios` — submit iOS build using EAS

## Documentation

- [Documentation index](docs/README.md)
- [TestFlight - step by step](docs/TESTFLIGHT_NEXT_STEPS.md)
- [iOS App Store and EAS](docs/APP_STORE_IOS.md)
- [Deploy backend](docs/DEPLOY_BACKEND.md)
- [Privacy policy template](docs/legal/PRIVACY_POLICY.md)
- [Support template](docs/legal/SUPPORT.md)

## Tech stack

- **Mobile**: React Native (Expo), TypeScript
- **Backend**: Node.js, Express, TypeScript, MongoDB
- **Auth**: JWT with email OTP verification
