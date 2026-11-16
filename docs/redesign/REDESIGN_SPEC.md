# Roomate redesign: "House Number, full enamel"

Branch: `redesign/house-number`. Owner approved this direction on 2026-11-15 and asked for the whole
app to be redesigned (visuals and, where it helps, navigation). Product facts live in `/PRODUCT.md`.
The approved sketch is `.impeccable/mocks/decision/house-number-variants.html`, phone **B**.

Work only in `mobile/`. No backend, API, data-model or business-logic changes. Keep every existing
feature reachable. All user-facing strings go through `t()`; a new key must be added to all five
locale files (`mobile/src/locales/{en,de,es,fr,tr}.ts`) with a real translation.

## The idea

The household is an address. Its key number sits on a cobalt enamel plaque in tall signage numerals.
Everything else is calm, native-feeling iOS: porcelain ground, white grouped lists, system type.
The old look (mint gradients, candy green, glass cards, bouncy bubble tab bar, icon-tile stat cards,
tip cards, emoji in copy) is the anti-reference: remove it wherever it survives.

## Tokens (already implemented in `mobile/src/theme/`)

Use `useThemeColors()`; never hard-code hex or rgba in screens/components (only exception: pure
`#FFFFFF`/transparent overlays on the enamel field via `colors.onEnamel*`).

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | #F4F5F8 | #0A0F26 | screen ground |
| `surface` | #FFFFFF | #131A3A | list groups, sheets, inputs |
| `border` / `borderLight` | #D5DAE6 / #E4E7EE | #2C3768 / #252E57 | input borders / row separators |
| `text` / `textSecondary` / `textTertiary` | #10151F / #535B6B / #6B7385 | #FFF / #AAB3D3 / #8C96BB | ink |
| `primary` + `onPrimary` | #1D3BA8 + #FFF | #7C98FF + #0A0F26 | interactive tint; fills carry `onPrimary` text, never literal white |
| `primarySoft` / `primaryUltraSoft` | #DCE3F8 / #EEF1FB | #1E2A5E / #161F47 | tinted icon wells, selected rows |
| `enamel` + `onEnamel` / `onEnamelSecondary` | #1D3BA8 + #FFF / #D3DCFA | #2B50D8 + #FFF / #D6DEFF | the plaque/header field only |
| `ink` + `onInk` | #10151F + #FFF | #FFF + #0A0F26 | strongest button (one per screen at most) |
| `marigold` + `onMarigold` | #F2B705 + #10151F | #FFD84A + #0A0F26 | rare highlight: your own avatar, "your turn", badges. Never as text on white |
| `owed` / `owe` | #1D3BA8 / #C42F17 | #A3B7FF / #FF8A76 | balance direction, ALWAYS with a +/− sign and a word |
| `danger`, `warning`, `success` (+`Soft`) | | | states only |

Radii: `radii.sm` 10 (chips, icon wells), `radii.md` 14 (buttons, inputs), `radii.lg` 16 (list groups,
cards), `radii.xl` 28 (sheet top / hero only), `radii.pill`. Spacing scale `spacing.xxs…xxxl`
(4/8/12/16/20/24/32/40). Screen side gutter is `spacing.md` (16) for groups, `spacing.lg` (20) for
headings and free text.

Type: system face for all UI text. Display face (`fonts.displayBold`, `fonts.displayExtrabold`,
`fonts.displaySemibold` = Sofia Sans Semi Condensed) ONLY for money amounts, counts, and top-level
screen titles. Never set `fontWeight` together with a `fonts.*` family. Amounts use
`fontVariant: ['tabular-nums']`. Sizes: body 16–17, secondary 13–14, never below 12. No uppercase
tracked "eyebrow" labels above headings anywhere. Section headings are sentence case, 20pt bold.

Depth: flat. No gradients, no BlurView, no coloured glows. At most `shadows.sm` on a floating
button. List groups have no border in light mode and no shadow.

## Shared components (use these, do not re-invent)

- `components/ui/EnamelHeader.tsx`: the cobalt field at the top of each TAB screen. Props: `title`,
  optional `subtitle`, `right` (ReactNode of `HeaderIconButton`s), `children` (the screen's key
  figure/controls on enamel). It extends under the status bar.
- `components/ui/Sheet.tsx`: porcelain body with `radii.xl` top corners that overlaps the header.
- `components/ui/Group.tsx` (`Group`, `GroupRow`, `SectionHeading`): white inset grouped list, rows
  min 56pt high, hairline separators inset to the text, optional leading icon well, trailing
  value/chevron/accessory.
- `components/ui/Amount.tsx`: money in the display face with smaller raised cents; `direction`
  prop (`owed` | `owe` | `neutral`) adds the sign and colour.
