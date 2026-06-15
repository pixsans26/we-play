# Requirements Document

## Introduction

The Couples Scratch Card Game is a React Native (Expo) mobile application where two romantic partners take turns scratching virtual cards to reveal tasks or images for each other. The app features two game modes: Image Reveal (a romantic/fun image is revealed for the partner to react to) and Task Reveal (a fun couples task appears with a countdown timer). The app tracks individual scratch history per partner, implements a leveling system that unlocks new task categories, and provides a dating-app aesthetic with animations, confetti, and sound effects.

## Glossary

- **App**: The Couples Scratch Card Game React Native mobile application
- **Partner_A**: The first user who creates the couple profile and authenticates via Firebase
- **Partner_B**: The second user who links to the couple profile via Firebase authentication
- **Scratch_Card**: A virtual card with a scratchable overlay that reveals hidden content when the user performs a scratch gesture
- **Image_Mode**: The game mode where scratching reveals a romantic or fun image with a reaction prompt
- **Task_Mode**: The game mode where scratching reveals a text-based couples task with a countdown timer
- **Timer**: A countdown clock that tracks the duration allowed for completing a revealed task
- **History_Store**: The per-user record of all scratched cards stored in the local SQLite database
- **Level_System**: The progression mechanic where every 10 task completions advances the user one level
- **Task_Pool**: The static collection of text tasks and image tasks available in the app
- **Auth_System**: Firebase Authentication handling email/password and Google Sign-In
- **Local_Database**: The SQLite database managed via expo-sqlite and drizzle-orm on the device
- **Scratch_Threshold**: The percentage of card surface (60%) that must be scratched to trigger a full reveal
- **Navigation_Guard**: Logic that redirects users to appropriate screens based on authentication and profile completion state

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to create an account and log in securely, so that my game progress is tied to my identity and my partner can link to me.

#### Acceptance Criteria

1. WHEN a user submits valid email and password credentials on the login screen, THE Auth_System SHALL authenticate the user via Firebase and navigate to the main game screen
2. IF a user submits credentials that Firebase rejects on the login screen, THEN THE Auth_System SHALL display an error message indicating the reason for failure (e.g., wrong password, account not found) and remain on the login screen with the email field preserved
3. WHEN a user submits a name (1 to 50 characters), a valid-format email address, a password (minimum 8 characters), and a matching password confirmation on the sign-up screen, THE Auth_System SHALL create a new Firebase account and navigate to the profile setup screen
4. IF a user submits the sign-up form with a missing name, an invalid email format, a password shorter than 8 characters, or a password confirmation that does not match the password, THEN THE Auth_System SHALL display an inline error message identifying each failing field and remain on the sign-up screen with all entered data preserved
5. IF a user submits the sign-up form with an email address already registered in Firebase, THEN THE Auth_System SHALL display an error message indicating the email is already in use and remain on the sign-up screen with all entered data preserved
6. WHEN the App launches, THE Navigation_Guard SHALL redirect unauthenticated users to the login screen
7. WHEN the App launches and the user is authenticated, THE Navigation_Guard SHALL redirect to the main game screen
8. THE Auth_System SHALL persist authentication state across app restarts using AsyncStorage

### Requirement 2: Profile Setup and Partner Linking

**User Story:** As a user, I want to set up my profile and link with my partner, so that the game can track both of us individually.

#### Acceptance Criteria

1. IF an authenticated user does not have a couple table record with both partnerAName and partnerBName populated, THEN THE Navigation_Guard SHALL redirect to the profile setup screen before allowing access to the game
2. WHEN a user submits Step 1 of profile setup providing name (1–50 characters), age (18–120), gender, and preferences (up to 200 characters), THE App SHALL store the information in the couple table of the Local_Database with the user's Firebase UID as Partner_A
3. IF a user submits Step 1 with any field failing validation (name empty or exceeding 50 characters, age outside 18–120, gender not selected, or preferences exceeding 200 characters), THEN THE App SHALL display an error message indicating which fields are invalid and SHALL NOT proceed to Step 2
4. WHEN a user completes Step 2 of profile setup by providing a partner name (1–50 characters), THE App SHALL store the partner name in the couple table
5. WHEN Partner_B authenticates for the first time on the same device where the couple profile exists, THE App SHALL save Partner_B's Firebase UID in the couple table and initialize their user_progress record
6. WHEN a new user completes profile setup, THE App SHALL initialize a user_progress record with scratch count 0, completed count 0, and current level 1

