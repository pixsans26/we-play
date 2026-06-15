# Implementation Plan

## Overview

Three independent bugs in the scratch-card flow and theme store: turn indicator not updating after task completion, scratch count not being persisted to `userProgress`, and the app launching with dark theme instead of light. The workflow is explore → preserve → fix → validate, using property-based tests (fast-check) throughout.

## Tasks

- [x] 1. Write bug condition exploration tests (BEFORE implementing any fix)
  - **Property 1: Bug Condition** - Turn Indicator Not Updating & Scratch Count Stale
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: Tests encode expected behavior — they will validate the fix once it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate each bug on the unfixed codebase
  - Create `__tests__/bugConditions.test.ts` at workspace root
  - **Bug 1 — Turn indicator (timer-finish path):**
    - Import `useGameStore` from `@/store/gameStore`
    - Simulate `handleTimerEnd` in isolation (call `setIsCompleted(true)`, `setTimerFinished(true)`, and `logCompletion()` — but NOT `switchTurn()` — matching current unfixed code)
    - Use `fast-check` (`fc.assert`, `fc.property`) with `fc.constantFrom("A", "B")` as the starting turn
    - Assert `gameStore.currentTurn !== turnBefore` after `handleTimerEnd` fires
    - **EXPECTED OUTCOME**: Test FAILS (proves Bug 1 timer-finish path exists — `switchTurn` is never called)
  - **Bug 1 — Turn indicator (manual-complete + next path):**
    - Simulate `handleComplete` (calls `switchTurn()` once) then `handleNext` (calls `switchTurn()` again) in sequence
    - Use `fast-check` with `fc.constantFrom("A", "B")` as starting turn
    - Assert `gameStore.currentTurn !== turnBefore` after the full sequence
    - **EXPECTED OUTCOME**: Test FAILS (proves Bug 1 manual path exists — double flip cancels out)
    - Document counterexample: starting turn `"A"` → after complete+next → still `"A"`
  - **Bug 2 — Scratch count not persisted:**
    - Import `db` from `@/db/client` and `userProgress` from `@/db/schema`
    - Use `fast-check` with `fc.uuid()` or `fc.string()` for `userUid` values
    - Call `logScratch({ userUid, taskId: "task-1", taskType: "text", completed: true, skipped: false })` once per generated UID
    - Query `db.select().from(userProgress).where(eq(userProgress.userUid, userUid))`
    - Assert the row exists and `scratchCount === 1`
    - **EXPECTED OUTCOME**: Test FAILS (proves Bug 2 — `userProgress` row is absent or `scratchCount` remains 0)
    - Document counterexample: after one `logScratch` call, `userProgress.scratchCount = 0`
  - Run tests: `npx jest __tests__/bugConditions.test.ts` (or equivalent Jest command for this project)
  - Mark task complete when all three sub-tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing any fix)
  - **Property 2: Preservation** - Skip Does Not Switch Turn & userHistory Always Written
  - **IMPORTANT**: Follow observation-first methodology — observe unfixed code behavior on non-buggy inputs first
  - **GOAL**: Lock in existing correct behavior so regressions are caught immediately after the fix
  - Create `__tests__/preservation.test.ts` at workspace root
  - **Preservation 1 — Skip does not switch turn (`¬C(X)` for Bug 1):**
    - Observe: on unfixed code, calling `handleSkip` does NOT call `switchTurn()` — `currentTurn` is unchanged
    - Use `fast-check` with `fc.constantFrom("A", "B")` as starting turn
    - Simulate `handleSkip` path (advance task, log skipped scratch — no `switchTurn` call)
    - Assert `gameStore.currentTurn === turnBefore` for all generated starting-turn values
    - **EXPECTED OUTCOME**: Test PASSES on unfixed code (confirms correct baseline to preserve)
  - **Preservation 2 — userHistory row is always written on logScratch (`¬C(X)` for Bug 2):**
    - Observe: on unfixed code, each `logScratch` call inserts exactly one row into `userHistory`
    - Use `fast-check` with `fc.uuid()` for `userUid` and `fc.integer({ min: 1, max: 10 })` for call count N
    - Call `logScratch` N times for the same `userUid`
    - Query `db.select().from(userHistory).where(eq(userHistory.userUid, userUid))` and assert row count equals N
    - **EXPECTED OUTCOME**: Test PASSES on unfixed code (history writing was always correct)
  - **Preservation 3 — Theme toggle still works (`¬C(X)` for Bug 3):**
    - Observe: on unfixed code, `toggleTheme()` flips `isDark` correctly regardless of starting value
    - Import `useThemeStore` from `@/store/themeStore`
    - Use `fast-check` with `fc.boolean()` to generate an arbitrary starting `isDark` value; set it via store
    - Call `toggleTheme()` → assert `isDark` flipped; call `toggleTheme()` again → assert it flipped back
    - **EXPECTED OUTCOME**: Test PASSES on unfixed code (toggle logic has always been correct)
  - Run tests: confirm all three preservation tests pass on the unfixed codebase
  - Mark task complete when tests are written, run, and all PASS on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Fix Bug 1 — Turn indicator not updating (`app/(game)/task-scratch.tsx`)

  - [x] 3.1 Add `switchTurn()` and `updateStreak()` to `handleTimerEnd`
    - Open `app/(game)/task-scratch.tsx`
    - In `handleTimerEnd`, after the `logCompletion()` call, add `switchTurn()` and `updateStreak()`
    - Result:
      ```ts
      function handleTimerEnd() {
        setIsCompleted(true);
        setTimerFinished(true);
        logCompletion();
        switchTurn();   // ← ADD
        updateStreak(); // ← ADD
      }
      ```
    - _Bug_Condition: isBugCondition_TurnNotUpdating(event) where event.path = "timer_finished" — switchTurn was called 0 times_
    - _Expected_Behavior: switchTurn() called exactly once at task completion so currentTurn changes before handleNext is invoked_
    - _Requirements: 2.1_

  - [x] 3.2 Remove `switchTurn()` and `updateStreak()` from `handleNext`
    - In `handleNext`, remove the `switchTurn()` and `updateStreak()` calls; keep only the state/task-loading logic
    - Result:
      ```ts
      async function handleNext() {
        if (!user) return;
        setPreviousTask(currentTask);
        // REMOVED: switchTurn();
        // REMOVED: updateStreak();
        await loadScratchCounts();
        await loadTask();
      }
      ```
    - _Bug_Condition: isBugCondition_TurnNotUpdating(event) where event.path = "manual_complete" AND event.nextTapped = true — switchTurn was called 2 times (net zero change)_
    - _Expected_Behavior: handleNext is a pure "load next task" function; turn ownership belongs solely to completion handlers_
    - _Preservation: handleSkip must NOT be changed — it never called switchTurn and must continue not to_
    - _Requirements: 2.2, 3.2_

  - [x] 3.3 Verify bug condition exploration test (Property 1) now passes for Bug 1
    - **Property 1: Expected Behavior** - Turn Switches Exactly Once at Task Completion
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The exploration tests from task 1 encode the expected turn-switch behavior
    - Run `__tests__/bugConditions.test.ts` Bug 1 sub-tests (timer-finish and manual-complete paths)
    - **EXPECTED OUTCOME**: Both sub-tests PASS (confirms Bug 1 is fixed on both paths)
    - _Requirements: 2.1, 2.2_

  - [x] 3.4 Verify preservation test (Property 2) still passes for Bug 1
    - **Property 2: Preservation** - Skip Does Not Switch Turn
    - **IMPORTANT**: Re-run the SAME test from task 2 — do NOT write a new test
    - Run `__tests__/preservation.test.ts` Preservation 1 sub-test (skip path)
    - **EXPECTED OUTCOME**: Test PASSES (confirms no regression — skip still does not switch turn)
    - _Requirements: 3.2_

