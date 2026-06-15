# scratch-attribution-history-fix Bugfix Design

## Overview

Two bugs are fixed together because they share a root cause (all history rows always carry `user.uid` = Partner A's Firebase UID) and both surface on the History screen.

**Bug 1 — Wrong scratch attribution.** `logScratch` and `handleSkip` in `task-scratch.tsx` always pass `user.uid` as the `userUid` argument. Because `user.uid` is the Firebase-authenticated account (always Partner A on a shared device), every scratch entry is credited to Partner A regardless of whose turn (`currentTurn`) it actually was. Additionally, no `performerUid` (the partner who must carry out the task) is ever stored, so the history screen cannot show who performed each task.

**Bug 2 — History screen design.** The history screen in `history.tsx` shows an A/B tab switcher where both tabs display identical data (all rows attributed to `user.uid` = Partner A). The cards show only a title, a status icon, and a date — no scratcher/performer names and no theme-aware styling. The requirement is a single chronological list combining both partners' entries, with richer cards and heart icons that match the app's romantic theme.

The fix is surgical: add one nullable column to `user_history`, derive the correct UIDs from `currentTurn + coupleProfile` before calling `logScratch`, add a combined-history query, and redesign the history card component.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers incorrect attribution — when `logScratch` is called with `user.uid` instead of the turn-derived scratcher UID.
- **Property (P)**: The desired post-fix behaviour — `userHistory.userUid` matches the actual scratcher; `userHistory.performerUid` matches the actual performer.
- **Preservation**: All existing behaviours that must be unchanged — `userHistory` row counts, skip-does-not-switch-turn, per-partner seen-task filtering, `resetHistory` isolation.
- **scratcherUid**: `currentTurn === "A" ? coupleProfile.partnerAUid : coupleProfile.partnerBUid` — the partner who scratched the card.
- **performerUid**: `currentTurn === "A" ? coupleProfile.partnerBUid : coupleProfile.partnerAUid` — the partner required to perform the task.
- **logScratch**: The function in `hooks/useScratchHistory.ts` that writes a row to `user_history` and upserts `user_progress`.
- **LogScratchParams**: The interface that describes the arguments to `logScratch`.
- **getHistory**: The function in `hooks/useScratchHistory.ts` that queries `user_history`. A new overload variant (`getAllHistory`) will accept two UIDs and return a combined result.
- **currentTurn**: The Zustand `gameStore` field (`"A" | "B"`) that identifies which partner is scratching in the current round.
- **coupleProfile**: The `CoupleProfile` object from `authStore` that holds `partnerAUid`, `partnerBUid`, `partnerAName`, `partnerBName`.

---

## Bug Details

### Bug Condition

The attribution bug fires whenever `logCompletion()` or `handleSkip()` is called inside `task-scratch.tsx` — both functions read `user.uid` directly instead of computing the turn-correct UID from `currentTurn` and `coupleProfile`.

**Formal Specification:**

```
FUNCTION isBugCondition(X)
  INPUT: X of type ScratchEvent {
    currentTurn  : "A" | "B",
    loggedInUid  : string,   // user.uid from Firebase
    partnerAUid  : string,   // coupleProfile.partnerAUid
    partnerBUid  : string,   // coupleProfile.partnerBUid
  }
  OUTPUT: boolean

  expectedScratcherUid ← IF X.currentTurn = "A" THEN X.partnerAUid
                                                  ELSE X.partnerBUid
  RETURN (logScratch_was_called_with_uid ≠ expectedScratcherUid)
         OR (performerUid_was_not_stored)
END FUNCTION
```

### Examples

- **Turn = "A", logged-in = partnerA (correct turn, still buggy for performer)**
  Actual: `userUid = user.uid (= partnerAUid)`, `performerUid = NULL`.
  Expected: `userUid = partnerAUid`, `performerUid = partnerBUid`.

- **Turn = "B", logged-in = partnerA (wrong UID passed)**
  Actual: `userUid = user.uid (= partnerAUid)`.
  Expected: `userUid = partnerBUid`.

- **Skip on turn "B"**
  Actual: `userUid = user.uid (= partnerAUid)`, no turn switch (correct), `performerUid = NULL`.
  Expected: `userUid = partnerBUid`, no turn switch, `performerUid = partnerAUid`.

- **Edge case: `coupleProfile.partnerBUid` is `null` (Partner B not yet joined)**
  Expected: fall back gracefully — log with `partnerAUid` and leave `performerUid = null`.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `userHistory` must receive exactly one row per `logScratch` call, regardless of which UID is used.
- `handleSkip` must NOT call `switchTurn` — skip does not advance the turn (Requirement 3.2).
- `getNextTask` filters seen tasks against the **calling user's UID only** — unaffected by the other partner's history (Requirement 3.5).
- `resetHistory(uid)` deletes only that UID's rows — the other partner's history is untouched (Requirement 3.4).
- `timeTaken`, `completed`, `skipped`, `taskId`, `taskType`, and `scratchedAt` values written to `user_history` are unchanged by this fix.

**Scope:**
All code paths that do NOT call `logScratch` (navigation, profile setup, image-scratch screen, timer display, confetti, streak logic) are completely unaffected by this fix.

---

## Hypothesized Root Cause

### Bug 1 — Wrong attribution

1. **Direct capture of `user.uid`**: Both `logCompletion` and `handleSkip` in `task-scratch.tsx` close over `user` from `useAuthStore`. The variable is never checked against `currentTurn` before being passed to `logScratch`. Since `user.uid` is the Firebase account holder (always Partner A on a shared device), Partner B's scratches are credited to Partner A.

2. **Missing `performerUid` in `LogScratchParams`**: The interface and the underlying `logScratch` implementation have no `performerUid` field; even if the caller wanted to store it, the schema and ORM layer reject it.

3. **Missing `performer_uid` column in `user_history`**: The Drizzle schema (`db/schema.ts`) and the SQLite table created in `db/migrate.ts` have no `performer_uid` column, so the data cannot be persisted at all.

### Bug 2 — History screen

4. **`getHistory` only queries one UID**: The current implementation accepts a single `userUid` and queries `WHERE user_uid = ?`. To show a combined list both UIDs must be queried and the results merged and sorted.

5. **A/B tab switcher is dead code**: `historyStore.activeTab` / `setActiveTab` / `historyB` are used to switch between Partner A and Partner B views, but the data loaded into both tabs is identical (step 4 above), making the switcher meaningless.

6. **History card UI is incomplete**: Cards lack scratcher/performer names, use non-thematic icons, and ignore `useThemeStore`.

---

## Correctness Properties

Property 1: Bug Condition — Correct Scratcher and Performer Attribution

_For any_ `ScratchEvent` where `isBugCondition` returns true (i.e. `currentTurn` is "B" or `performerUid` is missing), the fixed `logScratch'` call SHALL write a `userHistory` row where:
- `userUid` equals `currentTurn === "A" ? coupleProfile.partnerAUid : coupleProfile.partnerBUid`
- `performerUid` equals `currentTurn === "A" ? coupleProfile.partnerBUid : coupleProfile.partnerAUid`

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — History Row Count and Turn Invariants

_For any_ input where the bug condition does NOT hold (non-attribution code paths), the fixed code SHALL produce the same result as the original: `userHistory` row count equals the number of `logScratch` calls for each UID, `currentTurn` is unchanged after `handleSkip`, per-partner seen-task isolation is maintained, and `resetHistory` affects only the targeted UID.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

---

## Fix Implementation

### Changes Required

#### 1. `db/migrate.ts` — Add `performer_uid` column (safe migration)

SQLite has no `ALTER TABLE ADD COLUMN IF NOT EXISTS` syntax. The migration must guard against re-running on a device that already has the column, using a `PRAGMA table_info` check or a `try/catch` around the `ALTER TABLE` statement.

```
// Idempotent pattern (try/catch):
try {
  db.execSync(`ALTER TABLE user_history ADD COLUMN performer_uid TEXT`);
} catch (_) {
  // Column already exists — safe to ignore
}
```

This is called once inside `migrateDatabase()`, after the existing `CREATE TABLE IF NOT EXISTS` block.

#### 2. `db/schema.ts` — Add `performerUid` to `userHistory` table definition

```
performerUid: text("performer_uid"),   // nullable — no .notNull()
```

This keeps the Drizzle ORM schema in sync with the physical table so that `db.insert(userHistory).values({ ..., performerUid: ... })` compiles and runs correctly.

#### 3. `hooks/useScratchHistory.ts` — Extend `LogScratchParams` and `logScratch`

Add optional field to the interface:

```
export interface LogScratchParams {
  userUid: string;
  taskId: string;
  taskType: "text" | "image";
  completed: boolean;
  skipped: boolean;
  timeTaken?: number;
  performerUid?: string;       // NEW — nullable, stored as-is
}
```

Inside `logScratch`, destructure and pass `performerUid` to the insert:

```
await db.insert(userHistory).values({
  userUid,
  taskId,
  taskType,
  scratchedAt: new Date(),
  completed,
  skipped,
  timeTaken: timeTaken ?? null,
  performerUid: performerUid ?? null,   // NEW
});
```

The `userProgress` upsert is keyed on `userUid` — because `userUid` is now the correct scratcher UID, the scratch count automatically increments on the right partner's row with no other change needed.

Add a new `getAllHistory` variant that accepts both partner UIDs and returns a merged, date-sorted list:

```typescript
const getAllHistory = useCallback(
  async (partnerAUid: string, partnerBUid: string | null): Promise<HistoryEntry[]> => {
    const uids = [partnerAUid, partnerBUid].filter(Boolean) as string[];
    // Query rows for both UIDs using inArray, order by scratchedAt DESC
    const rows = await db
      .select()
      .from(userHistory)
      .where(inArray(userHistory.userUid, uids))
      .orderBy(desc(userHistory.scratchedAt));

    return rows.map((row) => ({
      id: row.id,
      userUid: row.userUid,
      taskId: row.taskId,
      taskType: row.taskType as "image" | "text",
      scratchedAt: row.scratchedAt ?? new Date(),
      completed: row.completed ?? false,
      skipped: row.skipped ?? false,
      timeTaken: row.timeTaken ?? null,
      performerUid: row.performerUid ?? null,   // NEW
    }));
  },
  []
);
```

#### 4. `types/index.ts` — Add `performerUid` to `HistoryEntry`

```typescript
export interface HistoryEntry {
  id: number;
  userUid: string;
  taskId: string;
  taskType: "image" | "text";
  scratchedAt: Date;
  completed: boolean;
  skipped: boolean;
  timeTaken: number | null;
  performerUid?: string | null;   // NEW
}
```

#### 5. `app/(game)/task-scratch.tsx` — Derive correct UIDs before calling `logScratch`

Replace the direct `user.uid` reference in both `logCompletion` and `handleSkip`:

```typescript
// Derive at call site (not cached; coupleProfile may be null on edge devices)
const scratcherUid =
  currentTurn === "A"
    ? coupleProfile?.partnerAUid ?? user.uid
    : coupleProfile?.partnerBUid ?? user.uid;

const performerUid =
  currentTurn === "A"
    ? coupleProfile?.partnerBUid ?? null
    : coupleProfile?.partnerAUid ?? null;

await logScratch({
  userUid: scratcherUid,
  taskId: currentTask.id,
  taskType: "text",
  completed: true,   // or false for skip
  skipped: false,    // or true for skip
  timeTaken: elapsed,
  performerUid: performerUid ?? undefined,
});
```

Apply the same UID derivation in `handleSkip`. No other logic in either function changes.

#### 6. `store/historyStore.ts` — Remove A/B tab state

Delete `historyB`, `setHistoryB`, `activeTab`, and `setActiveTab`. Keep only:

```typescript
interface HistoryState {
  historyAll: HistoryEntry[];
  setHistoryAll: (h: HistoryEntry[]) => void;
}
```

Existing callers that reference `historyA`/`historyB`/`activeTab` in `history.tsx` will be updated in step 7.

#### 7. `app/(game)/history.tsx` — Redesign to combined list with heart icons

- Remove tab switcher UI and all `activeTab`/`setActiveTab`/`historyB` references.
- Call `getAllHistory(coupleProfile.partnerAUid, coupleProfile.partnerBUid)` on mount and store result in `historyStore.historyAll`.
- Add `useThemeStore` + `getTheme` for theme-aware card styling.
- History card fields: task title, scratcher name (resolve `userUid` → name via `coupleProfile`), performer name (resolve `performerUid` → name), date/time, heart icon.
- Heart icon mapping:
  - `completed === true` → `Ionicons name="heart"` color `#ec4899` (filled pink)
  - `completed === false` (skipped) → `Ionicons name="heart-outline"` color `theme.card.subtext`

Helper for resolving a UID to a display name:

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

The reset button calls `resetHistory` for **both** UIDs so the combined list clears fully.

---

## Testing Strategy

### Validation Approach

Two-phase: first surface counterexamples against the **unfixed** code to confirm the bugs exist; then verify the fix makes all bug-condition tests green while leaving preservation tests green throughout.

### Exploratory Bug Condition Checking

**Goal**: Confirm that on the unfixed codebase `logScratch` receives the wrong `userUid` when `currentTurn === "B"` and that `performerUid` is never stored.

**Test Plan**: Inline-simulate the unfixed `logCompletion` / `handleSkip` logic and assert the expected (fixed) UID derivation. Run these on the unfixed code to observe failures.

**Test Cases**:
1. **Turn B attribution test**: Call simulated `logCompletion` with `currentTurn = "B"`, `user.uid = partnerAUid`; assert `userUid === partnerBUid`. Will FAIL on unfixed code.
2. **Turn A performer test**: Assert `performerUid === partnerBUid` is stored after `logCompletion` with `currentTurn = "A"`. Will FAIL on unfixed code (column does not exist).
3. **Skip attribution test**: Call simulated `handleSkip` with `currentTurn = "B"`; assert `userUid === partnerBUid` and `currentTurn` is UNCHANGED. Attribution assertion FAILS; turn preservation PASSES.
4. **partnerBUid null edge case**: Call with `partnerBUid = null`; assert fallback to `user.uid` and `performerUid = null` — must not crash. Tests the nullable guard.

**Expected Counterexamples**:
- `currentTurn = "B"` → `userUid` is `partnerAUid` instead of `partnerBUid`.
- `performerUid` field is absent from the DB row.

### Fix Checking

**Goal**: Verify that for all inputs where `isBugCondition` is true, the fixed functions write the correct UIDs.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  row ← userHistory row written by logScratch'(X)
  ASSERT row.userUid  = (X.currentTurn = "A" ? X.partnerAUid : X.partnerBUid)
  ASSERT row.performerUid = (X.currentTurn = "A" ? X.partnerBUid : X.partnerAUid)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code behaves identically to the original.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X).userHistory_row_count  = F'(X).userHistory_row_count
  ASSERT F(X).currentTurn_after_skip = F'(X).currentTurn_after_skip
  ASSERT F(X).seen_ids_for_uid       = F'(X).seen_ids_for_uid