### Requirement 3: Main Game Screen

**User Story:** As a user, I want to choose between Image Scratch and Task Scratch game modes, so that I can play the type of game I prefer.

#### Acceptance Criteria

1. THE App SHALL display two game mode selection cards on the main game screen, each showing the mode name, a brief description of the mode, and a tappable play action affordance
2. THE App SHALL display a partner header showing both partners' names and their individual scratch counts as numeric values
3. IF Partner B has not yet linked their account, THEN THE App SHALL display the partner header with Partner A's name and scratch count, and a placeholder label indicating Partner B has not joined
4. THE App SHALL display the current level number and the corresponding level badge on the main game screen
5. WHEN a user taps the Image Scratch Card, THE App SHALL navigate to the Image Scratch game screen
6. WHEN a user taps the Task Scratch Card, THE App SHALL navigate to the Task Scratch game screen
7. THE App SHALL display visible navigation controls for the History screen and Settings on the main game screen

### Requirement 4: Scratch Card Mechanic

**User Story:** As a user, I want to scratch a virtual card with my finger to reveal hidden content, so that the game feels interactive and exciting.

#### Acceptance Criteria

1. THE Scratch_Card SHALL display a glittery overlay texture that the user removes by dragging a finger across the card surface
2. WHILE the user has scratched less than 60% of the card surface, THE Scratch_Card SHALL continue displaying the remaining overlay without revealing the hidden content underneath
3. WHEN the user scratches 60% or more of the card surface, THE Scratch_Card SHALL remove all remaining overlay and fully reveal the hidden content beneath
4. WHEN the Scratch_Card triggers a full reveal, THE App SHALL play a scratch sound effect concurrently with the reveal animation
5. WHEN the Scratch_Card triggers a full reveal, THE App SHALL display a heart-shaped confetti animation with pink and red color particles for 3 seconds before automatically dismissing
6. THE Scratch_Card SHALL use a brush size of 50 pixels for the scratch gesture
7. IF the scratch sound effect fails to play, THEN THE Scratch_Card SHALL still complete the full reveal without blocking the user interaction

### Requirement 5: Image Reveal Game Mode

**User Story:** As a user, I want to scratch a card to reveal a romantic image for my partner to react to, so that we can share fun moments together.

#### Acceptance Criteria

1. WHEN the Image Scratch game screen loads, THE App SHALL select a random unseen image task from the Task_Pool at or below the user's current level
2. WHEN the user has scratched at least 60% of the Scratch_Card surface in Image_Mode, THE App SHALL trigger a heart confetti animation and display the full image, caption text, and a reaction prompt for the partner
3. WHILE the Scratch_Card has not yet been fully revealed, THE App SHALL keep the Done button disabled
4. WHEN the user taps the Done button after viewing the revealed image, THE App SHALL mark the task as completed in the History_Store, increment both the scratch count and the completed count in User_Progress, and check whether the new completed count crosses a level-up threshold of 10 completions per level
5. WHEN the user taps the Next Card button, THE App SHALL load the next unseen image task at or below the current user's level
6. IF no unseen image tasks remain for the current user at their level, THEN THE App SHALL display an empty state message indicating all images have been viewed and disable the Next Card button

### Requirement 6: Task Reveal Game Mode

**User Story:** As a user, I want to scratch a card to reveal a task for my partner to complete within a time limit, so that we can challenge each other with fun activities.

#### Acceptance Criteria