- [x] 4. Fix Bug 2 — Scratch count not persisted (`hooks/useScratchHistory.ts`)

  - [x] 4.1 Update `logScratch` to upsert `userProgress.scratchCount`
    - Open `hooks/useScratchHistory.ts`
    - Add `userProgress` to the schema import: `import { userHistory, userProgress } from "@/db/schema"`
    - Add `sql` to the drizzle-orm import: `import { eq, and, desc, sql } from "drizzle-orm"`
    - After the existing `db.insert(userHistory).values(...)` call, add the upsert:
      ```ts
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
      ```
    - No schema changes are required — `userProgress.userUid` already has a unique constraint in `schema.ts`
    - _Bug_Condition: isBugCondition_ScratchCountStale(action) — action.type = "scratch_complete" AND userProgress.scratchCount unchanged after logScratch_
    - _Expected_Behavior: After logScratch, userProgress.scratchCount for the acting user equals countBefore + 1; if no row existed, it is created with scratchCount = 1_
    - _Preservation: The existing db.insert(userHistory).values(...) call MUST remain unchanged — history row must still be written on every logScratch call_
    - _Requirements: 2.3, 2.4, 3.3, 3.4_

  - [x] 4.2 Verify bug condition exploration test (Property 1) now passes for Bug 2
    - **Property 1: Expected Behavior** - Scratch Count Increments in DB
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Run `__tests__/bugConditions.test.ts` Bug 2 sub-test (userProgress.scratchCount assertion)
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 2 is fixed — count increments on every scratch)
    - _Requirements: 2.3, 2.4_

  - [x] 4.3 Verify preservation test (Property 2) still passes for Bug 2
    - **Property 2: Preservation** - userHistory Row Still Written
    - **IMPORTANT**: Re-run the SAME test from task 2 — do NOT write a new test
    - Run `__tests__/preservation.test.ts` Preservation 2 sub-test (userHistory row count)
    - **EXPECTED OUTCOME**: Test PASSES (confirms history logging is unaffected by the upsert addition)
    - _Requirements: 3.3, 3.4_

