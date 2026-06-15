# Implementation Plan: Couples Scratch Card Game

## Overview

This plan implements a local-first React Native (Expo) mobile app where two partners take turns scratching virtual cards to reveal tasks or images for each other. The implementation follows six phases: Foundation, Onboarding, Core Game, Gamification, History & Polish, and Testing. Each task builds incrementally on previous work, ensuring no orphaned code.

## Tasks

- [x] 1. Foundation — Project Init, Dependencies, Database, Firebase, Auth Screens
  - [x] 1.1 Initialize Expo project and install all dependencies
    - Run `npx create-expo-app couples-scratch-game` with TypeScript template
    - Install: expo-router, nativewind, tailwindcss, zustand, drizzle-orm, expo-sqlite, firebase, @react-native-async-storage/async-storage, react-native-reanimated, react-native-scratch-card, react-native-confetti-cannon, expo-av, lottie-react-native, expo-linear-gradient, @expo-google-fonts/playfair-display, @expo-google-fonts/nunito, fast-check (dev)
    - Configure `tailwind.config.js` with the love/passion/night color palette, custom fonts, and border radius extensions
    - Configure `app.json` for Expo Router and plugins
    - _Requirements: 2.1, 13.1, 13.5_

  - [x] 1.2 Set up folder structure and file-based routing
    - Create directory structure: `app/(auth)/`, `app/(onboarding)/`, `app/(game)/`, `components/`, `db/`, `store/`, `data/`, `hooks/`, `lib/`, `assets/sounds/`, `assets/images/`
    - Create `_layout.tsx` files for root, auth, onboarding, and game route groups
    - Create root layout with font loading (Playfair Display, Nunito) and 3-second fallback to system fonts
    - _Requirements: 16.1, 13.5, 13.6_

  - [x] 1.3 Define TypeScript types and interfaces
    - Create `types/index.ts` with CoupleProfile, UserProgress, HistoryEntry, LevelBadgeMapping, LEVEL_BADGES, LEVEL_CATEGORIES
    - Create `data/textTasks.ts` with Task type definition
    - Create `data/imageTasks.ts` with ImageTask type definition
    - _Requirements: 12.4, 12.5_

  - [x] 1.4 Implement SQLite database schema and client
    - Create `db/schema.ts` with couple, userHistory, and userProgress tables using drizzle-orm
    - Create `db/client.ts` with database connection singleton using expo-sqlite
    - Create migration setup that runs on app launch within 5 seconds
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 1.5 Set up Firebase Authentication
    - Create `lib/firebase.ts` with Firebase app initialization and auth with AsyncStorage persistence
    - Create environment variable configuration for Firebase credentials
    - _Requirements: 1.8_

  - [x] 1.6 Implement Zustand auth store
    - Create `store/authStore.ts` with user, isPartnerA, coupleProfile, isLoading state and setters
    - Wire Firebase onAuthStateChanged listener in root layout to update auth store
    - _Requirements: 1.1, 1.7, 1.8_

  - [x] 1.7 Implement Login screen
    - Create `app/(auth)/login.tsx` with email/password inputs, gradient background, and login button
    - Implement signInWithEmailAndPassword Firebase call
    - Display inline error messages for failed auth (wrong password, account not found)
    - Preserve email field on error
    - _Requirements: 1.1, 1.2_

  - [x] 1.8 Implement Sign-up screen
    - Create `app/(auth)/signup.tsx` with name, email, password, confirm password fields
    - Implement form validation: name 1–50 chars, valid email, password ≥8 chars, confirmation match
    - Display per-field inline error messages on validation failure
    - Handle Firebase "email already in use" error
    - Preserve all entered data on error
    - On success, create Firebase account and navigate to profile setup
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 1.9 Implement Navigation Guard (entry redirect)
    - Create `app/index.tsx` that checks auth state and profile completeness
    - Redirect unauthenticated → login, authenticated without profile → profile setup, authenticated with profile → main game
    - Show loading indicator while auth state resolves
    - _Requirements: 1.6, 1.7, 16.2, 16.3, 16.4, 16.5_

