---
name: Roomate
description: Household money, shopping and chores on a cobalt enamel house-number plaque over calm native iOS lists.
colors:
  # Light appearance
  background: "#F4F5F8"
  surface: "#FFFFFF"
  surface-alt: "#F8F9FB"
  border: "#D5DAE6"
  border-light: "#E4E7EE"
  text: "#10151F"
  text-secondary: "#535B6B"
  text-tertiary: "#626A7C"
  primary: "#1D3BA8"
  on-primary: "#FFFFFF"
  primary-soft: "#DCE3F8"
  primary-ultra-soft: "#EEF1FB"
  enamel: "#1D3BA8"
  on-enamel: "#FFFFFF"
  on-enamel-secondary: "#D3DCFA"
  enamel-keyline: "rgba(255,255,255,0.28)"
  ink: "#10151F"
  on-ink: "#FFFFFF"
  marigold: "#F2B705"
  marigold-soft: "#FDF3CF"
  on-marigold: "#10151F"
  neutral-well: "#F0F2F7"
  owed: "#1D3BA8"
  owe: "#C42F17"
  danger: "#C42F17"
  danger-soft: "#FBE4DF"
  warning: "#8F6100"
  success: "#1F7A4D"
  success-soft: "#DDF1E6"
  # Dark appearance ("night enamel")
  background-dark: "#0A0F26"
  surface-dark: "#131A3A"
  surface-alt-dark: "#161D40"
  surface-elevated-dark: "#1A2248"
  border-dark: "#2C3768"
  border-light-dark: "#252E57"
  text-dark: "#FFFFFF"
  text-secondary-dark: "#AAB3D3"
  text-tertiary-dark: "#8C96BB"
  primary-dark: "#7C98FF"
  on-primary-dark: "#0A0F26"
  primary-soft-dark: "#1E2A5E"
  primary-ultra-soft-dark: "#161F47"
  enamel-dark: "#2B50D8"
  on-enamel-dark: "#FFFFFF"
  on-enamel-secondary-dark: "#D6DEFF"
  enamel-keyline-dark: "rgba(255,255,255,0.3)"
  ink-dark: "#FFFFFF"
  on-ink-dark: "#0A0F26"
  marigold-dark: "#FFD84A"
  marigold-soft-dark: "#3A3212"
  on-marigold-dark: "#0A0F26"
  neutral-well-dark: "#161D40"
  owed-dark: "#A3B7FF"
  owe-dark: "#FF8A76"
  danger-dark: "#FF8A76"
  danger-soft-dark: "#4A1D18"
  warning-dark: "#F5C451"
  success-dark: "#5FD39A"
  success-soft-dark: "#143D2B"
typography:
  hero-figure:
    fontFamily: "Sofia Sans Semi Condensed"
    fontSize: "124px"
    fontWeight: 800
    lineHeight: 1.02
  key-figure:
    fontFamily: "Sofia Sans Semi Condensed"
    fontSize: "56px"
    fontWeight: 800
    lineHeight: 1.02
  screen-title:
    fontFamily: "Sofia Sans Semi Condensed"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: "38px"
    letterSpacing: "-0.3px"
  row-amount:
    fontFamily: "Sofia Sans Semi Condensed"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tnum"
  section-heading:
    fontFamily: "System (SF Pro on iOS)"
    fontSize: "20px"
    fontWeight: 700
    letterSpacing: "-0.2px"
  body:
    fontFamily: "System (SF Pro on iOS)"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  row-title:
    fontFamily: "System (SF Pro on iOS)"
    fontSize: "16px"
    fontWeight: 600
  secondary:
    fontFamily: "System (SF Pro on iOS)"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  row-subtitle:
    fontFamily: "System (SF Pro on iOS)"
    fontSize: "13px"
    fontWeight: 400
  caption:
    fontFamily: "System (SF Pro on iOS)"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  tab-label:
    fontFamily: "System (SF Pro on iOS)"
    fontSize: "11px"
    fontWeight: 600
rounded:
  sm: "10px"
  md: "14px"
  lg: "16px"
  xl: "28px"
  pill: "999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "32px"
  xxxl: "40px"