- `components/PrimaryButton.tsx`: variants `primary` (enamel), `ink`, `secondary` (surface +
  border), `outline`, `danger`. 50pt high, `radii.md`. One filled button per view.
- `components/ui/Avatar.tsx`, `components/ui/EmptyState.tsx`, `components/FormTextInput.tsx`,
  `components/ui/Card.tsx` (flat surface), `components/ui/ScreenHeader.tsx`.
- `SanctuaryScreenShell` is now just a flat `background` screen container (name kept for
  compatibility). Stack screens use the native header (porcelain, ink title).

Icons: Ionicons outline set only, 22pt in rows, 24–26 in the tab bar, one stroke weight. No emoji
as icons or in copy.

## Navigation and UX

- Four tabs: Home, Money (`Expenses` route, label `tabs.expenses` → "Money"), Shopping, Calendar.
  Standard docked tab bar. Settings is a stack screen opened from the avatar button in the Home
  header (`navigation.getParent()?.navigate('Settings')`).
- Top-level tab screens: `EnamelHeader` + `Sheet`. Detail/stack screens: native header on
  porcelain, content in `Group`s. Create/edit flows stay modals with Cancel / Save in the header
  where possible and a single primary button at the bottom otherwise.
- Home answers first: net balance on enamel, who-owes-whom line, Add expense + Settle up, then
  "Today" (your chore turn, shopping count, next events). Spending insights move to Money.
- Money: header shows this month's total and the period switcher; body = balances group, then the
  expense list (date-grouped rows: category icon well, title, "paid by", amount right-aligned in
  display face), insights/chart under a "Insights" segment or section. FAB replaced by a header
  "+" `HeaderIconButton` plus keep any existing quick-add affordance that is faster.
- Shopping: header shows list name + remaining count; list tabs as a native-looking segmented
  row; items as `GroupRow`s with a 28pt circular checkbox (44pt hit area), completed items struck
  through in `textTertiary`; add-item field docked at the bottom above the tab bar.
- Calendar: header shows month + today; month grid uses enamel for the selected day, marigold dot
  for days with your chore; agenda below as `Group`s. Chore rotation rows show whose turn with
  avatar; "your turn" uses a marigold badge with ink text.
- Settings and sub-screens: plain inset grouped lists (already close; restyle rows/switches,
  `Switch` trackColor = `primary`). Danger zone = `danger` text rows, no red cards.
- Auth + household select: porcelain ground, enamel plaque at top with "Roomate" in the display
  face, ink text, one primary button; no gradients or glass.

## Accessibility (required on every screen)

- Contrast AA in both appearances (tokens above are pre-checked for text on `surface`/`background`).
- Every Pressable/Touchable: 44×44pt minimum (use `hitSlop` when the visual is smaller),
  `accessibilityRole`, and `accessibilityLabel` when it has no text; toggles/checkboxes expose
  `accessibilityState`.
- Text scales with Dynamic Type (`AppText`, never `disableScaling` except inside fixed icon chips);
  rows grow in height rather than truncate; give long labels `numberOfLines` + flex so German and
  Turkish strings do not clip.
- Never signal owe/owed, done/not done, or errors by colour alone.
- Motion: no bouncy springs. Simple 150–220ms fades/slides; skip when Reduce Motion is on.

## Verification

`cd mobile && npx tsc --noEmit` must pass. Then run in the iOS simulator and check each screen in
light and dark (`xcrun simctl ui booted appearance dark|light`).

## Status (update this list as work lands; commit after each item)

- [x] Tokens, fonts
- [x] Core components (PrimaryButton, Card, FormTextInput, ScreenHeader, shell, EnamelHeader, Sheet, Group, Amount, Avatar, EmptyState)
- [x] Navigation: 4 tabs, standard tab bar, Settings via Home avatar, plain stack headers
- [x] Home
- [ ] Money: ExpensesScreen, CreateExpense, SettleUp, SettlementHistory, BalanceHistory + their components
- [ ] Shopping: ShoppingListScreen + components/Shopping/*
- [ ] Calendar: CalendarScreen, CreateEvent, ChoreRotation, CreateChore + components
- [ ] Settings: Settings, Account, Household, Notifications + components/Settings/*
- [ ] Auth screens + HouseholdSelect + HouseholdCard
- [ ] Leftover sweep: no LinearGradient/BlurView/hard-coded colours/emoji; delete unused old components
- [ ] `tsc` clean; simulator check light + dark; DESIGN.md written; pushed

Note (2026-11-15 night): six Codex runs were started for Money (list + forms), Shopping, Calendar, Settings and Auth/HouseholdSelect. Their edits may be sitting uncommitted in the working tree: review each area's diff against this spec, fix, typecheck, then commit per area. New strings they needed are listed in docs/redesign/new-strings.md and must be added to all five locale files.