- [x] 2. Checkpoint — Foundation complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Onboarding — Profile Setup, Partner Linking, Navigation Guards
  - [x] 3.1 Implement Profile Setup screen (Step 1 — Your Info)
    - Create `app/(onboarding)/profile-setup.tsx` with name, age, gender (segmented selector), preferences fields
    - Validate: name 1–50 chars, age 18–120, gender selected, preferences ≤200 chars
    - Display per-field error messages on validation failure
    - On valid submission, insert into couple table with user's Firebase UID as Partner_A
    - Initialize user_progress record (scratchCount: 0, completedCount: 0, currentLevel: 1)
    - _Requirements: 2.2, 2.3, 2.6_

  - [x] 3.2 Implement Profile Setup screen (Step 2 — Partner Info)
    - Add Step 2 UI for partner name input (1–50 chars)
    - Store partner name in couple table
    - Navigate to main game screen on completion
    - _Requirements: 2.4_

  - [x] 3.3 Implement Partner B linking logic
    - When Partner_B authenticates on same device, save their Firebase UID in couple table
    - Initialize Partner_B's user_progress record
    - _Requirements: 2.5_

  - [x] 3.4 Enforce navigation guard for incomplete profiles
    - Check couple table for partnerAName populated before allowing game access
    - Redirect to profile setup if profile incomplete
    - Redirect authenticated users away from auth routes to main game
    - _Requirements: 2.1, 16.3, 16.4_