components:
  enamel-header:
    backgroundColor: "{colors.enamel}"
    textColor: "{colors.on-enamel}"
    typography: "{typography.screen-title}"
    padding: "8px 20px 16px 20px"
  sheet:
    backgroundColor: "{colors.background}"
    rounded: "{rounded.xl}"
  header-icon-button:
    textColor: "{colors.on-enamel}"
    rounded: "{rounded.pill}"
    size: "44px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.row-title}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
    height: "50px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
    height: "50px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
    height: "50px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
    height: "50px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "16px"
  group:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  group-row:
    textColor: "{colors.text}"
    typography: "{typography.row-title}"
    padding: "12px 16px"
    height: "60px"
  icon-well:
    backgroundColor: "{colors.primary-ultra-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    size: "36px"
  icon-well-yours:
    backgroundColor: "{colors.marigold-soft}"
    textColor: "{colors.warning}"
    rounded: "{rounded.sm}"
    size: "36px"
  turn-badge:
    backgroundColor: "{colors.marigold}"
    textColor: "{colors.on-marigold}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  segment:
    textColor: "{colors.text-secondary}"
    typography: "{typography.secondary}"
    rounded: "{rounded.sm}"
    padding: "12px"
    height: "44px"
  segment-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
  tab-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-tertiary}"
    typography: "{typography.tab-label}"
  tab-bar-active:
    textColor: "{colors.primary}"
---

# Design System: Roomate

Recorded from the shipped code on branch `redesign/house-number` (tokens in `mobile/src/theme/`, components in `mobile/src/components/`). Platform: iOS, Expo React Native. Units are points.

## Overview

**Creative North Star: "The House Number"**

The household is an address: its one key number sits on a cobalt enamel plaque in tall signage numerals. Everything under the plaque is calm, native-feeling iOS: a porcelain ground, white inset grouped lists, and the system typeface.

Density is that of iOS Settings: rows of 56 to 60pt, one answer per screen at the top, recording actions second. The look it replaced (mint gradients, glass cards, a bouncy bubble tab bar, emoji in copy) is the confirmed anti-reference.

**Key Characteristics:**
- One enamel field per tab screen, carrying exactly one key figure.
- Signage numerals for money and counts; system type for every word.
- Flat surfaces: depth comes from the enamel/porcelain/white tonal steps, not shadows.
- Marigold appears only where something is yours.
- Light and dark ("night enamel") share one structure; the header stays cobalt with white content in both.

## Colors

A single cobalt carries brand and interaction; a porcelain-to-white neutral ramp carries everything else; marigold is the one loud accent. All values live in the frontmatter; dark tokens carry the `-dark` suffix. Screens read colours through `useThemeColors()` and never hard-code hex.

### Primary
- **Enamel Cobalt** (`enamel`): the header field at the top of tab screens, the selected calendar day. Always carries `on-enamel` (white) content, `on-enamel-secondary` for captions, and `enamel-keyline` for the 1.5pt ring on header icon buttons. Dark uses a brighter cobalt so the plaque still reads as a field against the navy ground.
- **Interactive Cobalt** (`primary`): text links, icons, active tab, switch track, filled default button with `on-primary` text. Same hex as enamel in light; in dark it lightens to a periwinkle that is legible as text on navy, and its fills carry dark `on-primary` text, never literal white.
- **Cobalt tints** (`primary-soft`, `primary-ultra-soft`): avatar fallback, icon wells, pressed rows.

### Secondary
- **Marigold** (`marigold`, `marigold-soft`, `on-marigold`): the ring around your own avatar on Home, the "your turn" badge, the your-chore dot in the calendar, the marigold icon well. Fills carry ink text; on the soft tint, glyphs use `warning`.

### Tertiary
- **Owed / Owe** (`owed`, `owe`): balance direction on amounts. Owed is cobalt, owe is brick red.
- **States** (`danger`, `warning`, `success` and their soft tints): errors, destructive rows, confirmations only.

### Neutral
- **Porcelain** (`background`): screen ground and the sheet. Deep navy in dark.
- **White surface** (`surface`): groups, inputs, tab bar, secondary buttons. `surface-alt` backs image placeholders; `surface-elevated-dark` lifts dark modals.
- **Ink** (`text`, `ink`): primary text and the strongest button. **Slate** (`text-secondary`): subtitles. **Mist** (`text-tertiary`): chevrons, inactive tabs, placeholders, completed items.
- **Hairlines** (`border-light` for row separators and dark group outlines, `border` for inputs and secondary buttons).

### Named Rules
**The One Plaque Rule.** Enamel owns one region per screen: the header field. It is not used for cards, banners or section backgrounds below it.

**The Yours Rule.** Marigold means "this is yours or your turn". It is never decoration, never text on white, and never a second brand colour.

**The Sign and Word Rule.** Owed and owe are never shown by colour alone: rows show "+" or "−" on the amount and a phrase ("Owes you", "You owe") beside it; the Home figure is captioned "You are owed" or "You owe".

**The Tertiary on White Rule.** In light, `text-tertiary` meets AA on `surface` (4.76:1) but not on `background` (4.36:1). Use `text-secondary` for small text set directly on the porcelain ground.

## Typography

**Display Font:** Sofia Sans Semi Condensed, weights 600, 700, 800 (loaded as `fonts.displaySemibold`, `displayBold`, `displayExtrabold`)
**Body Font:** the system face (SF Pro on iOS)

