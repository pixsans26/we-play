# Implementation Plan

## Overview

Implements the bugfix for wrong scratcher/performer attribution and history screen redesign. Follows the exploratory PBT workflow: write bug condition and preservation tests against unfixed code first, then apply the fix across seven files, then verify both test suites pass.

## Task Dependency Graph

```json
{
  "waves": [
    {"wave": 1, "tasks": ["1", "2"]},
    {"wave": 2, "tasks": ["3.1"]},
    {"wave": 3, "tasks": ["3.2"]},
    {"wave": 4, "tasks": ["3.3"]},
    {"wave": 5, "tasks": ["3.4", "3.6"]},
    {"wave": 6, "tasks": ["3.5", "3.7"]},
    {"wave": 7, "tasks": ["3.8", "3.9"]},
    {"wave": 8, "tasks": ["4"]}
  ]
}
```

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Wrong Scratcher UID and Missing PerformerUid Attribution
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate both attribution bugs exist
  - **Scoped PBT Approach**: Scope to two concrete deterministic cases that expose distinct failure modes: (a) `currentTurn="B"` with `user.uid === partnerAUid` → wrong `userUid`, and (b) `currentTurn="A"` with no `performerUid` stored
  - Test case 1 — Turn B attribution: simulate `logCompletion` / `handleSkip` as they exist today (passing `user.uid` directly); assert `params.userUid === partnerBUid` → FAILS because code passes `partnerAUid`
  - Test case 2 — Performer missing: simulate the same call with `currentTurn="A"`; assert `params.performerUid === partnerBUid` → FAILS because `LogScratchParams` has no `performerUid` and no value is ever passed
  - Test case 3 — Skip turn B attribution: simulate `handleSkip` with `currentTurn="B"`; assert `params.userUid === partnerBUid` AND that `switchTurn` was NOT called → first assertion FAILS, second PASSES
  - Test case 4 — Null partnerBUid guard: simulate call with `coupleProfile.partnerBUid = null` and `currentTurn="B"`; assert result does not throw and `params.userUid` falls back to `user.uid` → FAILS (no guard exists yet)
  - Document counterexamples found (e.g., "Turn B → userUid is partnerAUid instead of partnerBUid; performerUid is undefined on every call")
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - History Row Count, Skip-No-Turn-Switch, Reset Isolation, and SeenIds Isolation
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code with non-bug-condition inputs first, observe behavior, then write tests that assert that behavior
  - Observe: calling `logScratch` with `userUid="uidA"` N times writes exactly N rows to `userHistory` for `"uidA"` (unfixed code passes this — row count is correct, only UID is wrong)
  - Observe: `handleSkip` code path never calls `switchTurn` — `currentTurn` is unchanged after skip (passes on unfixed code)
  - Observe: `resetHistory("uidA")` deletes only rows where `user_uid = "uidA"`, leaving `"uidB"` rows intact
  - Observe: `getSeenIds("uidA", "text")` returns only task IDs for `"uidA"`, not `"uidB"`
  - **Property-based test A**: For any `userUid` string and call count `N ∈ [1, 10]`, after N `logScratch` calls the `userHistory` table contains exactly N rows for that UID — generate with fast-check `fc.tuple(fc.uuid(), fc.integer({min:1, max:10}))`
  - **Property-based test B**: For any starting `currentTurn` value (`"A"` or `"B"`), simulating the `handleSkip` code path leaves `currentTurn` unchanged — no `switchTurn` call is made
  - **Property-based test C**: After inserting rows for two distinct UIDs, `resetHistory(uidA)` leaves the row count for `uidB` unchanged — generate with fast-check `fc.tuple(fc.uuid(), fc.uuid())`
  - **Property-based test D**: `getSeenIds(uidA, "text")` after inserting tasks for both `uidA` and `uidB` returns only `uidA`'s task IDs — generate with fast-check `fc.array(fc.uuid(), {minLength: 1, maxLength: 5})`
  - Run all property tests on UNFIXED code
  - **EXPECTED OUTCOME**: All preservation tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for wrong scratcher/performer attribution and history screen redesign

  - [x] 3.1 Add `performer_uid` column to `user_history` via idempotent migration in `db/migrate.ts`
    - After the existing `CREATE TABLE IF NOT EXISTS` block inside `migrateDatabase()`, add a `try/catch` that executes `ALTER TABLE user_history ADD COLUMN performer_uid TEXT`
    - The `catch` block silently ignores the error — SQLite throws "duplicate column name" when the column already exists, which is the expected idempotent behavior
    - Do NOT change the `CREATE TABLE` statements themselves — existing installs must not be broken
    - _Bug_Condition: isBugCondition(X) — performer_uid column is absent, so no value can be persisted regardless of what the caller passes_
    - _Expected_Behavior: After migration, `user_history` has a nullable `performer_uid TEXT` column on both fresh installs and upgrades_
    - _Preservation: All existing `CREATE TABLE IF NOT EXISTS` blocks and the function signature of `migrateDatabase()` are unchanged_
    - _Requirements: 2.3_

  - [x] 3.2 Add `performerUid` nullable field to `userHistory` Drizzle table definition in `db/schema.ts`
    - Add `performerUid: text("performer_uid")` (no `.notNull()`) to the `userHistory` `sqliteTable` definition, after `timeTaken`
    - This keeps the Drizzle ORM schema in sync with the physical column added in 3.1, so `db.insert(userHistory).values({ ..., performerUid: ... })` compiles and executes without error
    - _Requirements: 2.3_

  - [x] 3.3 Add `performerUid?: string | null` to `HistoryEntry` in `types/index.ts`
    - Add optional field `performerUid?: string | null` to the `HistoryEntry` interface, after `timeTaken`
    - All existing callers that read `HistoryEntry` remain valid because the field is optional
    - _Requirements: 2.3, 2.5_

  - [x] 3.4 Extend `LogScratchParams`, `logScratch`, and add `getAllHistory` in `hooks/useScratchHistory.ts`
    - Add optional field `performerUid?: string` to `LogScratchParams` interface
    - Inside `logScratch`, destructure `performerUid` from `params` and pass `performerUid: performerUid ?? null` to `db.insert(userHistory).values({...})`
    - Add `getAllHistory` to `UseScratchHistoryReturn` interface: `getAllHistory: (partnerAUid: string, partnerBUid: string | null) => Promise<HistoryEntry[]>`
    - Implement `getAllHistory` using `inArray(userHistory.userUid, uids)` where `uids = [partnerAUid, partnerBUid].filter(Boolean) as string[]`, ordered by `desc(userHistory.scratchedAt)`; map rows to `HistoryEntry` including `performerUid: row.performerUid ?? null`
    - Import `inArray` from `drizzle-orm` alongside the existing imports
    - The existing `getHistory` function is left unchanged — it is still used internally and by other callers
    - _Bug_Condition: isBugCondition(X) — getAllHistory does not exist; getHistory only accepts one UID so the combined list cannot be built_
    - _Expected_Behavior: getAllHistory returns all rows for both UIDs merged and sorted newest-first, with performerUid populated_
    - _Preservation: logScratch row count is unchanged; getSeenIds, resetHistory, getNextTask, and getHistory are all unmodified_
    - _Requirements: 2.3, 2.4, 3.1, 3.3, 3.4, 3.5_

  - [x] 3.5 Derive `scratcherUid` and `performerUid` from `currentTurn` + `coupleProfile` in `app/(game)/task-scratch.tsx`
    - In `logCompletion`: replace `userUid: user.uid` with the derived values below; add `performerUid` to the `logScratch` call
      ```
      const scratcherUid = currentTurn === "A"
        ? coupleProfile?.partnerAUid ?? user.uid
        : coupleProfile?.partnerBUid ?? user.uid;
      const performerUid = currentTurn === "A"
        ? coupleProfile?.partnerBUid ?? null
        : coupleProfile?.partnerAUid ?? null;
      ```
    - Apply the identical derivation in `handleSkip` — replace `userUid: user.uid` with `userUid: scratcherUid` and add `performerUid: performerUid ?? undefined`
    - Also replace `getNextTask(user.uid, ...)` inside `handleSkip` with `getNextTask(scratcherUid, ...)` so the seen-task filter targets the correct partner's history
    - Do NOT call `switchTurn` anywhere inside `handleSkip` — this preservation invariant must not change
    - No other logic in either function changes (elapsed time, `taskId`, `taskType`, `completed`, `skipped` are all unaffected)
    - _Bug_Condition: isBugCondition(X) where X.currentTurn="B" and logScratch is called with user.uid (= partnerAUid) instead of partnerBUid; performerUid is never passed_
    - _Expected_Behavior: userUid = (currentTurn="A" ? partnerAUid : partnerBUid); performerUid = (currentTurn="A" ? partnerBUid : partnerAUid); null guard for missing partnerBUid_
    - _Preservation: switchTurn is still NOT called in handleSkip; timeTaken, taskId, taskType, completed, skipped values are unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2_

  - [x] 3.6 Collapse `historyStore` to single `historyAll` + `setHistoryAll` in `store/historyStore.ts`
    - Replace the entire store state with `historyAll: HistoryEntry[]` and a single action `setHistoryAll: (h: HistoryEntry[]) => void`
    - Remove `historyA`, `historyB`, `setHistoryA`, `setHistoryB`, `activeTab`, and `setActiveTab` entirely
    - _Bug_Condition: The A/B split and activeTab state are dead code because both tabs show identical data — the store shape perpetuates the incorrect mental model_
    - _Expected_Behavior: A single list holds all entries from both partners, loaded via getAllHistory_
    - _Preservation: The HistoryEntry type used by the store is unchanged; only the store shape changes_
    - _Requirements: 2.4_

  - [x] 3.7 Redesign `app/(game)/history.tsx` — remove tab switcher, call `getAllHistory`, add `resolvePartnerName` helper and heart icons
    - Remove all references to `historyA`, `historyB`, `activeTab`, `setActiveTab`, `setHistoryA`, `setHistoryB` from imports and component body
    - Replace with `historyAll` + `setHistoryAll` from the updated `historyStore`
    - Import `getAllHistory` from `useScratchHistory` and call it on mount with `coupleProfile.partnerAUid` and `coupleProfile.partnerBUid`; store result via `setHistoryAll`
    - Remove the A/B tab switcher JSX block entirely
    - Add `resolvePartnerName` helper:
      ```typescript
      function resolvePartnerName(
        uid: string | null | undefined,
        coupleProfile: CoupleProfile | null
      ): string {
        if (!uid || !coupleProfile) return "Unknown";
        if (uid === coupleProfile.partnerAUid) return coupleProfile.partnerAName;
        if (uid === coupleProfile.partnerBUid) return coupleProfile.partnerBName ?? "Partner B";
        return "Unknown";
      }
      ```
    - Import and use `useThemeStore` + `getTheme` for theme-aware card background, border, and text colors
    - Update `renderHistoryItem` to display: task title, scratcher name (`resolvePartnerName(item.userUid, coupleProfile)`), performer name (`resolvePartnerName(item.performerUid, coupleProfile)`), date/time
    - Replace `checkmark-circle` / `play-skip-forward-outline` Ionicons with: `heart` (color `#ec4899`) for completed, `heart-outline` (color `theme.card.subtext`) for skipped
    - Update reset button `onPress` to call `resetHistory` for **both** `coupleProfile.partnerAUid` and `coupleProfile.partnerBUid` so the combined list clears fully; refresh by calling `setHistoryAll([])`
    - _Bug_Condition: Tab switcher shows dead A/B split; cards lack scratcher/performer names; non-heart icons are theme-inconsistent_
    - _Expected_Behavior: Single combined chronological list; cards show scratcher name, performer name, heart icon, theme-aware styling_
    - _Preservation: Detail modal, empty state, formatDateTime, getTaskLabel, reset confirmation alert, and FlatList structure are unchanged_
    - _Requirements: 2.4, 2.5, 2.6_

  - [x] 3.8 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Correct Scratcher UID and PerformerUid Attribution
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior; their passing now confirms the fix is correct
    - Run all four bug condition test cases (Turn B attribution, performer missing, skip Turn B, null partnerBUid guard)
    - **EXPECTED OUTCOME**: All four test cases PASS (confirms attribution bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.9 Verify preservation tests still pass
    - **Property 2: Preservation** - History Row Count, Skip-No-Turn-Switch, Reset Isolation, SeenIds Isolation
    - **IMPORTANT**: Re-run the SAME property tests from task 2 — do NOT write new tests
    - Run property tests A, B, C, D from task 2 against the fixed code
    - **EXPECTED OUTCOME**: All preservation property tests PASS (confirms no regressions)
    - Confirm row counts, turn invariants, reset isolation, and seenIds isolation are all preserved

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite: `npx jest --runInBand` (or `npx jest --runInBand --testPathPattern="bugConditions|preservation"` to target the spec tests specifically)
  - All bug condition exploration tests (task 1 / task 3.8) must pass
  - All preservation property tests (task 2 / task 3.9) must pass
  - No TypeScript type errors in the seven changed files (`db/migrate.ts`, `db/schema.ts`, `types/index.ts`, `hooks/useScratchHistory.ts`, `app/(game)/task-scratch.tsx`, `store/historyStore.ts`, `app/(game)/history.tsx`)
  - Ask the user if any questions arise before marking complete

## Notes

- Tasks 1 and 2 MUST be completed before any implementation tasks (3.x). Their purpose is to document the bug and establish a preservation baseline on unfixed code.
- The `try/catch` in `db/migrate.ts` (task 3.1) is the only safe way to add a column to an existing SQLite table on-device — SQLite does not support `ADD COLUMN IF NOT EXISTS`.
- `handleSkip` in `task-scratch.tsx` must NOT call `switchTurn` — this is a hard preservation invariant tested by Property 2.
- The `getNextTask` call inside `handleSkip` must also be updated to use `scratcherUid` (task 3.5) so the seen-task filter targets the correct partner's history. Forgetting this produces a subtle secondary bug.
- `historyStore` changes (task 3.6) will cause TypeScript errors in `history.tsx` until task 3.7 is also applied — implement both in the same session.
- The reset button in `history.tsx` must clear BOTH partners' histories (both UIDs) now that the list is combined.