1. WHEN the Task Scratch game screen loads, THE App SHALL select a random unseen text task from the Task_Pool at or below the user's current level and present it beneath a scratch card overlay
2. WHEN the user has scratched at least 60% of the Scratch_Card surface in Task_Mode, THE App SHALL treat the card as fully revealed, display the task title, description, and a Start Timer button
3. WHILE the Scratch_Card has not yet been fully revealed, THE App SHALL display a Skip button that, when tapped, marks the task as skipped in the History_Store and loads the next unseen task without starting a timer
4. WHEN the user taps the Start Timer button, THE Timer SHALL begin counting down from the task's specified duration in seconds, and THE App SHALL hide the Skip button
5. WHILE the Timer is running, THE App SHALL display the remaining time in MM:SS format and show a Complete button allowing the user to finish early
6. WHILE the Timer has 10 seconds or fewer remaining, THE App SHALL animate the timer text with a red pulsing effect at a 1-second interval
7. WHEN the Timer reaches zero, THE App SHALL play an alarm sound effect for no longer than 3 seconds
8. WHEN the Timer reaches zero or the user taps Complete while the Timer is running, THE App SHALL mark the task as completed in the History_Store, record the elapsed time in seconds, and display a Next button
9. WHEN the user taps the Next button, THE App SHALL load the next unseen text task for the current user at or below their current level
10. WHEN the user taps the Previous button, THE App SHALL display the previously viewed task in read-only mode without allowing re-scratch or timer restart
11. IF no unseen text tasks remain for the current user at their level, THEN THE App SHALL display an empty state message indicating all tasks at the current level have been completed and hide the Next button

### Requirement 7: Skip Mechanic

**User Story:** As a user, I want to skip a revealed task before committing to it, so that I can choose tasks that suit the moment.

#### Acceptance Criteria

1. WHILE a task is revealed and the Timer has not started in Task_Mode, THE App SHALL display a Skip button
2. WHEN the user taps Skip before the Timer starts, THE App SHALL mark the task as skipped in the History_Store and load the next unseen task within 1 second
3. IF the user taps Skip and no unseen tasks remain for the current user at their unlocked level, THEN THE App SHALL display a message indicating all available tasks have been seen and remain on the current task screen without recording a skip
4. WHILE the Timer is running, THE App SHALL hide the Skip button and prevent skipping
5. WHILE the Timer has finished, THE App SHALL hide the Skip button and prevent skipping

### Requirement 8: Per-User History Tracking

**User Story:** As a user, I want my scratch history tracked separately from my partner's, so that we each get unique card experiences.

#### Acceptance Criteria

1. WHEN a user scratches a card, THE History_Store SHALL record the scratch event with the user's Firebase UID, task ID, task type (image or text), timestamp, completion status, skip status, and time taken in seconds (0 if skipped before timer start, otherwise elapsed seconds up to the task's timer duration)
2. WHEN selecting the next task for a user, THE App SHALL exclude all task IDs present in that user's History_Store regardless of completion or skip status
3. IF all tasks of the selected type at or below the user's current level have been seen by that user, THEN THE App SHALL display a message indicating no new tasks are available for that type
4. THE App SHALL allow Partner_B to receive a task that Partner_A has already seen, and vice versa, by filtering task selection only against the requesting user's own History_Store
5. WHEN a user resets their history, THE History_Store SHALL delete all records for that user's Firebase UID so that previously seen tasks become available again

### Requirement 9: Level and Milestone System

**User Story:** As a user, I want to level up by completing tasks, so that I unlock new task categories and feel a sense of progression.

#### Acceptance Criteria

1. WHEN a user completes a task, THE Level_System SHALL increment the user's completed count by 1 in user_progress and persist the updated count before presenting the next task
2. WHEN a user's completed count reaches a multiple of 10, THE Level_System SHALL advance the user's current level by 1 with no maximum level cap
3. WHEN a level-up occurs, THE App SHALL play a level-up sound effect and display a Lottie celebration animation for the duration of the animation asset (non-looping), and the user SHALL be able to dismiss or wait for the animation to complete before resuming gameplay
4. THE App SHALL display the current level badge on the main game screen according to the badge mapping: Level 1 = 🌱 New Couple, Level 2 = 💞 Getting Closer, Level 3 = 🔥 Heating Up, Level 4 = 💜 Deeply Connected, Level 5+ = 👑 Soulmates
5. THE App SHALL only present tasks from the Task_Pool where the task's level is less than or equal to the user's current level and the task has not already appeared in the user's history
6. THE Level_System SHALL unlock task categories progressively: Level 1 = romantic and fun, Level 2 = romantic and fun and playful, Level 3 = romantic and fun and playful and dare, Level 4 = romantic and fun and playful and dare and intimate, Level 5+ = all previously unlocked categories with no additional category restrictions
7. IF all eligible tasks at the user's current level and below have been completed or skipped, THEN THE App SHALL display a message indicating no new tasks are available and prompt the user to reset their history to replay tasks
8. IF the user resets their scratch history, THEN THE Level_System SHALL retain the user's current level and completed count unchanged, allowing previously seen tasks to appear again without affecting progression

