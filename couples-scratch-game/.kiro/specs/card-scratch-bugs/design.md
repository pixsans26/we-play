# Card Scratch Bugs — Bugfix Design

## Overview

Three independent bugs exist in the scratch-card flow and the global theme store.

- **Bug 1 (Turn indicator not updating):** `switchTurn` is called zero times on the
  timer-finish path (`handleTimerEnd`) and twice on the manual-complete + next-task
  path (`handleComplete` + `handleNext`), so the UI turn indicator never shows the
  correct next partner.

- **Bug 2 (Scratch count not persisted):** `logScratch` in `useScratchHistory` only
  inserts a row into `userHistory`. It never touches `userProgress`, so
  `scratchCount` stays at 0 forever and `loadScratchCounts` always reads stale data.

- **Bug 3 (Wrong initial theme):** `themeStore` initialises `isDark: true`; the
  intended default is `false` (light theme).

Each fix is a targeted, minimal change. No new tables, no new API, no new dependencies.

---

## Glossary

- **Bug_Condition (C):** The precise input condition that triggers a defect.
- **Property (P):** The expected correct outcome for any input satisfying C.
- **Preservation:** Existing behaviour that must remain identical before and after the fix.
- **switchTurn:** `gameStore.switchTurn()` — flips `currentTurn` between `"A"` and `"B"`.
- **handleComplete:** Handler called when user taps "Complete" while the timer is running.
- **handleTimerEnd:** Handler called automatically when the `useTimer` hook fires `isFinished`.
- **handleNext:** Handler called when user taps "Next Task" after completion.
- **logScratch:** `useScratchHistory.logScratch()` — records one scratch event in `userHistory`.
- **userProgress:** SQLite table (Drizzle schema) with columns `user_uid`, `scratch_count`, etc.
- **isDark:** Boolean flag in `themeStore` that selects `darkTheme` vs `lightTheme`.

---

## Bug Details

### Bug 1 — Turn Indicator Not Updating

#### Bug Condition

The bug manifests on two distinct paths through `task-scratch.tsx`:

- **Timer-finish path:** `handleTimerEnd` sets `isCompleted = true` and calls
  `logCompletion()`, but never calls `switchTurn()`. The turn indicator remains
  unchanged until the user taps "Next Task", which then calls `switchTurn()` once —
  resulting in a net one call total. However, the UI only reflects the switch *after*
  the user taps Next, not immediately when the timer runs out as required by 2.1.

- **Manual-complete + next path:** `handleComplete` calls `switchTurn()` and
  `handleNext` also calls `switchTurn()`, resulting in two calls total. The turn
  flips twice, landing back on the original partner.

**Formal Specification:**
```
FUNCTION isBugCondition_TurnNotUpdating(event)
  INPUT: event of type TaskCompletionEvent
  OUTPUT: boolean

  IF event.path = "timer_finished" THEN
    RETURN true   -- switchTurn called 0 times; UI shows stale turn name
  END IF

  IF event.path = "manual_complete" AND event.nextTapped = true THEN
    RETURN true   -- switchTurn called 2 times; net effect: no change
  END IF

  RETURN false
END FUNCTION
```

#### Examples

- **Timer-finish path:** Timer reaches 0 → `handleTimerEnd` fires → `isCompleted`
  becomes `true` → turn indicator still shows "Nitish's turn" (unchanged) → user
  taps "Next Task" → `handleNext` calls `switchTurn()` once → turn changes but
  requirement 2.1 says it should have changed at timer-end, not at Next-tap.

- **Manual-complete + next path:** User taps "Complete" → `handleComplete` calls
  `switchTurn()` (turn flips A→B) → user taps "Next Task" → `handleNext` calls
  `switchTurn()` again (turn flips B→A) → turn indicator still shows "Nitish's
  turn", same as before.

- **Skip path (no bug):** User taps "Skip" → `handleSkip` does not call
  `switchTurn()` → turn is correctly preserved.

---

### Bug 2 — Scratch Count Not Persisted