END FOR
```

**Testing Approach**: Property-based testing (fast-check) is used for preservation because:
- It generates diverse UID strings and call counts automatically.
- It proves `userHistory` row count equals call count for all N ∈ [1, 10].
- It proves `currentTurn` is unchanged after skip for all starting turns.

**Test Cases**:
1. **Row-count preservation**: For any `userUid` string and call count N, `logScratch` writes exactly N rows to `userHistory`. Observed on unfixed code first; must remain green after fix.
2. **Skip-no-turn-switch preservation**: For any starting turn, simulated `handleSkip` path leaves `currentTurn` unchanged.
3. **`resetHistory` isolation**: Delete rows for `partnerAUid`; assert `partnerBUid` rows are untouched.
4. **`getSeenIds` isolation**: Seen task IDs for `partnerAUid` are not affected by inserts under `partnerBUid`.

### Unit Tests

- `isBugCondition` returns `true` when `user.uid !== scratcherUid`.
- `logScratch'` with `performerUid` writes the value to the DB and maps back correctly in `getHistory`.
- `resolvePartnerName` returns correct name for partnerA UID, partnerB UID, unknown UID, and null.
- `getAllHistory` returns entries for both UIDs merged and sorted by `scratchedAt DESC`.
- Migration idempotency: calling `migrateDatabase` twice does not throw (the `try/catch` guard around `ALTER TABLE` absorbs the "duplicate column" error on the second run).

### Property-Based Tests

- Generate random `(currentTurn, partnerAUid, partnerBUid)` triples; assert `scratcherUid` and `performerUid` derivation is always correct and mutually exclusive.
- Generate random UID strings and call counts N; assert `getAllHistory` returns exactly N entries per UID when both are present, sorted newest-first.
- Generate random boolean `isDark` values; assert `getTheme(isDark)` always returns an object with the required keys (`background`, `card`, `glass`, `accent`) — confirms theme-aware card rendering won't crash.

### Integration Tests

- Full flow: mount `task-scratch.tsx` with `currentTurn = "B"`, complete a task, query `user_history` directly and assert `user_uid = partnerBUid` and `performer_uid = partnerAUid`.
- History screen: mount `history.tsx`, mock `getAllHistory` returning entries from both partners, assert no tab switcher is rendered, assert both partners' entries appear in a single list ordered by date.
- Reset: press "Reset My History", assert both partners' UIDs are cleared from the combined list.
