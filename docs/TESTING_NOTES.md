# TestFlight / QA notes

Add issues here while you test; we fix them in batches before rebuilding.

| Status | Issue |
|--------|--------|
| Fixed | Home screen + share text used “Roommate” instead of product name **Roomate** (iOS `CFBundleDisplayName`, `en` share message). Push title “New Roommate” → “New member” to avoid looking like the app name. |

| Fixed | Home showed onboarding/setup for a long time (or with balances visible) because **`hasData` ignored balances**, **shopping lists blocked** events/expenses requests, **double `loadData`** on mount, and overlapping fetches could clear loading before data arrived. Home now parallelizes shopping + core APIs, uses a load-generation guard, resets on household change, and treats non-empty balances as activity. |

**Template for new rows:** `| Open | Short description |`