#### Bug Condition

Every scratch that crosses the reveal threshold calls `handleScratchComplete`, which
calls `playScratch()` and sets `isScratched = true`. When the user completes or
skips, `logScratch` is called. `logScratch` inserts one row into `userHistory` but
performs no upsert on `userProgress.scratchCount`.

**Formal Specification:**
```
FUNCTION isBugCondition_ScratchCountStale(action)
  INPUT: action of type ScratchAction
  OUTPUT: boolean

  RETURN action.type = "scratch_complete"
         AND db.userProgress[action.userUid].scratchCount
               = db.userProgress[action.userUid].scratchCount_before
END FUNCTION
```

#### Examples

- User A scratches card #1 → `logScratch` inserts into `userHistory` (correct) →
  `userProgress.scratch_count` for User A remains 0 → `loadScratchCounts` reads 0
  → counter bar shows "0 scratches".

- User A scratches 10 cards → `userProgress.scratch_count` still 0 → counter bar
  shows "0 scratches" for User A.

- User B has never scratched → `userProgress` row may not exist → counter bar shows
  "0 scratches" (this is correct; no bug here).

---

### Bug 3 — Wrong Initial Theme

#### Bug Condition

`themeStore.ts` hard-codes `isDark: true` in the Zustand initial state. The light
theme is the intended product default.

**Formal Specification:**
```
FUNCTION isBugCondition_WrongInitialTheme(appState)
  INPUT: appState of type AppInitState
  OUTPUT: boolean

  RETURN appState.isFirstLaunch = true
         AND themeStore.getState().isDark = true
END FUNCTION
```

#### Examples

- Fresh install → app opens → all screens use `darkTheme` colours (vivid pink/purple
  gradient background) instead of the intended soft pastel `lightTheme`.
- Settings screen shows "Dark Mode" as already enabled on first launch.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

3.1 WHEN the user taps the theme toggle in settings THEN the system SHALL CONTINUE TO
switch between light and dark themes correctly (`toggleTheme` logic is untouched).

3.2 WHEN the user taps "Skip Task" THEN the system SHALL CONTINUE TO advance to the
next task without calling `switchTurn`.

3.3 WHEN `logScratch` is called THEN the system SHALL CONTINUE TO write the scratch
event to `userHistory` (task ID, type, timestamp, completed, skipped, timeTaken).

3.4 WHEN a user has never scratched a card THEN the system SHALL CONTINUE TO display
a scratch count of 0 for that user.

3.5 WHEN "Next Task" is tapped after a completed task THEN the system SHALL CONTINUE
TO load a new task, reset the scratch card overlay, and reset the timer state.

3.6 WHEN the timer finishes naturally THEN the system SHALL CONTINUE TO play the
alarm sound and display the "Time's up!" indicator.

**Scope:** Inputs that do not involve task completion events, scratch completion
events, or app initialisation should be completely unaffected by these fixes.

---

## Hypothesized Root Cause

### Bug 1

1. **Duplicated `switchTurn` in manual-complete path:** `handleComplete` calls
   `switchTurn()` as a side effect, and `handleNext` independently calls
   `switchTurn()` again. The two were added at different times without coordinating
   ownership of the turn-switch.

2. **Missing `switchTurn` in timer-finish path:** `handleTimerEnd` was written to
   only record completion (`logCompletion`) without triggering the turn switch.
   The assumption was likely that `handleNext` would handle it, but requirements
   specify the switch should happen at task completion, not at Next-tap.

3. **Correct fix:** `switchTurn` should be called exactly once, at task completion
   (both paths: timer-finish and manual-complete). `handleNext` must NOT call
   `switchTurn`. Ownership is: completion event → switch turn; Next tap → load
   next task only.

### Bug 2

1. **`logScratch` only writes to `userHistory`:** The function was initially scoped
   to history logging and never updated to also maintain the `userProgress` counter.

