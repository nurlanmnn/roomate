# Chore Rotation Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make chore rotation clearer, actionable from every relevant screen, and aligned with how roommates actually think about “this week” — without a full rewrite.

**Architecture:** Keep the existing period-based model (`startDate`, `frequency`, `rotationOrder`, `completions`). Improve UX in three phases: (1) completion + visibility fixes on current screens, (2) calendar-week alignment + data hygiene, (3) roommate flexibility (skip/swap, upcoming preview). Shared schedule math lives in `mobile/src/utils/choreSchedule.ts` and `backend/src/routes/chores.ts` — both must stay in sync.

**Tech Stack:** React Native (Expo), Express + Mongoose, date-fns, existing i18n locales (`en`, `de`, `es`, `fr`, `tr`).

**Out of scope for this plan:** Push notifications, home-tab widget, deleting unused `/schedule` endpoint (can be a follow-up cleanup).

---

## Current pain points (why we're doing this)

| Problem | Where it shows up |
|---------|-------------------|
| UI says “This week” but periods follow `startDate`, not Mon–Sun | Calendar + ChoreRotationScreen subtitles |
| Can see assignee on a selected day but can't mark done | Calendar selected-day section |
| Completed chores vanish; empty day says “No events” | Calendar dots + selected-day list |
| Management screen is view-only | ChoreRotationScreen |
| Can't exclude members from a specific chore | CreateChoreScreen |
| Ghost members stay in rotation after leaving household | Backend + edit form |
| No overdue signal | Nowhere |
| No skip when someone is away | Nowhere |

---

## File map

| File | Role in this plan |
|------|-------------------|
| `mobile/src/utils/choreSchedule.ts` | Shared period/assignee/overdue helpers |
| `backend/src/routes/chores.ts` | Mirror schedule math; validation; skip/swap API (Phase 3) |
| `backend/src/models/ChoreRotation.ts` | Optional `periodOverrides` field (Phase 3) |
| `mobile/src/screens/Calendar/CalendarScreen.tsx` | Period labels, selected-day actions, completed/overdue UI |
| `mobile/src/screens/Calendar/ChoreRotationScreen.tsx` | Mark done + period range + next assignee |
| `mobile/src/screens/Calendar/CreateChoreScreen.tsx` | Member include/exclude toggles; edit warning |
| `mobile/src/api/choresApi.ts` | Types for overrides; skip/swap methods (Phase 3) |
| `mobile/src/locales/*.ts` | All new copy (parity across 5 locales) |

---

## Phase 1 — UX fixes (ship first)

**Outcome:** Users understand what period they're in, can complete chores from the calendar on any day, and see “done” instead of nothing.

### Task 1: Extend `choreSchedule` helpers

**Files:**
- Modify: `mobile/src/utils/choreSchedule.ts`
- Modify: `mobile/src/locales/en.ts` (+ `de`, `es`, `fr`, `tr`)

- [ ] **Step 1: Add period formatting helper**

```typescript
// mobile/src/utils/choreSchedule.ts
import { format } from 'date-fns';
import type { Locale } from 'date-fns';

export const formatChorePeriodRange = (
  start: Date,
  end: Date,
  locale?: Locale
): string => {
  // end is exclusive; show inclusive last day as end - 1 day
  const lastDay = new Date(end.getTime() - MS_PER_DAY);
  const sameMonth = start.getMonth() === lastDay.getMonth();
  if (sameMonth) {
    return `${format(start, 'MMM d', { locale })} – ${format(lastDay, 'd', { locale })}`;
  }
  return `${format(start, 'MMM d', { locale })} – ${format(lastDay, 'MMM d', { locale })}`;
};

export const getChoreCompletionForDate = (
  chore: ChoreRotation,
  date: Date
): ChoreCompletion | null => {
  const periodStart = getChorePeriodStart(chore, date);
  if (!periodStart) return null;
  const target = periodStart.getTime();
  return (
    (chore.completions ?? []).find((c) => {
      const cs = new Date(c.periodStart);
      cs.setHours(0, 0, 0, 0);
      return cs.getTime() === target;
    }) ?? null
  );
};
```

- [ ] **Step 2: Add i18n keys**