**Character:** Condensed signage numerals against plain platform text. The display face is the plaque's voice; words stay native so they follow platform conventions and Dynamic Type.

### Hierarchy
- **Hero figure** (800, 124pt, shrinks to fit): the net balance on Home.
- **Key figure** (800, 56pt): the month total on Money, the to-buy count on Shopping, the selected day number on Calendar. Counts sit on a shared baseline with a 16pt `on-enamel-secondary` label beside them.
- **Screen title** (800, 34/38pt, -0.3 tracking): tab titles on the enamel header, one line, shrinks to 70%.
- **Row amount** (700, 16 to 22pt, tabular figures): amounts trailing a list row; 28 to 32pt in summaries and charts.
- **Section heading** (system 700, 20pt, -0.2 tracking, sentence case).
- **Body / row title** (system 400 / 600, 16pt, 24pt line).
- **Secondary / row subtitle** (system 400, 14pt and 13pt).
- **Caption** (system 400, 12pt): helper and error text. The native tab bar label is 11pt semibold.

Token sizes are the 375pt-wide base; `scaleFont` raises them by at most 5% on wider phones and `scale` raises spacing and radii by at most 15%.

### Named Rules
**The Numerals Only Rule.** The display face is used for money amounts, counts and tab-screen titles (plus the "Roomate" wordmark on the sign-in plaque). Never for body text, buttons, row titles or section headings. Never set `fontWeight` together with a `fonts.*` family.

**The Raised Cents Rule.** From 24pt up, `Amount` sets the currency sign at 42% (semibold, 80% opacity) and the cents at 45% of the figure size, both raised to the cap line. Below 24pt the whole amount sits on one baseline. Currency position and separators come from the device locale.

**The Scaling Rule.** All text goes through `AppText` and scales with Dynamic Type. Display numerals cap growth at 1.3x so they never clip; rows grow taller instead of truncating.

## Layout

Single column, one-handed. Groups are inset `spacing.md` (16) from the screen edge; headings, free text and header content are inset `spacing.lg` (20). Spacing follows the 4/8/12/16/20/24/32/40 scale; section headings sit 24 above and 12 below.

**Tab screens (Home, Money, Shopping, Calendar):** `EnamelHeader` runs under the status bar and holds the title row (48pt min) and the key figure. A porcelain `Sheet` with `rounded.xl` top corners overlaps it by 28pt. Content is `Group`s on the sheet. The tab bar is the standard docked iOS bar.

**Scrolling variant (Home, Money, Shopping):** the header sits inside the scroll view (`<EnamelHeader scrolls overlap={0} />` followed by `<SheetCap />`), with a pinned `<StatusBarStrip />` so the clock stays on cobalt and an enamel bleed above so pull-to-refresh never exposes the ground. Calendar keeps a fixed header with a scrolling `Sheet`.

**Home only:** the two action buttons straddle the header/sheet seam.

**Stack screens (Settings and all detail screens):** native header on porcelain, ink title at 17pt semibold, cobalt controls, no header shadow; content in `Group`s. Create and edit flows are modals with a vertical dismiss. Settings opens from the avatar button in the Home header.

## Elevation & Depth

Flat. Depth is tonal: enamel, then porcelain, then white groups. Groups have no shadow and no border in light; in dark they gain a hairline `border-light` outline because the tonal step is smaller. No gradients, no blur. A shadow scale exists in `theme/shadows.ts` but the redesigned surfaces do not use it.

### Named Rules
**The Flat Rule.** A surface is separated by its fill, a hairline, or the sheet's curve. If it needs a shadow to read, it is on the wrong ground.

## Shapes

Four radii with fixed jobs: `sm` (10) for icon wells, chips and badges; `md` (14) for buttons, inputs and the segmented track; `lg` (16) for groups and cards; `xl` (28) for the sheet top only. Circles for avatars, header icon buttons, the calendar day and the shopping checkbox. Borders are 1.5pt on buttons, inputs and header icon buttons; hairlines elsewhere.

## Components

### Logo mark
"Two under one roof": a rounded roof line over two dots, a roommate (white) and you (marigold), on the enamel field. The app icon is the mark on full-bleed cobalt; the launch screen is the white mark centred on cobalt; the landing plaque shows `RoomateMark` (72pt) above the wordmark. All PNGs come from `scripts/generate-logo.py`; the vector master is `mobile/assets/logo.svg`. The marigold dot is the mark's one use of marigold outside "yours" UI, and it still means "you".

### Enamel header
Cobalt field with title (or a custom `leading`, such as the household switcher on Home), optional subtitle, right-aligned `HeaderIconButton`s (44pt circle, 1.5pt keyline ring, 22pt white icon), and one key figure as children. Status bar text is light in both appearances.