- [x] 4. Checkpoint — Onboarding complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Core Game — Scratch Card, Confetti, Image/Task Reveal, Timer, History Logging
  - [x] 5.1 Implement ScratchCard component
    - Create `components/ScratchCard/ScratchCard.tsx` with 60% threshold, 50px brush size
    - On threshold reached: remove overlay, trigger onScratchComplete callback
    - Use glittery overlay texture image
    - _Requirements: 4.1, 4.2, 4.3, 4.6_

  - [x] 5.2 Implement HeartConfetti component
    - Create `components/Confetti/HeartConfetti.tsx` with 80 particles, pink/red colors, 3-second fadeout
    - Auto-start on mount, auto-dismiss after duration
    - _Requirements: 4.5, 13.4_

  - [x] 5.3 Implement sound effects hook
    - Create `hooks/useSound.ts` with playScratch, playAlarm, playLevelUp functions
    - Silently fail if sound cannot load or play (non-blocking)
    - Respect device silent/muted mode
    - _Requirements: 4.4, 4.7, 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 5.4 Implement Zustand game store
    - Create `store/gameStore.ts` with mode, currentTask, previousTask, timerStarted, timerFinished, isScratched, performingPartnerName state
    - Implement reset action
    - _Requirements: 3.5, 3.6_

  - [x] 5.5 Implement task selection engine
    - Create `lib/taskSelection.ts` with selectNextTask function
    - Filter by: task level ≤ user level, task ID not in seen set
    - Return random eligible task or null if pool exhausted
    - _Requirements: 5.1, 6.1, 8.2, 9.5_

  - [x] 5.6 Implement scratch history hook
    - Create `hooks/useScratchHistory.ts` with getNextTask, logScratch, resetHistory, getSeenIds, getHistory
    - logScratch records: userUid, taskId, taskType, timestamp, completed, skipped, timeTaken
    - Filter task selection only against requesting user's own history
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 5.7 Implement Main Game screen
    - Create `app/(game)/index.tsx` with two game mode cards (Image Scratch, Task Scratch)
    - Display PartnerHeader with both names and scratch counts
    - Show placeholder for Partner B if not linked
    - Display current level badge
    - Add navigation to History screen
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 5.8 Implement Image Scratch game screen
    - Create `app/(game)/image-scratch.tsx` with scratch card overlay
    - On reveal: show confetti, display image, caption, reaction prompt
    - Show performing partner's name
    - Done button: mark completed, increment scratch/completed counts, check level-up
    - Next Card button: load next unseen image task
    - Empty state when no unseen images remain
    - Prevent scratch if Partner B not linked
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 17.1, 17.2, 17.3, 17.4_

  - [x] 5.9 Implement useTimer hook
    - Create `hooks/useTimer.ts` with countdown logic, MM:SS formatting, start/reset controls
    - Return timeLeft, isRunning, isFinished, formattedTime
    - _Requirements: 6.4, 6.5_

  - [x] 5.10 Implement Task Scratch game screen
    - Create `app/(game)/task-scratch.tsx` with scratch card overlay
    - On reveal: show confetti, display task title, description, Start Timer button
    - Timer countdown with MM:SS display
    - Red pulsing animation when ≤10 seconds remain
    - Alarm sound on timer end (≤3 seconds)
    - Complete button during timer, Next button after completion
    - Previous button for read-only view of last task
    - Empty state when no unseen tasks remain
    - Show performing partner's name
    - Prevent scratch if Partner B not linked
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 17.1, 17.2, 17.3, 17.4_

  - [x] 5.11 Implement Skip mechanic
    - Show Skip button only when card is revealed AND timer not started AND timer not finished
    - On skip: mark as skipped in history, load next unseen task within 1 second
    - Hide Skip button once timer starts or finishes
    - Handle case where no unseen tasks remain (show message, don't record skip)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. Checkpoint — Core game loop complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Gamification — Milestones, Level-Up Animation, Level Badges, Task Gating
  - [x] 7.1 Implement milestone/level hook
    - Create `hooks/useMilestone.ts` with checkLevelUp and getProgress functions
    - Level = floor(completedCount / 10) + 1, no max cap
    - Level-up triggers when completedCount crosses multiple of 10
    - _Requirements: 9.1, 9.2_

  - [x] 7.2 Implement level-up celebration animation
    - Add Lottie level-up animation (non-looping) triggered on level-up
    - Play level-up sound effect
    - User can dismiss or wait for animation to complete
    - _Requirements: 9.3_

  - [x] 7.3 Implement LevelBadge component
    - Create `components/Milestone/LevelBadge.tsx` displaying emoji + label per level
    - Badge mapping: 1→🌱, 2→💞, 3→🔥, 4→💜, 5+→👑
    - _Requirements: 3.4, 9.4_

  - [x] 7.4 Implement category-based task gating
    - Filter tasks by unlocked categories per level: L1={romantic,fun}, L2=+playful, L3=+dare, L4+=+intimate
    - Display message when all eligible tasks seen, prompt history reset
    - _Requirements: 9.5, 9.6, 9.7_

- [x] 8. Checkpoint — Gamification complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. History & Polish — History Screen, Reset, Themes, Haptics, Error Handling
  - [x] 9.1 Implement History screen
    - Create `app/(game)/history.tsx` with tabbed interface (Partner A / Partner B names)
    - Default to current user's tab
    - Scrollable list ordered by most recent scratch timestamp
    - Display task title or image thumbnail, completion status, date/time
    - Empty state message when no history
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 9.2 Implement history detail view
    - Tap history entry → show full task description or full image in read-only mode
    - No timer, skip, or complete actions available
    - _Requirements: 10.5_

  - [x] 9.3 Implement history reset functionality
    - Add Reset My History button on History screen
    - Confirmation dialog with destructive Confirm and Cancel options
    - On confirm: delete all user_history records for current user's UID only
    - Do NOT modify other partner's history
    - Do NOT modify user's currentLevel, completedCount, or scratchCount
    - Update UI to show empty list within 1 second
    - Show error message if reset fails, retain existing records
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [x] 9.4 Implement Zustand history store
    - Create `store/historyStore.ts` with historyA, historyB, activeTab, refreshHistory
    - _Requirements: 10.1, 10.2_

  - [x] 9.5 Populate static task data
    - Create `data/textTasks.ts` with 50+ text tasks across levels 1–5, ≥8 per level, ≥5 per category
    - Create `data/imageTasks.ts` with 20+ image tasks across levels 1–5, ≥3 per level
    - Ensure all IDs unique, titles ≤50 chars, descriptions ≤200 chars, timers 30–300s, levels 1–5
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 9.6 Implement visual design polish
    - Apply pink-to-purple gradient background across all screens
    - Implement glassmorphism card effects (10–20% opacity, ≥10px blur, 1px border)
    - Spring scale animation on reveal (0.5→1.0, damping 10–15, stiffness 100–200, within 500ms)
    - Rounded cards with border-radius ≥24px
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 9.7 Implement error handling patterns
    - Database write failures: show error toast, don't update in-memory state
    - Database migration failures: show blocking error, prevent game access
    - Sound failures: silently continue
    - Font loading failures: fall back to system font after 3s
    - Task pool exhausted: show informational message, suggest reset
    - _Requirements: 15.6, 15.7, 14.4_

- [x] 10. Checkpoint — History & polish complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Testing — Property-Based Tests for Correctness Properties
  - [ ]* 11.1 Write property test for sign-up form validation (Property 1)
    - **Property 1: Sign-up form validation accepts valid inputs and rejects invalid inputs**
    - Generate arbitrary names (1–50 chars), emails, passwords (≥8 chars), confirmations
    - Assert valid inputs → success, invalid inputs → failure with correct error fields
    - **Validates: Requirements 1.3, 1.4**

  - [ ]* 11.2 Write property test for navigation guard routing (Property 2)
    - **Property 2: Navigation guard routes correctly based on authentication and profile state**
    - Generate arbitrary auth states (unauthenticated, authenticated-no-profile, authenticated-with-profile) and target routes
    - Assert correct redirect destination for each combination
    - **Validates: Requirements 2.1, 16.2, 16.3, 16.4**

  - [ ]* 11.3 Write property test for profile field validation (Property 3)
    - **Property 3: Profile field validation**
    - Generate arbitrary profile inputs: name (1–50), age (18–120), gender, preferences (0–200)
    - Assert valid inputs accepted, invalid inputs rejected with appropriate errors
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [ ]* 11.4 Write property test for level badge mapping (Property 4)
    - **Property 4: Level badge mapping is total and correct**
    - Generate arbitrary level numbers (integer ≥ 1)
    - Assert correct emoji and label for each level
    - **Validates: Requirements 3.4, 9.4**

  - [ ]* 11.5 Write property test for scratch threshold (Property 5)
    - **Property 5: Scratch reveal triggers at exactly the 60% threshold**
    - Generate arbitrary scratch percentages (0–100%)
    - Assert: <60% → unrevealed, ≥60% → revealed
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 11.6 Write property test for task selection (Property 6)
    - **Property 6: Task selection always returns an unseen, level-appropriate task**
    - Generate arbitrary seen ID sets, current levels, and task pools
    - Assert: result is null (empty pool) OR result.id not in seen set AND result.level ≤ currentLevel
    - **Validates: Requirements 5.1, 6.1, 8.2, 9.5**

  - [ ]* 11.7 Write property test for level calculation (Property 7)
    - **Property 7: Level calculation is deterministic from completed count**
    - Generate arbitrary non-negative completed counts
    - Assert: level = floor(completedCount / 10) + 1
    - Assert: level-up iff completedCount % 10 === 0 AND completedCount > 0
    - **Validates: Requirements 5.4, 9.1, 9.2**

  - [ ]* 11.8 Write property test for timer formatting (Property 8)
    - **Property 8: Timer formats any seconds value as MM:SS**
    - Generate arbitrary integers 0–86400
    - Assert: output matches /^\d{2}:\d{2}$/ AND parseInt(MM)*60 + parseInt(SS) === input
    - **Validates: Requirements 6.5**

  - [ ]* 11.9 Write property test for skip button visibility (Property 9)
    - **Property 9: Skip button visibility is a function of game state**
    - Generate arbitrary game states (isScratched, timerStarted, timerFinished)
    - Assert: visible iff isScratched AND NOT timerStarted AND NOT timerFinished
    - **Validates: Requirements 7.1, 7.4, 7.5**

  - [ ]* 11.10 Write property test for history isolation (Property 10)
    - **Property 10: History operations are scoped to the requesting user only**
    - Generate two distinct user UIDs with independent history records
    - Assert: resetting one user's history deletes only their records, not the other's
    - Assert: task selection filters only against requesting user's history
    - **Validates: Requirements 8.4, 8.5, 11.4, 11.5**

  - [ ]* 11.11 Write property test for history reset preserving progress (Property 11)
    - **Property 11: History reset preserves level and progress counters**
    - Generate arbitrary progress states (scratchCount, completedCount, currentLevel)
    - Assert: after reset, all three counters remain unchanged
    - **Validates: Requirements 9.8, 11.6**

  - [ ]* 11.12 Write property test for category unlocking (Property 12)
    - **Property 12: Category unlocking follows the level progression map**
    - Generate arbitrary user levels (1–10+)
    - Assert: L1={romantic,fun}, L2=+playful, L3=+dare, L4+={all}
    - **Validates: Requirements 9.6**

  - [ ]* 11.13 Write property test for task pool data integrity (Property 13)
    - **Property 13: Task pool data integrity**
    - Validate all tasks in text and image pools: unique IDs, title ≤50, description ≤200, timer 30–300, level 1–5, valid category
    - Assert no duplicate IDs across both pools
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6**

  - [ ]* 11.14 Write property test for partner assignment (Property 14)
    - **Property 14: Scratch assigns task to the opposite partner**
    - Generate arbitrary scratch events with partner identifiers
    - Assert: Partner A scratch → task assigned to Partner B, recorded in A's history
    - Assert: Partner B scratch → task assigned to Partner A, recorded in B's history
    - **Validates: Requirements 17.1, 17.2**

- [ ] 12. Final Checkpoint — All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between phases
- Property tests validate universal correctness properties from the design document using fast-check with ≥100 iterations each
- Unit tests validate specific examples and edge cases
- The app uses TypeScript throughout with React Native (Expo SDK 51+)
- All game state is local-first (SQLite via expo-sqlite + drizzle-orm), no backend server required
- Firebase Auth handles identity only; all data persistence is on-device

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5"] },
    { "id": 3, "tasks": ["1.6"] },
    { "id": 4, "tasks": ["1.7", "1.8", "1.9"] },
    { "id": 5, "tasks": ["3.1", "3.2"] },
    { "id": 6, "tasks": ["3.3", "3.4"] },
    { "id": 7, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5"] },
    { "id": 8, "tasks": ["5.6", "5.9", "9.5"] },
    { "id": 9, "tasks": ["5.7"] },
    { "id": 10, "tasks": ["5.8", "5.10", "5.11"] },
    { "id": 11, "tasks": ["7.1", "7.3"] },
    { "id": 12, "tasks": ["7.2", "7.4"] },
    { "id": 13, "tasks": ["9.1", "9.4"] },
    { "id": 14, "tasks": ["9.2", "9.3"] },
    { "id": 15, "tasks": ["9.6", "9.7"] },
    { "id": 16, "tasks": ["11.1", "11.3", "11.4", "11.5", "11.8", "11.12", "11.13"] },
    { "id": 17, "tasks": ["11.2", "11.6", "11.7", "11.9", "11.10", "11.11", "11.14"] }
  ]
}
```