```typescript
// en.ts — under chores:
periodRange: '%{range}',
doneBy: 'Done by %{name}',
noChoresOnDay: 'No events or chores',
currentPeriod: 'Current period',
```

Add matching translations in `de.ts`, `es.ts`, `fr.ts`, `tr.ts`.

- [ ] **Step 3: Verify**

Run mobile app → Calendar → confirm no TypeScript errors (`npx tsc --noEmit` in `mobile/` if available).

---

### Task 2: Refactor completion toggle to accept any period

**Files:**
- Modify: `mobile/src/screens/Calendar/CalendarScreen.tsx`

- [ ] **Step 1: Change handler signature**

Replace `handleToggleChoreComplete(chore)` with:

```typescript
const handleToggleChoreComplete = useCallback(
  async (chore: ChoreRotation, forDate: Date = new Date()) => {
    if (!selectedHousehold || !user) return;

    const periodStart = getChorePeriodStart(chore, forDate);
    if (!periodStart) return;

    const periodStartIso = periodStart.toISOString();
    const completion = getChoreCompletionForDate(chore, forDate);
    const wasCompleted = completion !== null;
    // ... rest of optimistic patch uses periodStartIso (unchanged logic)
  },
  [selectedHousehold, user, t]
);
```

Import `getChorePeriodStart`, `getChoreCompletionForDate` from `choreSchedule.ts`.

- [ ] **Step 2: “This week” section — show period range**

On each chore row, below assignee name:

```tsx
const bounds = getChorePeriodBounds(chore, new Date());
const periodLabel = bounds
  ? formatChorePeriodRange(bounds.start, bounds.end, dateFnsLocale)
  : null;
// Render: t('chores.periodRange', { range: periodLabel })
```

Change section subtitle from `chores.thisWeek` to `chores.currentPeriod` where the date range is shown.

- [ ] **Step 3: Selected-day section — show all chores + actions**

Update `selectedDateChores` memo: **remove** the `isPeriodCompleted` filter. Instead include `completion` and `isCompleted` on each item.

For each row:
- If completed → muted text with `t('chores.doneBy', { name: completerName })` (resolve name from `rotationOrder` via `completedBy` id)
- If user's turn and not completed → show mark-done button calling `handleToggleChoreComplete(chore, selectedDate)`
- If completed and user was assignee → show undo button

- [ ] **Step 4: Calendar dots — keep hiding completed (optional product choice)**

Keep `userChoreDates` filtering completed periods (dots = “still todo”). Completed state is visible in lists instead.

- [ ] **Step 5: Fix empty selected-day copy**

When `selectedDateEvents.length === 0 && selectedDateChores.length === 0`, show `t('chores.noChoresOnDay')` instead of only `calendar.noEvents`.

- [ ] **Step 6: Manual test**

1. Create weekly chore starting this Monday; confirm period shows Mon–Sun range.
2. Tap a day in your assigned period → mark done from selected-day row.
3. Confirm completed chore shows “Done by …” and undo works.
4. Confirm “This week” mark-done still works.

---

### Task 3: Bring ChoreRotationScreen to parity

**Files:**
- Modify: `mobile/src/screens/Calendar/ChoreRotationScreen.tsx`

- [ ] **Step 1: Extract shared chore row component (optional but recommended)**

Create `mobile/src/components/ChoreRotationRow.tsx` with props:
- `chore`, `user`, `referenceDate`, `onToggleComplete`, `showActions?: boolean`

Move row UI from `CalendarScreen` (icon, assignee, period range, mark done). Both screens import it.

- [ ] **Step 2: Wire mark-done on ChoreRotationScreen**

Reuse the same optimistic toggle logic (either extract to `mobile/src/hooks/useChoreCompletion.ts` or pass handler from a small shared hook).

- [ ] **Step 3: Manual test**

Open Chore Rotation from calendar → mark done → return to calendar → state matches.

---

## Phase 2 — Correctness & clarity

**Outcome:** Periods match calendar weeks; stale members are handled; overdue chores are visible.

### Task 4: Align periods to calendar weeks (Mon–Sun)

**Files:**
- Modify: `mobile/src/utils/choreSchedule.ts`
- Modify: `backend/src/routes/chores.ts`

- [ ] **Step 1: Define anchored start**