2. **No upsert on `userProgress`:** The `userProgress` row may not exist yet for a
   new user. An INSERT OR REPLACE / upsert pattern is needed:
   - If the row exists → increment `scratch_count` by 1.
   - If the row does not exist → insert with `scratch_count = 1`.

3. **Drizzle upsert pattern:** Use `db.insert(userProgress).values(...).onConflictDoUpdate(...)` with
   `target: userProgress.userUid` and `set: { scratchCount: sql\`scratch_count + 1\` }`.

### Bug 3

1. **Wrong literal in initial state:** `isDark: true` should be `isDark: false`. A
   one-character value change. No logic or structure needs to change.

---

## Correctness Properties

Property 1: Bug Condition — Turn Switches Exactly Once at Task Completion

_For any_ task completion event (timer-finish or manual-complete) where
`isBugCondition_TurnNotUpdating(event)` returns true, the fixed code SHALL call
`switchTurn()` exactly once — at the moment of completion — so that `currentTurn`
changes to the opposite partner before `handleNext` is invoked.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Skip Does Not Switch Turn

_For any_ event where `event.path = "skip"`, the fixed code SHALL produce exactly
the same `currentTurn` value as the original code, preserving the no-turn-switch
behaviour for skip actions.

**Validates: Requirements 3.2**

Property 3: Bug Condition — Scratch Count Increments in DB

_For any_ scratch action where `isBugCondition_ScratchCountStale(action)` returns
true, the fixed `logScratch` SHALL increment `userProgress.scratchCount` for the
acting user by exactly 1 in the database, and the subsequent `loadScratchCounts`
call SHALL return the updated value.

**Validates: Requirements 2.3, 2.4**

Property 4: Preservation — userHistory Row Still Written

_For any_ scratch action where `isBugCondition_ScratchCountStale(action)` returns
true, the fixed `logScratch` SHALL ALSO insert a row into `userHistory` with the
same fields as the original implementation, preserving all history-logging behaviour.

**Validates: Requirements 3.3, 3.4**

Property 5: Bug Condition — App Launches with Light Theme

_For any_ app initialisation state where `isBugCondition_WrongInitialTheme(appState)`
returns true, the fixed `themeStore` SHALL initialise `isDark` to `false` so that
the light colour palette is applied on first launch.

**Validates: Requirements 2.5**

Property 6: Preservation — Theme Toggle Still Works

_For any_ `themeStore` state where `isDark = false` (post-fix default), calling
`toggleTheme()` SHALL set `isDark` to `true`, and calling `toggleTheme()` again
SHALL set it back to `false`, preserving full toggle functionality.

**Validates: Requirements 3.1**

---

## Fix Implementation

### Bug 1 — `app/(game)/task-scratch.tsx`

**Root change:** Move ownership of `switchTurn` + `updateStreak` from `handleNext`
into the two completion handlers. `handleNext` becomes a pure "load next" function.

**Specific Changes:**

1. **`handleTimerEnd`** — add `switchTurn()` and `updateStreak()` calls after
   `logCompletion()`:
   ```ts
   function handleTimerEnd() {
     setIsCompleted(true);
     setTimerFinished(true);
     logCompletion();
     switchTurn();      // ← ADD
     updateStreak();    // ← ADD
   }
   ```

2. **`handleComplete`** — keep `switchTurn()` and `updateStreak()` here (already
   present); no change needed to this function:
   ```ts
   function handleComplete() {
     setIsCompleted(true);
     setTimerFinished(true);
     logCompletion();
     switchTurn();      // ← KEEP (already present, correct)
     updateStreak();    // ← KEEP (already present, correct)
   }
   ```

3. **`handleNext`** — remove `switchTurn()` and `updateStreak()` calls; keep only
   state loading:
   ```ts
   async function handleNext() {
     if (!user) return;
     setPreviousTask(currentTask);
     // REMOVE: switchTurn();
     // REMOVE: updateStreak();
     await loadScratchCounts();
     await loadTask();
   }
   ```

**Net result:** `switchTurn` is called exactly once per completion event on both
paths. `handleNext` no longer carries any turn-switching responsibility.

---

