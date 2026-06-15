# Bugfix Requirements Document

## Introduction

Three bugs have been identified in the scratch card flow (`task-scratch` screen) and the global theme initialisation. The first two bugs relate to stale UI state after a scratch action: Nitish's (the current player's) turn indicator never updates after task completion, and the per-partner scratch counts displayed in the counter bar always read zero. The third bug is a wrong default value in the theme store — the app launches with a dark theme instead of the intended light theme.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — Turn indicator not updating after task completion**

1.1 WHEN a task timer runs to zero (timer-finished path) THEN the system does not call `switchTurn`, so the current-turn indicator in the UI continues to show the same partner's name after the task ends.

1.2 WHEN the user taps "Complete" during the timer AND subsequently taps "Next Task" THEN the system calls `switchTurn` twice (once in `handleComplete` and once in `handleNext`), causing the turn to flip and then immediately flip back, so the displayed turn name is unchanged from before the task.

**Bug 2 — Scratch count not updating after a scratch**

1.3 WHEN a user scratches a card and completes or skips a task THEN the system records the event in `userHistory` only and never increments `scratchCount` in the `userProgress` table, so `loadScratchCounts` always reads the same value it read on mount.

1.4 WHEN `handleNext` calls `loadScratchCounts` after task completion THEN the system reads a `scratchCount` of 0 (or the stale initial value) from the database because the count was never written, so the scratch counter UI shows no change.

**Bug 3 — App launches with dark theme instead of light theme**

1.5 WHEN the app is launched for the first time THEN the system initialises `isDark` to `true` in `themeStore`, causing the dark colour palette to be applied to every screen even though the intended default is the light theme.

---

### Expected Behavior (Correct)

**Bug 1 — Turn indicator updates correctly**

2.1 WHEN a task timer runs to zero (timer-finished path) THEN the system SHALL call `switchTurn` exactly once so that the turn indicator updates to the next partner's name before the user taps "Next Task".

2.2 WHEN the user taps "Complete" during the timer AND subsequently taps "Next Task" THEN the system SHALL call `switchTurn` exactly once across the entire complete-then-next flow, so the turn indicator shows the correct next partner's name.

**Bug 2 — Scratch count increments after a scratch**

2.3 WHEN a user scratches a card (scratch threshold reached) THEN the system SHALL increment `scratchCount` in the `userProgress` row for that user by 1 in the database at the time of the scratch event.

2.4 WHEN `handleNext` calls `loadScratchCounts` after task completion THEN the system SHALL read the updated `scratchCount` values from `userProgress` and display the new totals in the scratch counter bar.

**Bug 3 — App launches with light theme**

2.5 WHEN the app is launched for the first time THEN the system SHALL initialise `isDark` to `false` in `themeStore` so that the light colour palette is applied to all screens by default.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user taps the theme toggle in settings THEN the system SHALL CONTINUE TO switch between light and dark themes correctly.

3.2 WHEN the user taps "Skip Task" (before the timer starts) THEN the system SHALL CONTINUE TO advance to the next task without switching the current turn.

3.3 WHEN `logScratch` is called THEN the system SHALL CONTINUE TO write the scratch event to `userHistory` (task ID, type, timestamp, completed, skipped, timeTaken) as before.

3.4 WHEN a user has never scratched a card THEN the system SHALL CONTINUE TO display a scratch count of 0 for that user in the counter bar.

3.5 WHEN the "Next Task" button is tapped after a completed task THEN the system SHALL CONTINUE TO load a new task, reset the scratch card overlay, and reset the timer state.

3.6 WHEN the timer finishes naturally (reaches zero) THEN the system SHALL CONTINUE TO play the alarm sound and display the "Time's up!" indicator.

---

## Bug Condition Summary

### Bug 1 — Turn not switching

```pascal
FUNCTION isBugCondition_TurnNotUpdating(event)
  INPUT: event of type TaskCompletionEvent
  OUTPUT: boolean

  RETURN (event.path = "timer_finished") OR
         (event.path = "manual_complete" AND event.nextTapped = true)
END FUNCTION

// Property: Fix Checking — turn switches exactly once
FOR ALL event WHERE isBugCondition_TurnNotUpdating(event) DO
  turnBefore ← currentTurn
  processEvent(event)
  ASSERT currentTurn ≠ turnBefore
END FOR

// Property: Preservation — skip does not switch turn
FOR ALL event WHERE event.path = "skip" DO
  ASSERT F(event).currentTurn = F'(event).currentTurn
END FOR
```

### Bug 2 — Scratch count not persisted

```pascal
FUNCTION isBugCondition_ScratchCountStale(action)
  INPUT: action of type ScratchAction
  OUTPUT: boolean

  RETURN action.type = "scratch_complete"
END FUNCTION

// Property: Fix Checking — scratchCount increments in DB
FOR ALL action WHERE isBugCondition_ScratchCountStale(action) DO
  countBefore ← db.userProgress[action.userUid].scratchCount
  perform(action)
  countAfter ← db.userProgress[action.userUid].scratchCount
  ASSERT countAfter = countBefore + 1
END FOR

// Property: Preservation — userHistory still written
FOR ALL action WHERE isBugCondition_ScratchCountStale(action) DO
  ASSERT F(action).userHistory = F'(action).userHistory
END FOR
```

### Bug 3 — Wrong initial theme

```pascal
FUNCTION isBugCondition_WrongInitialTheme(appState)
  INPUT: appState of type AppInitState
  OUTPUT: boolean

  RETURN appState.isFirstLaunch = true
END FUNCTION

// Property: Fix Checking — isDark starts false
FOR ALL appState WHERE isBugCondition_WrongInitialTheme(appState) DO
  store ← initialiseThemeStore()
  ASSERT store.isDark = false
END FOR

// Property: Preservation — toggle still works
FOR ALL store WHERE store.isDark = false DO
  ASSERT F(toggleTheme(store)).isDark = F'(toggleTheme(store)).isDark
END FOR
```