### Requirement 10: History Screen

**User Story:** As a user, I want to view my scratch history and my partner's history separately, so that I can revisit past tasks and track our progress.

#### Acceptance Criteria

1. THE App SHALL display a tabbed interface on the History screen with exactly two tabs, one labeled with each partner's name, and the current user's tab selected by default
2. WHEN a user selects a partner tab, THE App SHALL display a scrollable list of that partner's scratched cards ordered by most recent scratch timestamp first
3. IF a selected partner tab has no history entries, THEN THE App SHALL display an empty-state message indicating that no cards have been scratched yet
4. THE App SHALL display each history entry with the task title (for text tasks) or image thumbnail (for image tasks), a completion status of either "completed" or "skipped", and the date and time the card was scratched
5. WHEN a user taps a history entry, THE App SHALL display the full task description or full image in read-only mode with no timer, skip, or complete actions available
6. WHEN a user taps the reset history button, THE App SHALL display a confirmation prompt before deleting that user's own scratch history

### Requirement 11: History Reset

**User Story:** As a user, I want to reset my own scratch history, so that I can replay tasks I have already seen.

#### Acceptance Criteria

1. THE App SHALL provide a Reset My History button on the History screen
2. WHEN the user taps Reset My History, THE App SHALL display a confirmation dialog that states all scratch history will be cleared and tasks will repeat, and presents a destructive Confirm option and a Cancel option
3. WHEN the user selects Cancel in the reset confirmation dialog, THE App SHALL dismiss the dialog and leave all history records unchanged
4. WHEN the user confirms the reset, THE App SHALL delete all records from the user_history table for that user's Firebase UID only
5. WHEN the user confirms the reset, THE App SHALL NOT modify the other partner's history records in the user_history table
6. WHEN the user confirms the reset, THE App SHALL NOT modify the user's currentLevel, completedCount, or scratchCount in user_progress
7. WHEN the reset completes successfully, THE App SHALL update the History screen to display an empty history list and show a confirmation indicator within 1 second
8. IF the reset operation fails, THEN THE App SHALL display an error message indicating the history could not be cleared and SHALL retain all existing history records unchanged

### Requirement 12: Static Task Data

**User Story:** As a user, I want a variety of tasks and images available across different levels and categories, so that the game remains engaging over time.

#### Acceptance Criteria

1. THE Task_Pool SHALL contain a minimum of 50 text tasks distributed across levels 1 through 5, with at least 8 text tasks per level
2. THE Task_Pool SHALL contain a minimum of 20 image tasks with captions and reaction prompts, distributed across levels 1 through 5 with at least 3 image tasks per level
3. THE Task_Pool SHALL categorize text tasks into: romantic, fun, dare, and intimate categories, with at least 5 text tasks in each category
4. WHEN a text task is defined, THE Task_Pool SHALL specify a unique task ID, title (maximum 50 characters), description (maximum 200 characters), timer duration between 30 and 300 seconds, level (integer 1 through 5), and category
5. WHEN an image task is defined, THE Task_Pool SHALL specify a unique task ID, image source, caption (maximum 100 characters), reaction prompt (maximum 200 characters), and level (integer 1 through 5)
6. THE Task_Pool SHALL assign a unique task ID to each task such that no two text tasks or image tasks share the same ID

### Requirement 13: Visual Design and Animations

**User Story:** As a user, I want the app to have a dating-app aesthetic with smooth animations, so that the experience feels polished and romantic.

#### Acceptance Criteria

1. THE App SHALL use a pink-to-purple gradient color scheme as the primary background throughout all screens
2. THE App SHALL use rounded card components (border radius 24px or greater) with glassmorphism effects (background opacity between 10% and 20%, a background blur radius of at least 10px, and a 1px semi-transparent border) for game mode cards
3. WHEN the scratch card is completed, THE App SHALL animate the reveal content with a spring scale animation from 0.5 to 1.0 scale (damping between 10 and 15, stiffness between 100 and 200) within 500 milliseconds of the scratch completion event
4. WHEN a scratch reveal occurs, THE App SHALL display heart confetti with 80 particles in pink and red color variants that fade out over 3 seconds
5. THE App SHALL use the Playfair Display font for headings and Nunito font for body text
6. IF custom fonts fail to load within 3 seconds, THEN THE App SHALL render all text using the platform default system font without blocking screen display