- [x] 5. Fix Bug 3 — App launches with dark theme (`store/themeStore.ts`)

  - [x] 5.1 Change `isDark` initial value from `true` to `false`
    - Open `store/themeStore.ts`
    - Change the Zustand initial state from `isDark: true` to `isDark: false`
    - The `toggleTheme` function, `getTheme` helper, `lightTheme`, and `darkTheme` objects are all untouched
    - _Bug_Condition: isBugCondition_WrongInitialTheme(appState) — appState.isFirstLaunch = true AND themeStore.getState().isDark = true_
    - _Expected_Behavior: useThemeStore.getState().isDark === false on any fresh store initialisation, before any user interaction_
    - _Preservation: toggleTheme() must continue to flip isDark in both directions; getTheme() and both theme palettes are unchanged_
    - _Requirements: 2.5, 3.1_

  - [x] 5.2 Verify bug condition exploration test (Property 1) now passes for Bug 3
    - **Property 1: Expected Behavior** - App Launches with Light Theme
    - Import `useThemeStore` and assert `useThemeStore.getState().isDark === false` without calling `toggleTheme`
    - This can be verified inline as a quick unit check in `__tests__/bugConditions.test.ts` or as a standalone assertion
    - **EXPECTED OUTCOME**: Assertion PASSES (confirms Bug 3 is fixed)
    - _Requirements: 2.5_

  - [x] 5.3 Verify preservation test (Property 2) still passes for Bug 3
    - **Property 2: Preservation** - Theme Toggle Still Works
    - **IMPORTANT**: Re-run the SAME test from task 2 — do NOT write a new test
    - Run `__tests__/preservation.test.ts` Preservation 3 sub-test (toggle flips isDark correctly)
    - **EXPECTED OUTCOME**: Test PASSES (confirms toggle behavior is unchanged after the default value fix)
    - _Requirements: 3.1_

- [x] 6. Checkpoint — Ensure all tests pass
  - Run the full test suite: `npx jest __tests__/`
  - Confirm `__tests__/bugConditions.test.ts` — all Bug 1, Bug 2, and Bug 3 condition tests PASS
  - Confirm `__tests__/preservation.test.ts` — all three preservation tests PASS
  - If any test fails, do not proceed; diagnose and fix before marking this task complete
  - Verify the app builds without TypeScript errors: `npx tsc --noEmit`
  - Ask the user if any questions arise during the checkpoint

## Task Dependency Graph

```json
{
  "waves": [
    { "tasks": ["1", "2"] },
    { "tasks": ["3", "4", "5"] },
    { "tasks": ["6"] }
  ]
}
```

Tasks 1 and 2 are independent and can be written in parallel. Tasks 3, 4, and 5 each depend on tasks 1 and 2 being complete. Task 6 depends on all fixes being applied.

## Notes

- `fast-check` v4.8.0 is already installed as a devDependency — no additional setup needed.
- Tests live in `__tests__/` at the workspace root. Use `npx jest __tests__/` to run them.
- No schema changes are needed for any of the three fixes; `userProgress.userUid` already has a unique constraint.
- The `sql` template tag needed for the `onConflictDoUpdate` increment is imported from `drizzle-orm` (same package already used in `task-scratch.tsx` via `import { eq, sql } from "drizzle-orm"`).
- Expo SDK 54 / expo-sqlite v55 uses `SQLite.openDatabaseSync` (already in use in `db/client.ts`) — no API changes needed.
- All three fixes are one-file, minimal changes: no new tables, no new dependencies, no architectural changes.
