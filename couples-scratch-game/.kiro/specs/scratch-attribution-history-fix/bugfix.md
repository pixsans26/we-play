# Bugfix Requirements Document

## Introduction

This document covers two bugs and one UI improvement in the couples scratch-card game.

**Bug 1** — `logScratch` (and the `getNextTask` / history query) is always called with `user.uid` (the Firebase-authenticated user, who is always Partner A on a shared device). On a single-device shared app the active scratcher is determined by `currentTurn` in `gameStore`, not by who is logged in. As a result every scratch is credited to Partner A regardless of whose turn it actually was, and the performer (the partner who must do the task) is never recorded in the history table.

**Bug 2 / UI improvement** — The history screen shows an A/B tab switcher that adds no value (both tabs displayed the same data). The cards show checkmark/skip icons, display no scratcher or performer names, and are visually dated. The requirement is a single combined chronological list with richer cards and Ionicons heart icons.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `currentTurn` is "A" and the scratch card is revealed THEN the system calls `logScratch` with `user.uid` (Partner A's UID) even though it is Partner A's turn to scratch and Partner B's turn to perform — crediting the scratch count to Partner A is correct, but the performer (Partner B) is never stored in the history row

1.2 WHEN `currentTurn` is "B" and the scratch card is revealed THEN the system calls `logScratch` with `user.uid` (Partner A's UID always) instead of Partner B's UID, incorrectly crediting the scratch to Partner A rather than Partner B

1.3 WHEN `logScratch` records a history row THEN the system stores no `performerUid` field, making it impossible to display "who performed the task" in the history screen

1.4 WHEN the history screen is opened THEN the system shows an A/B tab switcher where both tabs display the same data (all scratches attributed to the logged-in user only), so per-partner counts are meaningless

1.5 WHEN a history card is rendered THEN the system shows only a task title, a checkmark or skip icon, and a date — it does not show who scratched the card or who performed the task

1.6 WHEN a history card is rendered THEN the system uses `checkmark-circle` and `play-skip-forward-outline` Ionicons instead of heart icons, inconsistent with the romantic theme

### Expected Behavior (Correct)

2.1 WHEN `currentTurn` is "A" and a scratch is logged THEN the system SHALL call `logScratch` with Partner A's UID (`coupleProfile.partnerAUid`) as the `userUid`, so the scratch count increments on Partner A's `userProgress` row

2.2 WHEN `currentTurn` is "B" and a scratch is logged THEN the system SHALL call `logScratch` with Partner B's UID (`coupleProfile.partnerBUid`) as the `userUid`, so the scratch count increments on Partner B's `userProgress` row

2.3 WHEN `logScratch` records a history row THEN the system SHALL also store a `performerUid` field containing the UID of the partner who is required to perform the task (the partner whose turn it is NOT to scratch)

2.4 WHEN the history screen is opened THEN the system SHALL show a single combined chronological list of ALL scratch entries from both partners (both UIDs), ordered most-recent-first, with no A/B tab switcher

2.5 WHEN a history card is rendered THEN the system SHALL display: task title, scratcher name (the partner who scratched), performer name (the partner who performed), date/time, and completed/skipped status

2.6 WHEN a history card is rendered THEN the system SHALL use Ionicons heart icons (`heart` for completed, `heart-outline` for skipped, `heart-half` for in-progress or partial) instead of checkmark/skip icons, and SHALL use theme-aware (light/dark) styling

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `currentTurn` is "A" and Partner A scratches a card THEN the system SHALL CONTINUE TO record a `userHistory` row with the correct `taskId`, `taskType`, `scratchedAt`, `completed`, `skipped`, and `timeTaken` values

3.2 WHEN a scratch is skipped THEN the system SHALL CONTINUE TO NOT switch `currentTurn` (skip does not change whose turn it is)

3.3 WHEN `logScratch` is called N times for a given `userUid` THEN the system SHALL CONTINUE TO write exactly N rows to `userHistory` for that `userUid`

3.4 WHEN `resetHistory` is called for one partner's UID THEN the system SHALL CONTINUE TO delete only that partner's history rows, leaving the other partner's rows untouched

3.5 WHEN `getNextTask` is called for a given `userUid` THEN the system SHALL CONTINUE TO filter seen tasks against that specific user's history only, unaffected by the other partner's history

---

## Bug Condition Derivation

### Bug Condition Function

```pascal
FUNCTION isBugCondition_Attribution(X)
  INPUT: X of type ScratchEvent { currentTurn: "A"|"B", loggedInUid: string, partnerAUid: string, partnerBUid: string }
  OUTPUT: boolean

  // Bug fires when the UID passed to logScratch does not match the actual scratcher's UID
  expectedUid ← IF X.currentTurn = "A" THEN X.partnerAUid ELSE X.partnerBUid
  RETURN logScratch.userUid ≠ expectedUid
END FUNCTION
```

### Property: Fix Checking — Scratcher Attribution

```pascal
FOR ALL X WHERE isBugCondition_Attribution(X) DO
  result ← logScratch'(X)
  ASSERT result.userUid = (IF X.currentTurn = "A" THEN X.partnerAUid ELSE X.partnerBUid)
  ASSERT result.performerUid = (IF X.currentTurn = "A" THEN X.partnerBUid ELSE X.partnerAUid)
END FOR
```

### Property: Preservation Checking

```pascal
FOR ALL X WHERE NOT isBugCondition_Attribution(X) DO
  ASSERT F(X).userHistory_row_count = F'(X).userHistory_row_count
  ASSERT F(X).currentTurn_after_skip = F'(X).currentTurn_after_skip
END FOR
```