### Bug 2 — `hooks/useScratchHistory.ts`

**Root change:** After inserting into `userHistory`, upsert `userProgress` to
increment `scratchCount` by 1. Use Drizzle's `onConflictDoUpdate` with a raw SQL
increment to avoid a read-then-write race condition.

**Specific Changes:**

1. Add `userProgress` import from `@/db/schema`.
2. Add `sql` import from `drizzle-orm` (already used elsewhere in the project via `import { eq, sql } from "drizzle-orm"` in task-scratch.tsx — same pattern applies here).
3. Update `logScratch` to upsert after the history insert:

```ts
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { userHistory, userProgress } from "@/db/schema";

const logScratch = useCallback(async (params: LogScratchParams): Promise<void> => {
  const { userUid, taskId, taskType, completed, skipped, timeTaken } = params;

  // 1. Write history row (unchanged)
  await db.insert(userHistory).values({
    userUid,
    taskId,
    taskType,
    scratchedAt: new Date(),
    completed,
    skipped,
    timeTaken: timeTaken ?? null,
  });

  // 2. Upsert scratch count in userProgress (NEW)
  await db
    .insert(userProgress)
    .values({
      userUid,
      scratchCount: 1,
      completedCount: 0,
      currentLevel: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userProgress.userUid,
      set: {
        scratchCount: sql`scratch_count + 1`,
        updatedAt: new Date(),
      },
    });
}, []);
```

**No schema changes required.** The `userProgress` table and `userUid` unique
constraint already exist in `schema.ts` and `migrate.ts`.

---

### Bug 3 — `store/themeStore.ts`

**Root change:** Change the single literal `isDark: true` to `isDark: false`.

```ts
// Before
isDark: true,

// After
isDark: false,
```

No other lines change. `toggleTheme` logic, `getTheme`, and both theme objects are
untouched.

---

## Testing Strategy

### Validation Approach

Two-phase approach for each bug: first run tests against the **unfixed** code to
confirm the bug and root cause; then apply the fix and verify all properties hold
and no regressions appear.

---

### Exploratory Bug Condition Checking

**Goal:** Surface counterexamples that demonstrate each bug on unfixed code.

#### Bug 1 — Turn Indicator

**Test Plan:** Mount `TaskScratchScreen` (or test the handlers in isolation), drive
both completion paths, and assert `currentTurn` changes exactly once.

| Test | Action | Expected on unfixed code |
|------|--------|--------------------------|
| Timer-finish, check turn at completion | Simulate `handleTimerEnd` | `currentTurn` unchanged after call (0 `switchTurn` calls) |
| Timer-finish, check turn after Next tap | Simulate `handleTimerEnd` then `handleNext` | `currentTurn` changed — but 1 call came too late |
| Manual-complete + Next | Simulate `handleComplete` then `handleNext` | `currentTurn` unchanged (2 flips cancel out) |
| Skip | Simulate `handleSkip` | `currentTurn` unchanged (correct, no counterexample) |

**Expected counterexample:** After `handleTimerEnd`, `currentTurn === "A"` (same as
before). After `handleComplete + handleNext`, `currentTurn === "A"` (same as before).

#### Bug 2 — Scratch Count

**Test Plan:** Call `logScratch` with a test `userUid`, then query `userProgress`
directly.

| Test | Action | Expected on unfixed code |
|------|--------|--------------------------|
| Single scratch | Call `logScratch(...)` | `userProgress` row missing or `scratch_count = 0` |
| Multiple scratches | Call `logScratch` 3× | `scratch_count = 0` still |
| History still written | Inspect `userHistory` | Row inserted correctly (no counterexample here) |

**Expected counterexample:** `userProgress.scratchCount` equals 0 regardless of how
many times `logScratch` is called.

#### Bug 3 — Initial Theme

**Test Plan:** Import `useThemeStore`, read initial state without calling
`toggleTheme`.

| Test | Action | Expected on unfixed code |
|------|--------|--------------------------|
| Initial state | `useThemeStore.getState().isDark` | `true` (counterexample — should be `false`) |

