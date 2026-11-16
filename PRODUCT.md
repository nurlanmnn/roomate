# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

Anyone sharing a home: students in shared flats, working adults sharing an apartment, couples, families. No single group dominates (confirmed by the owner, 2026-11-15). They open the app in short bursts during ordinary household moments: at the supermarket shelf, right after paying a bill, when a flatmate asks "what do I owe you?", or when checking whose turn a chore is.

## Product Purpose

Roomate is a household coordination app. One shared place for a household's money (expenses, who owes whom, settling up), shopping lists, and calendar (events and rotating chores). Success is a household that no longer argues or loses track: every member can see the current balance, the shopping list and whose turn it is, and can record a new expense or item in seconds.

## Positioning

Money, shopping and chores for one household live in the same app and the same membership, so a grocery run can become a split expense and a chore rotation sits next to the calendar. Not a general finance tracker and not a general to-do app.

## Operating Context

- Expo React Native app (`mobile/`), Node/Express/MongoDB API (`backend/`).
- iPhone first; Android is a later target, so design choices must not depend on iOS-only capabilities (owner, 2026-11-15).
- Used one-handed, often on the move or in a shop, sometimes offline (the app has an offline banner and local caches).
- Five interface languages: English, German, Spanish, French, Turkish. Labels vary a lot in length.
- Multiple currencies per household; amounts are the most-read content in the app.
- Light and dark appearance are both supported and user-switchable.
- The iOS build is already configured for TestFlight / App Store Connect.

## Capabilities and Constraints

- Expenses: add, split evenly or manually, categories, templates, filters, spending insights and monthly trend.
- Balances: pairwise who-owes-whom, settle up with payment proof upload, settlement history, balance history, debt forgiveness and netting.
- Shopping: multiple lists, quick add, units, swipe to complete.
- Calendar: household events, chore rotations with completion tracking.
- Households: create or join by invite code, switch between households, member roles.
- Account: email OTP verification, password reset, notification settings, language, theme, account deletion.
- Top-level navigation today is five tabs: Home, Expenses, Shopping, Calendar, Settings. The owner has allowed navigation and screen-flow changes where they improve UX.
- No backend or data-model changes are implied by the redesign.

## Brand Commitments

- The name **Roomate** stays.
- Colours, logo mark, app icon and typeface are open to change (owner, 2026-11-15). A new icon must be re-uploaded to App Store Connect.
- The owner finds the current look "too childish" and wants it replaced, not polished.
- Do not use Claude's default colour theme (warm cream with terracotta/orange accent).

## Evidence on Hand

- Real feature set and copy in five locales under `mobile/src/locales/`.
- No testimonials, user counts, press or pricing exist; none may be invented.
- No screenshots of the shipped app are stored in the repository.

## Product Principles

1. The answer first: balance, list, whose turn. Recording comes second, decoration last.
2. Money must read as trustworthy. Amounts, direction (you owe / you are owed) and currency are never ambiguous.
3. Fast one-handed entry beats rich forms.
4. Fair and neutral between household members; the app never takes sides or nags.
5. Works for a student and for a family: nothing age-coded.

## Accessibility & Inclusion

- The owner asked for accessibility to be taken into account. Working standard: WCAG 2.2 AA contrast in both appearances, 44pt touch targets, Dynamic Type support, VoiceOver labels on every control, Reduce Motion honoured.
- Owing vs owed must never be signalled by colour alone.