### Buttons
- **Shape:** 50pt minimum height, `rounded.md`, 1.5pt border, 16pt semibold system label, optional 20pt leading icon.
- **Primary:** cobalt fill, `on-primary` label. **Ink:** strongest fill, at most one per screen (Home "Add expense"). **Danger:** destructive confirmation.
- **Secondary / outline:** white surface, `border` outline, cobalt label.
- **States:** pressed 82% opacity; disabled or loading 45% opacity with a spinner in the label colour.

### Groups and rows
- **Group:** white, `rounded.lg`, hairline separators inset 16pt from the left.
- **Row:** 60pt minimum, 16pt horizontal padding, optional 36pt icon well (`rounded.sm`, 20pt icon) or avatar, 16pt semibold title (two lines), 13pt slate subtitle, trailing amount, count, switch or checkbox (max 45% width), 18pt mist chevron when it navigates. Pressed rows fill with `primary-ultra-soft`. Destructive rows are `danger` text, not red cards.
- **Icon well tones:** primary (default), marigold (yours), neutral, danger.

### Amount
Display-face money with `direction` of `owed` (prefix "+", cobalt), `owe` (prefix "−", red) or `neutral`. Tabular figures below 40pt. Exposes one accessibility label with sign and formatted value.

### Inputs
White fill, 1.5pt `border`, `rounded.md`, 16pt text, 14pt semibold slate label above, 12pt helper below. Error swaps the border to `danger` and shows 12pt `danger` text. The search bar uses a 1pt border and `rounded.lg`.

### Segmented list tabs (Shopping)
A `border-light` track (`rounded.md`, 4pt padding) holding 44pt segments (`rounded.sm`); the selected segment is white with ink semibold text and a leading check, so selection does not rely on fill alone.

### Checkbox, switch, badge
Shopping checkbox: 28pt circle, 2pt border, inside a 44pt target; completed items are struck through. Switch: track `border` off, `primary` on. "Your turn" badge: marigold fill, ink 14pt semibold text, `rounded.sm`.

### Calendar grid
Selected day is an enamel circle with white bold numeral; today is a 2pt cobalt ring. Events are a 5pt cobalt dot; your chore is a 7pt marigold dot with a 1pt slate outline. A legend below the grid names both dots.

### Avatar
Circle. Photo with a 1pt border, or initials in cobalt bold on `primary-soft`. Your own avatar on Home sits in a 44pt button with a 2pt marigold ring.

### Navigation
Four tabs: Home, Money, Shopping, Calendar. White bar with a `border-light` top hairline; 25pt icons, filled when active and outline when inactive; cobalt active, mist inactive.

### Iconography
Ionicons only, outline set, one stroke weight: 22pt in headers and controls, 20pt in icon wells and buttons, 18pt chevrons, 25pt in the tab bar. Filled glyphs appear only as the active tab state. No emoji as icons or in copy.

### Motion
Feedback is an opacity change on press (60 to 82%). Modals use the platform slide or fade; the template sheet slides in 180 to 200ms. No springs or bounces. Every animated modal and programmatic scroll checks Reduce Motion and switches to none.

### Accessibility
- AA contrast in both appearances; the token pairs above are the checked ones.
- Every control is at least 44 by 44pt (use `hitSlop` when the visual is smaller) with an `accessibilityRole`, a label when it has no text, and `accessibilityState` on toggles, tabs and checkboxes.
- Titles and section headings carry the `header` role.
- Long labels wrap (German and Turkish run long): row titles two lines, subtitles three.

## Do's and Don'ts

### Do:
- **Do** give each tab screen one key figure on the enamel header and nothing else competing with it.
- **Do** render every amount with `Amount`, and pass `direction` whenever the value is owed or owing.
- **Do** pair every balance with its word ("Owes you", "You owe") next to the signed figure.
- **Do** build content from `Group` and `GroupRow` on the porcelain sheet.
- **Do** keep targets at 44pt and let rows grow with Dynamic Type.
- **Do** read colours from `useThemeColors()` so both appearances stay in step.

### Don't:
- **Don't** use gradients, blur, glass cards or coloured glows.
- **Don't** use emoji as icons or in copy.
- **Don't** add uppercase, letter-spaced eyebrow labels above headings. The plain sentence-case caption that names a key figure ("This month", "You are owed") is part of the figure, not an eyebrow.
- **Don't** use marigold as decoration or as text on white.
- **Don't** put more than one filled button in a view; the second action is the secondary (outlined) variant.
- **Don't** set words in the display face or numerals for money in the system face.
- **Don't** signal owe/owed, done/not done or an error by colour alone.
- **Don't** add shadows or borders to light-mode groups.