### Requirement 14: Sound Effects

**User Story:** As a user, I want audio feedback during key interactions, so that the game feels more immersive.

#### Acceptance Criteria

1. WHEN the scratch card scratch threshold (60% of the card area) is reached, THE App SHALL play the scratch sound effect to completion without blocking user interaction
2. WHEN the Timer reaches zero, THE App SHALL play the alarm sound effect to completion without blocking user interaction
3. WHEN a level-up occurs, THE App SHALL play the level-up celebration sound effect to completion without blocking user interaction
4. IF a sound effect fails to load or play, THEN THE App SHALL continue the current interaction without interruption and without displaying an error to the user
5. WHILE the device is in silent or muted mode, THE App SHALL respect the device audio settings and suppress sound effect playback

### Requirement 15: Local Database Persistence

**User Story:** As a user, I want my game data stored locally on my device, so that the app works offline and my progress is preserved.

#### Acceptance Criteria

1. THE Local_Database SHALL store couple profile data including both partners' UIDs, names (maximum 50 characters each), ages (integer, 18 to 120), genders, and preferences (maximum 500 characters each)
2. THE Local_Database SHALL store per-user scratch history with task ID, task type ("image" or "text"), timestamp, completion status, skip status, and time taken (in seconds, 0 to 86400), retaining up to 10000 history records per user
3. THE Local_Database SHALL store per-user progress including scratch count (integer, 0 or greater), completed count (integer, 0 or greater), and current level (integer, 1 or greater)
4. WHEN the App is launched and no Local_Database exists, THE App SHALL create the Local_Database and run all schema migrations within 5 seconds
5. THE Local_Database SHALL persist all couple profile, scratch history, and progress data across app restarts without requiring network connectivity
6. IF a Local_Database schema migration fails, THEN THE App SHALL display an error message indicating the migration failure and prevent access to game features until the migration succeeds on a subsequent launch
7. IF a Local_Database write operation fails, THEN THE App SHALL display an error message indicating the data could not be saved and SHALL NOT update in-memory state to reflect the failed write

### Requirement 16: Navigation Structure

**User Story:** As a user, I want clear navigation between screens based on my authentication and profile state, so that I always land on the appropriate screen.

#### Acceptance Criteria

1. THE App SHALL use file-based routing via Expo Router v3 with three route groups: auth, onboarding, and game
2. WHEN an unauthenticated user accesses any game or onboarding route, THE Navigation_Guard SHALL redirect to the login screen within 500 milliseconds of route access
3. WHEN an authenticated user whose couple table row is missing or whose partnerAName field is empty accesses a game route, THE Navigation_Guard SHALL redirect to the profile setup screen within 500 milliseconds of route access
4. WHEN an authenticated user with a completed profile (a couple table row exists with a non-empty partnerAName for the current user) accesses an auth route, THE Navigation_Guard SHALL redirect to the main game screen within 500 milliseconds of route access
5. WHILE the authentication state is loading (Firebase auth session not yet resolved), THE App SHALL display a loading indicator and SHALL NOT render any route group content until the auth state is determined

### Requirement 17: Game Assignment Rules

**User Story:** As a user, I want to scratch a card to assign the revealed task to my partner, so that the game creates a turn-based dynamic between us.

#### Acceptance Criteria

1. WHEN Partner_A scratches a card and the scratch reaches at least 60% coverage, THE App SHALL assign the revealed task or image reaction to Partner_B for performance and record the scratch event against Partner_A's history
2. WHEN Partner_B scratches a card and the scratch reaches at least 60% coverage, THE App SHALL assign the revealed task or image reaction to Partner_A for performance and record the scratch event against Partner_B's history
3. WHEN a scratch is completed, THE App SHALL display the performing partner's name within 1 second, indicating they must perform the revealed task
4. IF a user attempts to scratch a card and Partner_B has not yet been linked to the couple profile, THEN THE App SHALL prevent the scratch and display a message indicating that a partner must be linked before playing
5. THE App SHALL allow either partner to scratch a card regardless of who scratched last