Both files — before computing `daysSinceStart`, normalize anchor:

```typescript
import { startOfWeek } from 'date-fns'; // mobile only; backend uses equivalent

function getRotationAnchor(startDate: Date): Date {
  const anchor = startOfWeek(startDate, { weekStartsOn: 1 }); // Monday
  anchor.setHours(0, 0, 0, 0);
  return anchor;
}

// In getAssigneeIndexForDate / getChorePeriodStart:
const anchor = getRotationAnchor(chore.startDate);
const daysSinceStart = Math.floor((d.getTime() - anchor.getTime()) / MS_PER_DAY);
```

Backend: duplicate small helper (no date-fns dependency today — use manual Monday snap or add date-fns to backend; prefer manual 3-line snap to avoid new dep).

- [ ] **Step 2: Default create form to Monday**

`CreateChoreScreen` already uses `startOfWeek(new Date(), { weekStartsOn: 1 })` — keep it. Add hint copy: `chores.startDateHint`: “Rotations run Monday–Sunday. Pick the first week to start.”

- [ ] **Step 3: Migration note**

Existing chores with mid-week `startDate` will shift assignees by up to 6 days. **Do not auto-migrate DB.** Document in PR: households may need to edit start date once. Optional: on first load after deploy, show one-time banner if any chore's `startDate` is not a Monday.

- [ ] **Step 4: Manual test**

Create chore with startDate = Wednesday → periods should still display Mon–Sun blocks.

---

### Task 5: Overdue indicator

**Files:**
- Modify: `mobile/src/utils/choreSchedule.ts`
- Modify: `mobile/src/screens/Calendar/CalendarScreen.tsx`
- Modify: `mobile/src/screens/Calendar/ChoreRotationScreen.tsx` (via shared row)
- Modify: `mobile/src/locales/*.ts`

- [ ] **Step 1: Add helper**

```typescript
export const isChorePeriodOverdue = (chore: ChoreRotation, date: Date): boolean => {
  const bounds = getChorePeriodBounds(chore, date);
  if (!bounds) return false;
  if (isPeriodCompleted(chore, date)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime() >= bounds.end.getTime(); // period ended, still incomplete
};
```

- [ ] **Step 2: UI badge**

On chore rows where `isChorePeriodOverdue(chore, new Date())`, show small danger/muted badge: `t('chores.overdue')`.

Add locale key in all 5 files.

- [ ] **Step 3: Manual test**