---

### Fix Checking

**Goal:** Verify that for all inputs satisfying the bug condition, the fixed code
produces the expected outcome.

#### Bug 1

```
FOR ALL event WHERE isBugCondition_TurnNotUpdating(event) DO
  turnBefore ← gameStore.currentTurn
  processEvent(event)          // handleTimerEnd OR (handleComplete; handleNext)
  ASSERT gameStore.currentTurn ≠ turnBefore
  ASSERT switchTurnCallCount = 1
END FOR
```

#### Bug 2

```
FOR ALL action WHERE isBugCondition_ScratchCountStale(action) DO
  countBefore ← db.userProgress[action.userUid].scratchCount   // may be absent
  await logScratch(action)
  countAfter  ← db.userProgress[action.userUid].scratchCount
  ASSERT countAfter = (countBefore ?? 0) + 1
END FOR
```

#### Bug 3

```
FOR ALL appState WHERE isBugCondition_WrongInitialTheme(appState) DO
  store ← useThemeStore.getState()
  ASSERT store.isDark = false
END FOR
```

---

### Preservation Checking

**Goal:** Verify that inputs outside each bug condition behave identically before
and after the fix.

```
-- Bug 1: skip path
FOR ALL event WHERE event.path = "skip" DO
  ASSERT fixedHandler(event).currentTurn = originalHandler(event).currentTurn
END FOR

-- Bug 2: userHistory row still written
FOR ALL action WHERE action.type = "scratch_complete" DO
  historyBefore ← db.userHistory.count(action.userUid)
  await logScratch_fixed(action)
  historyAfter  ← db.userHistory.count(action.userUid)
  ASSERT historyAfter = historyBefore + 1
END FOR

-- Bug 3: toggle still works
store ← useThemeStore.getState()          // isDark = false (fixed default)
toggleTheme()
ASSERT useThemeStore.getState().isDark = true
toggleTheme()
ASSERT useThemeStore.getState().isDark = false
```

**Testing approach:** Property-based testing is recommended for Bug 1 (generate
arbitrary turn states A/B and completion path combinations) and Bug 2 (generate
arbitrary `userUid` strings and scratch counts) to cover edge cases that manual
unit tests miss.

---

### Unit Tests

- **Bug 1:** Test `handleTimerEnd` in isolation — assert `switchTurn` called once.
  Test `handleComplete` + `handleNext` sequence — assert `switchTurn` called once
  total. Test `handleSkip` — assert `switchTurn` called zero times.
- **Bug 2:** Call `logScratch` once for a new user — assert `userProgress` row
  created with `scratchCount = 1`. Call again — assert `scratchCount = 2`.
  Assert `userHistory` row count also increments each call.
- **Bug 3:** Import the store fresh (or reset it) — assert `isDark === false`.
  Call `toggleTheme` — assert `isDark === true`.

### Property-Based Tests

- **Bug 1:** Generate random sequences of `[timerFinish, manualComplete, nextTap,
  skip]` events; assert `switchTurn` call count equals the number of completion
  events (timer-finish or manual-complete), never more, never less.
- **Bug 2:** Generate random user UIDs and call `logScratch` N times; assert
  `userProgress.scratchCount = N` and `userHistory.count = N` for each UID.
- **Bug 3:** Assert `useThemeStore.getState().isDark` is strictly `false` before
  any user interaction, for any number of store resets.

### Integration Tests

- **Bug 1:** Full screen render via React Native Testing Library — scratch card,
  start timer, let timer finish, verify turn indicator text changed; scratch card,
  start timer, tap Complete, tap Next Task, verify turn indicator changed exactly
  once.
- **Bug 2:** Full flow — scratch card to threshold, tap Complete, tap Next Task,
  verify scratch counter bar increments by 1 for the current user.
- **Bug 3:** Render any screen that consumes `useThemeStore`; assert background
  colour matches `lightTheme.background`, not `darkTheme.background`, before the
  user toggles the theme.