Set device date past period end (or create chore with startDate 2 weeks ago, don't complete) → overdue badge appears.

---

### Task 6: Member include/exclude in create/edit

**Files:**
- Modify: `mobile/src/screens/Calendar/CreateChoreScreen.tsx`
- Modify: `mobile/src/locales/*.ts`

- [ ] **Step 1: Show all household members with toggle**

Replace reorder-only list with: each member row has checkbox (in rotation?) + reorder arrows when checked.

State: `includedIds: Set<string>` initialized from `rotationOrder` on edit, or all members on create.

`rotationOrder` on save = ordered list of included members only (min 1).

- [ ] **Step 2: Add hint**

`chores.rotationMembersHint`: “Uncheck someone who doesn't take part in this chore.”

- [ ] **Step 3: Manual test**

Uncheck one member → save → rotation cycles only included members.

---

### Task 7: Validate rotation order against household

**Files:**
- Modify: `backend/src/routes/chores.ts` (POST + PATCH)
- Modify: `backend/src/routes/chores.ts` (GET list — defensive filter)

- [ ] **Step 1: On create/update**

After `checkHouseholdMember`, load household members. Reject if any `rotationOrder` id is not a current member (400 + clear error). Require `rotationOrder.length >= 1`.

- [ ] **Step 2: On GET (defensive)**

When mapping chores, filter `rotationOrder` to ids still in household. If filtered length === 0, set `currentAssignee: null` and log in dev.

- [ ] **Step 3: Manual test**

POST with fake user id → 400. Remove member from household in DB → GET chores still returns valid assignee from remaining members.

---

## Phase 3 — Roommate flexibility

**Outcome:** Handle absences and make the schedule easy to scan ahead.

### Task 8: Period overrides (skip / swap)

**Files:**
- Modify: `backend/src/models/ChoreRotation.ts`
- Modify: `backend/src/routes/chores.ts`
- Modify: `mobile/src/api/choresApi.ts`
- Modify: `mobile/src/utils/choreSchedule.ts`
- Modify: `mobile/src/screens/Calendar/CalendarScreen.tsx` (or chore detail sheet)
- Modify: `mobile/src/locales/*.ts`

- [ ] **Step 1: Model**

```typescript
// ChoreRotation.ts
export interface IPeriodOverride {
  periodStart: Date;
  assigneeId: mongoose.Types.ObjectId;
  reason?: 'swap' | 'skip';
  createdBy: mongoose.Types.ObjectId;
}
// Add to schema: periodOverrides: { type: [...], default: [] }
```

- [ ] **Step 2: API**

`POST /chores/:id/override` body: `{ periodStart, assigneeId }`  
`DELETE /chores/:id/override` body: `{ periodStart }`

Only household members. `assigneeId` must be in household. Upsert by `periodStart`.

- [ ] **Step 3: Schedule math**

In `getChoreAssigneeAt` (mobile + backend), after computing default assignee, check override for that period's `periodStart` timestamp; if found, return override assignee.

- [ ] **Step 4: UI — “Give my week to…”**

On chore row when `isMyTurn && !isCompleted`, secondary action opens member picker → calls override API.

Add strings: `chores.giveTo`, `chores.swapWeek`, `chores.overrideConfirm`.

- [ ] **Step 5: Manual test**

User A assigned → gives to User B → calendar dots move to B's dates for that period only → next period back to normal rotation.

---

### Task 9: Upcoming rotation preview

**Files:**
- Modify: `mobile/src/utils/choreSchedule.ts`
- Modify: `mobile/src/screens/Calendar/ChoreRotationScreen.tsx`
- Modify: `mobile/src/locales/*.ts`

- [ ] **Step 1: Helper**

```typescript
export const getUpcomingAssignees = (
  chore: ChoreRotation,
  fromDate: Date,
  count: number
): Array<{ periodStart: Date; assignee: ChoreRotationMember }> => {
  // Loop periodIndex from current+1, current+2, … respecting overrides
};
```

- [ ] **Step 2: UI on management screen**

Below each chore card, compact list: “Next: Alex (Mar 24), Sam (Mar 31), …” (2–3 entries).

Locale: `chores.upcoming`: 'Next: %{list}'

- [ ] **Step 3: Manual test**

3-person weekly rotation → upcoming names cycle correctly including after override from Task 8.

---

## Phase summary

| Phase | Focus | Est. effort | User-visible win |
|-------|--------|-------------|------------------|
| **1** | Period labels, complete anywhere, show done, screen parity | 1–2 days | Immediately more usable |
| **2** | Mon–Sun alignment, overdue, member toggles, validation | 1–2 days | Trustworthy schedule |
| **3** | Skip/swap + upcoming preview | 2–3 days | Handles real life |

---

## Verification checklist (full feature)

- [ ] Weekly chore displays Mon–Sun range in EN + one other locale
- [ ] Mark done from calendar “This week” and selected-day sections
- [ ] Completed shows “Done by {name}”; undo works
- [ ] Overdue badge when period ended and incomplete
- [ ] Create chore excluding one member → rotation skips them
- [ ] Swap week moves dots to substitute for one period only
- [ ] ChoreRotationScreen matches calendar actions
- [ ] No new i18n keys missing in de/es/fr/tr

---

## Recommended execution order

1. **Phase 1 entirely** — low risk, high UX return; no schema changes.
2. **Phase 2 Tasks 6–7** — member toggles + validation (no behavior shift).
3. **Phase 2 Task 4** — calendar-week alignment (communicate to users if deploy affects existing households).
4. **Phase 2 Task 5** — overdue.
5. **Phase 3** — overrides + upcoming preview together (shared schedule math changes).

---

## Follow-ups (separate plans)

- Push notification: “Your turn starts Monday”
- Home dashboard card: “2 chores due this week”
- Remove or adopt unused `GET /chores/household/:id/schedule`
- Unit tests for `choreSchedule.ts` (pure functions, easy to test once math stabilizes after Phase 2)
