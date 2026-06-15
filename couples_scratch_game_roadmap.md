# 💑 Couples Scratch Card Game — React Native App Roadmap

> A complete, step-by-step technical blueprint to build the Couples Scratch Card Game app using React Native, NativeWind (Tailwind CSS), Firebase Auth, and a local PostgreSQL database.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Database Schema](#4-database-schema)
5. [Static Task Data](#5-static-task-data)
6. [Firebase Authentication Setup](#6-firebase-authentication-setup)
7. [Screen-by-Screen Build Plan](#7-screen-by-screen-build-plan)
8. [Core Components](#8-core-components)
9. [Game Logic & State Management](#9-game-logic--state-management)
10. [UI Design System (Dating App Aesthetic)](#10-ui-design-system-dating-app-aesthetic)
11. [Animations & Effects](#11-animations--effects)
12. [Milestone & Level System](#12-milestone--level-system)
13. [Timer & Sound System](#13-timer--sound-system)
14. [History System](#14-history-system)
15. [Build Phases & Timeline](#15-build-phases--timeline)
16. [Dependencies Reference](#16-dependencies-reference)

---

## 1. Project Overview

### What the App Does

Two partners (Person A and Person B) take turns scratching virtual cards. When Person A scratches a card:

- **Game Mode 1 — Image Reveal**: A romantic/fun image is revealed; Person B must react or perform a related act.
- **Game Mode 2 — Task Reveal**: A fun couple's task appears; Person B must complete it within a timer.

Scratch history is tracked **individually** — a card seen by Person A will not repeat for Person A, but Person B can still get it (and vice versa). Completion advances the milestone counter, and every 10 completions increases the couple's level.

### Core Rules Summary

| Rule | Detail |
|------|--------|
| Who scratches | The card is scratched by the person who must **assign** the task to their partner |
| Who performs | The **other** person performs the revealed task |
| History scope | Per-person — not shared |
| Skip | Only before the timer starts |
| Skip after timer | Not allowed |
| Task repeat prevention | Per-person tracking against `user_history` |
| Level up | Every 10 task completions |
| Reset | User can reset their own history |

---

## 2. Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | React Native (Expo SDK 51+) | Cross-platform mobile |
| Styling | NativeWind v4 (Tailwind CSS in RN) | Utility-first, dating-app UI |
| Auth | Firebase Auth (Email/Password + Google) | Fast, reliable partner login |
| Local DB | PostgreSQL via `expo-sqlite` + `drizzle-orm` | Offline-first, no backend needed |
| Navigation | Expo Router (file-based, v3) | Clean stack/tab navigation |
| Animations | `react-native-reanimated` v3 | Smooth scratch & confetti |
| Scratch Card | `react-native-scratch-card` | Canvas-based scratch gesture |
| Confetti | `react-native-confetti-cannon` | Heart particle burst |
| Sound | `expo-av` | Timer alarm & UI sounds |
| State | Zustand | Lightweight global store |
| Icons | `@expo/vector-icons` (Ionicons) | Built-in Expo icon set |
| Lottie | `lottie-react-native` | Celebration animations |

> **Note on PostgreSQL "local":** React Native cannot run a full PostgreSQL server. The correct approach is `expo-sqlite` which gives you a SQL-based embedded database on the device. `drizzle-orm` provides a Postgres-like typed query API on top of SQLite. This achieves the intent of "local Postgres" on mobile.

---

## 3. Folder Structure

```
couples-scratch-game/
├── app/                          # Expo Router screens
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── _layout.tsx
│   ├── (onboarding)/
│   │   ├── profile-setup.tsx
│   │   └── _layout.tsx
│   ├── (game)/
│   │   ├── index.tsx             # Main screen (game mode selection)
│   │   ├── image-scratch.tsx     # Game Mode 1
│   │   ├── task-scratch.tsx      # Game Mode 2
│   │   ├── history.tsx           # Scratch history viewer
│   │   └── _layout.tsx
│   ├── _layout.tsx               # Root layout (Firebase + DB init)
│   └── index.tsx                 # Entry redirect
│
├── components/
│   ├── ScratchCard/
│   │   ├── ScratchCard.tsx       # Core scratch component
│   │   ├── CardReveal.tsx        # Post-scratch reveal
│   │   └── CardBack.tsx          # Pre-scratch card UI
│   ├── TaskCard/
│   │   ├── TaskCard.tsx          # Task display
│   │   ├── TaskTimer.tsx         # Countdown timer
│   │   └── TaskControls.tsx      # Skip / Next / Previous buttons
│   ├── Confetti/
│   │   └── HeartConfetti.tsx     # Heart particle burst
│   ├── Partner/
│   │   ├── PartnerHeader.tsx     # Person A | Person B top bar
│   │   └── ScoreChip.tsx         # Individual scratch count
│   ├── Milestone/
│   │   └── LevelBadge.tsx        # Level display
│   └── UI/
│       ├── GradientButton.tsx
│       ├── FloatingCard.tsx
│       └── AnimatedInput.tsx
│
├── db/
│   ├── schema.ts                  # Drizzle schema definitions
│   ├── migrations/               # Auto-generated migrations
│   └── client.ts                 # DB connection singleton
│
├── store/
│   ├── authStore.ts              # Firebase user + partner state
│   ├── gameStore.ts              # Active game, timer, current card
│   └── historyStore.ts           # Scratch history cache
│
├── data/
│   ├── imageTasks.ts             # Static image reveal data (Mode 1)
│   └── textTasks.ts              # Static text task data (Mode 2)
│
├── hooks/
│   ├── useTimer.ts               # Timer logic hook
│   ├── useScratchHistory.ts      # History read/write hook
│   ├── useMilestone.ts           # Level & milestone logic
│   └── useSound.ts               # Sound playback hook
│
├── lib/
│   ├── firebase.ts               # Firebase app init
│   └── notifications.ts          # Local push (optional)
│
├── assets/
│   ├── sounds/
│   │   ├── alarm.mp3
│   │   ├── scratch.mp3
│   │   └── level-up.mp3
│   └── images/
│       └── card-backs/
│
├── tailwind.config.js
├── app.json
├── drizzle.config.ts
└── package.json
```

---

## 4. Database Schema

```typescript
// db/schema.ts — using drizzle-orm with expo-sqlite

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Couple profile (one row per device/couple)
export const couple = sqliteTable("couple", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  partnerAUid: text("partner_a_uid").notNull(),      // Firebase UID
  partnerBUid: text("partner_b_uid"),                // Set after partner links
  partnerAName: text("partner_a_name").notNull(),
  partnerBName: text("partner_b_name"),
  partnerAAge: integer("partner_a_age"),
  partnerBAge: integer("partner_b_age"),
  partnerAGender: text("partner_a_gender"),
  partnerBGender: text("partner_b_gender"),
  whatALikes: text("what_a_likes"),
  whatBLikes: text("what_b_likes"),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

// Per-user scratch history
export const userHistory = sqliteTable("user_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userUid: text("user_uid").notNull(),               // Firebase UID of scratcher
  taskId: text("task_id").notNull(),                  // From static data
  taskType: text("task_type").notNull(),              // 'image' | 'text'
  scratchedAt: integer("scratched_at", { mode: "timestamp" }),
  completed: integer("completed", { mode: "boolean" }).default(false),
  skipped: integer("skipped", { mode: "boolean" }).default(false),
  timeTaken: real("time_taken"),                      // seconds
});

// Milestone / level tracking per user
export const userProgress = sqliteTable("user_progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userUid: text("user_uid").notNull().unique(),
  scratchCount: integer("scratch_count").default(0),
  completedCount: integer("completed_count").default(0),
  currentLevel: integer("current_level").default(1),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
```

### DB Client Setup

```typescript
// db/client.ts
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as SQLite from "expo-sqlite";
import * as schema from "./schema";

const sqlite = SQLite.openDatabaseSync("couples_game.db");
export const db = drizzle(sqlite, { schema });
```

### Running Migrations

```bash
npx drizzle-kit generate
npx drizzle-kit migrate  # or use expo-drizzle-studio-plugin for dev
```

---

## 5. Static Task Data

### Mode 2 — Text Tasks (Sample)

```typescript
// data/textTasks.ts

export type Task = {
  id: string;
  title: string;
  description: string;
  timerSeconds: number;    // duration for this task
  level: number;           // unlocks at this level
  category: "romantic" | "fun" | "dare" | "intimate";
};

export const TEXT_TASKS: Task[] = [
  // Level 1 (unlocked from start)
  {
    id: "t001",
    title: "Whisper Something Sweet",
    description: "Whisper the most romantic thing you can think of in your partner's ear.",
    timerSeconds: 60,
    level: 1,
    category: "romantic",
  },
  {
    id: "t002",
    title: "Forehead Kiss Sequence",
    description: "Give your partner 5 forehead kisses, one per 10 seconds, while saying something kind each time.",
    timerSeconds: 60,
    level: 1,
    category: "romantic",
  },
  {
    id: "t003",
    title: "The Appreciation Shower",
    description: "List 5 things you love about your partner without stopping or repeating.",
    timerSeconds: 90,
    level: 1,
    category: "romantic",
  },
  {
    id: "t004",
    title: "Dance Break",
    description: "Dance together to any song you both love. No stopping for the full timer!",
    timerSeconds: 120,
    level: 1,
    category: "fun",
  },
  {
    id: "t005",
    title: "Staring Contest",
    description: "Look into each other's eyes without blinking or laughing. First to blink gives a cheek kiss.",
    timerSeconds: 60,
    level: 1,
    category: "fun",
  },
  // Level 2
  {
    id: "t006",
    title: "Massage Minute",
    description: "Give your partner a shoulder massage for the full duration. No talking allowed!",
    timerSeconds: 60,
    level: 2,
    category: "romantic",
  },
  {
    id: "t007",
    title: "Cook Together Challenge",
    description: "Make any snack together using only ingredients already in the kitchen.",
    timerSeconds: 300,
    level: 2,
    category: "fun",
  },
  {
    id: "t008",
    title: "Write a Poem",
    description: "Write a mini 4-line poem about your partner and read it aloud.",
    timerSeconds: 180,
    level: 2,
    category: "romantic",
  },
  {
    id: "t009",
    title: "Blindfold Feed",
    description: "Blindfold your partner and feed them 3 snacks they have to guess.",
    timerSeconds: 120,
    level: 2,
    category: "fun",
  },
  {
    id: "t010",
    title: "Mimicry Act",
    description: "Mimic your partner's signature gesture or phrase. They rate your accuracy out of 10.",
    timerSeconds: 60,
    level: 2,
    category: "fun",
  },
  // Level 3 — more playful / intimate
  {
    id: "t011",
    title: "Love Letter Draft",
    description: "Draft a 5-sentence love letter to your partner. Read it to them after the timer.",
    timerSeconds: 180,
    level: 3,
    category: "romantic",
  },
  {
    id: "t012",
    title: "Couple Selfie Sequence",
    description: "Take 5 couple selfies in 5 different poses in the time limit. Vote on the best one!",
    timerSeconds: 120,
    level: 3,
    category: "fun",
  },
  {
    id: "t013",
    title: "Re-live a Memory",
    description: "Describe your favourite memory together in detail. Include where, when, and how you felt.",
    timerSeconds: 120,
    level: 3,
    category: "intimate",
  },
  {
    id: "t014",
    title: "Truth Time",
    description: "Answer any one question your partner asks — completely honestly.",
    timerSeconds: 90,
    level: 3,
    category: "dare",
  },
  {
    id: "t015",
    title: "Hug Timer",
    description: "Hold each other in a hug for the entire duration. No breaking early!",
    timerSeconds: 60,
    level: 3,
    category: "romantic",
  },
  // Add more to reach 50+ tasks across all levels...
];
```

### Mode 1 — Image Tasks (Sample)

```typescript
// data/imageTasks.ts

export type ImageTask = {
  id: string;
  imageUrl: string;          // local asset or CDN URL
  caption: string;
  reactionPrompt: string;    // what the other person should do/say
  level: number;
};

export const IMAGE_TASKS: ImageTask[] = [
  {
    id: "i001",
    imageUrl: require("../assets/images/tasks/roses.png"),
    caption: "Roses for you 🌹",
    reactionPrompt: "Say something sweet and give a hug!",
    level: 1,
  },
  {
    id: "i002",
    imageUrl: require("../assets/images/tasks/sunset.png"),
    caption: "Our next date spot 🌅",
    reactionPrompt: "Plan a date to a similar location right now!",
    level: 1,
  },
  // ...add 20+ image tasks
];
```

---

## 6. Firebase Authentication Setup

### Firebase Config

```typescript
// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
```

### Auth Store (Zustand)

```typescript
// store/authStore.ts
import { create } from "zustand";
import { User } from "firebase/auth";

interface AuthState {
  userA: User | null;
  userB: User | null;
  isPartnerA: boolean;          // Is the current device Person A?
  setUserA: (u: User | null) => void;
  setUserB: (u: User | null) => void;
  setIsPartnerA: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userA: null,
  userB: null,
  isPartnerA: true,
  setUserA: (u) => set({ userA: u }),
  setUserB: (u) => set({ userB: u }),
  setIsPartnerA: (v) => set({ isPartnerA: v }),
}));
```

> **Partner linking strategy:** Since this is a local-first app, both partners share the same device OR each partner logs into their Firebase account on their own device. The local SQLite DB stores both UIDs. When Person B logs in for the first time, their UID is saved as `partnerBUid` in the `couple` table.

---

## 7. Screen-by-Screen Build Plan

### Screen 1: Splash / Entry (`app/index.tsx`)

**Purpose:** Redirect to login if unauthenticated, or to main game screen if both partners are set up.

```tsx
// app/index.tsx
import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/authStore";

export default function Entry() {
  const { userA } = useAuthStore();
  if (!userA) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(game)" />;
}
```

---

### Screen 2: Login (`app/(auth)/login.tsx`)

**UI Elements:**
- Large gradient background (pink → purple — dating app palette)
- App logo with floating heart animation
- Email & Password inputs (NativeWind styled, rounded-2xl)
- "Login" button — gradient pill button
- "Don't have an account? Sign Up" link
- Optional: Google Sign-In button

**Firebase Logic:**
```tsx
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

const handleLogin = async () => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // Check DB for existing profile → route accordingly
  } catch (e) {
    setError("Invalid credentials. Try again 💔");
  }
};
```

---

### Screen 3: Sign Up (`app/(auth)/signup.tsx`)

**UI Elements:**
- Same aesthetic as login
- Name, Email, Password, Confirm Password fields
- "Create Account" gradient button
- On success → navigate to Profile Setup

---

### Screen 4: Profile Setup (`app/(onboarding)/profile-setup.tsx`)

**Two-step form:**

**Step 1 — Your Info:**
- Your name (text input)
- Age (numeric input)
- Gender (segmented pill selector: Male / Female / Non-binary / Other)
- "What you like most" (multi-line text area — e.g., "cuddles, coffee, sunsets")

**Step 2 — Partner Info:**
- Partner's name
- (Partner's age & gender filled in when they log in on their device)

**On Submit:**
```tsx
// Insert into couple table via drizzle
await db.insert(couple).values({
  partnerAUid: user.uid,
  partnerAName: name,
  partnerAAge: age,
  partnerAGender: gender,
  whatALikes: likes,
  createdAt: new Date(),
});
// Also insert into userProgress
await db.insert(userProgress).values({
  userUid: user.uid,
  scratchCount: 0,
  completedCount: 0,
  currentLevel: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

---

### Screen 5: Main Game Screen (`app/(game)/index.tsx`)

**Layout:**

```
┌─────────────────────────────────────────┐
│  ❤️  COUPLES GAME             Level 3 ✨ │
│─────────────────────────────────────────│
│  [💃 Priya  ×14]    [🕺 Arjun  ×11]     │  ← PartnerHeader
│─────────────────────────────────────────│
│                                         │
│   ┌────────────────────────────────┐    │
│   │  🖼️  IMAGE SCRATCH CARD        │    │
│   │   Reveal a romantic image for  │    │
│   │   your partner to react to!    │    │
│   │                    [PLAY →]    │    │
│   └────────────────────────────────┘    │
│                                         │
│   ┌────────────────────────────────┐    │
│   │  ✏️  TASK SCRATCH CARD          │    │
│   │   Scratch to reveal a fun      │    │
│   │   couples task with a timer!   │    │
│   │                    [PLAY →]    │    │
│   └────────────────────────────────┘    │
│                                         │
│   [📜 View History]   [⚙️ Settings]      │
└─────────────────────────────────────────┘
```

---

### Screen 6: Image Scratch Game (`app/(game)/image-scratch.tsx`)

**Flow:**
1. Show scratch card back with glittery texture
2. User scratches → heart confetti burst → image reveals
3. Caption and `reactionPrompt` appear below
4. [✅ Done] → marks task complete, increments scratch count
5. Milestone check → level up animation if threshold hit
6. [⏭️ Next Card] → picks next unseen image for this user

---

### Screen 7: Task Scratch Game (`app/(game)/task-scratch.tsx`)

**Flow:**
1. Show scratch card back
2. User scratches → heart confetti → task title + description reveal
3. [▶️ Start Timer] button appears (Skip allowed before this)
4. Timer starts → countdown displays → sweet alarm on end
5. After timer: [✅ Complete] or auto-advance after 3s
6. [⏭️ Next] → picks next unseen task for this user
7. [⏮️ Previous] → shows last seen task (view only, no re-scratch)

**Skip Logic:**
```tsx
const [timerStarted, setTimerStarted] = useState(false);

// Skip is only possible before timer starts
const canSkip = !timerStarted;

const handleSkip = async () => {
  if (!canSkip) return; // silently ignore
  await logHistory({ taskId, skipped: true, completed: false });
  loadNextTask();
};
```

---

### Screen 8: History (`app/(game)/history.tsx`)

**Layout:**
- Tab toggle: "Person A" | "Person B"
- FlatList of scratched cards showing thumbnail / task title
- Tapping opens full task/image view (read-only)
- [🗑️ Reset My History] button with confirmation modal

---

## 8. Core Components

### ScratchCard Component

```tsx
// components/ScratchCard/ScratchCard.tsx
import ScratchCardLib from "react-native-scratch-card";
import { useRef, useState } from "react";
import { Animated } from "react-native";
import HeartConfetti from "@/components/Confetti/HeartConfetti";

interface Props {
  onScratched: () => void;
  children: React.ReactNode;  // The revealed content underneath
}

export function ScratchCard({ onScratched, children }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleScratchComplete = () => {
    if (!revealed) {
      setRevealed(true);
      setShowConfetti(true);
      onScratched();
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  return (
    <>
      {showConfetti && <HeartConfetti />}
      <ScratchCardLib
        brushSize={50}
        thresholdForCompletion={0.6}       // 60% scratched = full reveal
        onScratchComplete={handleScratchComplete}
        overlayImage={require("@/assets/images/card-back-glitter.png")}
        style={{ borderRadius: 24 }}
      >
        {children}
      </ScratchCardLib>
    </>
  );
}
```

### Heart Confetti

```tsx
// components/Confetti/HeartConfetti.tsx
import ConfettiCannon from "react-native-confetti-cannon";
import { useRef } from "react";

export function HeartConfetti() {
  const cannon = useRef<ConfettiCannon>(null);

  return (
    <ConfettiCannon
      ref={cannon}
      count={80}
      origin={{ x: -10, y: 0 }}
      autoStart={true}
      fadeOut={true}
      colors={["#FF6B9D", "#FF4081", "#E91E8C", "#FF8FAB", "#C71585"]}
      // Custom heart emoji particles via renderItem
    />
  );
}
```

### Partner Header

```tsx
// components/Partner/PartnerHeader.tsx
import { View, Text } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@/hooks/useProgress";

export function PartnerHeader() {
  const { userA, userB } = useAuthStore();
  const progressA = useQuery(userA?.uid);
  const progressB = useQuery(userB?.uid);

  return (
    <View className="flex-row justify-between items-center px-6 py-3 bg-white/10 rounded-2xl mx-4">
      <ScoreChip
        name={progressA?.name ?? "Partner A"}
        count={progressA?.scratchCount ?? 0}
        emoji="💃"
        active={true}
      />
      <Text className="text-white/50 text-lg">vs</Text>
      <ScoreChip
        name={progressB?.name ?? "Partner B"}
        count={progressB?.scratchCount ?? 0}
        emoji="🕺"
        active={false}
      />
    </View>
  );
}
```

---

## 9. Game Logic & State Management

### Game Store (Zustand)

```typescript
// store/gameStore.ts
import { create } from "zustand";
import { Task } from "@/data/textTasks";
import { ImageTask } from "@/data/imageTasks";

interface GameState {
  mode: "image" | "text" | null;
  currentTask: Task | ImageTask | null;
  previousTask: Task | ImageTask | null;
  timerStarted: boolean;
  timerFinished: boolean;
  isScratched: boolean;

  setMode: (m: "image" | "text") => void;
  setCurrentTask: (t: Task | ImageTask) => void;
  setPreviousTask: (t: Task | ImageTask | null) => void;
  setTimerStarted: (v: boolean) => void;
  setTimerFinished: (v: boolean) => void;
  setIsScratched: (v: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  mode: null,
  currentTask: null,
  previousTask: null,
  timerStarted: false,
  timerFinished: false,
  isScratched: false,

  setMode: (m) => set({ mode: m }),
  setCurrentTask: (t) => set({ currentTask: t }),
  setPreviousTask: (t) => set({ previousTask: t }),
  setTimerStarted: (v) => set({ timerStarted: v }),
  setTimerFinished: (v) => set({ timerFinished: v }),
  setIsScratched: (v) => set({ isScratched: v }),
  reset: () => set({
    currentTask: null,
    timerStarted: false,
    timerFinished: false,
    isScratched: false,
  }),
}));
```

### Task Selection Logic

```typescript
// hooks/useScratchHistory.ts

import { db } from "@/db/client";
import { userHistory } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { TEXT_TASKS, Task } from "@/data/textTasks";

export function useScratchHistory() {

  // Get IDs already seen by this user for a given task type
  const getSeenIds = async (userUid: string, taskType: "text" | "image") => {
    const rows = await db
      .select({ taskId: userHistory.taskId })
      .from(userHistory)
      .where(
        and(
          eq(userHistory.userUid, userUid),
          eq(userHistory.taskType, taskType)
        )
      );
    return rows.map((r) => r.taskId);
  };

  // Pick next unseen task for this user at their current level
  const getNextTask = async (
    userUid: string,
    taskType: "text",
    currentLevel: number
  ): Promise<Task | null> => {
    const seenIds = await getSeenIds(userUid, taskType);
    const eligible = TEXT_TASKS.filter(
      (t) => t.level <= currentLevel && !seenIds.includes(t.id)
    );
    if (eligible.length === 0) return null; // All tasks seen!
    const idx = Math.floor(Math.random() * eligible.length);
    return eligible[idx];
  };

  // Log a scratch event
  const logScratch = async (
    userUid: string,
    taskId: string,
    taskType: "text" | "image",
    completed: boolean,
    skipped: boolean,
    timeTaken?: number
  ) => {
    await db.insert(userHistory).values({
      userUid,
      taskId,
      taskType,
      scratchedAt: new Date(),
      completed,
      skipped,
      timeTaken: timeTaken ?? null,
    });
  };

  // Reset history for a user
  const resetHistory = async (userUid: string) => {
    await db
      .delete(userHistory)
      .where(eq(userHistory.userUid, userUid));
  };

  return { getNextTask, logScratch, resetHistory, getSeenIds };
}
```

---

## 10. UI Design System (Dating App Aesthetic)

### Colour Palette (NativeWind + Tailwind Config)

```javascript
// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{tsx,ts}", "./components/**/*.{tsx,ts}"],
  theme: {
    extend: {
      colors: {
        love: {
          50:  "#fff0f6",
          100: "#ffd6e7",
          200: "#ffadd2",
          300: "#ff85bf",
          400: "#f759aa",   // primary pink
          500: "#eb2f96",   // deep pink (CTAs)
          600: "#c41d7f",
          700: "#9e1068",
          800: "#780650",
          900: "#520339",
        },
        passion: {
          400: "#ff7875",
          500: "#ff4d4f",   // red accent
          600: "#f5222d",
        },
        night: {
          800: "#1a0a2e",   // dark purple background
          900: "#0d0515",   // deep dark
        },
        blush: "#fff0f6",
        gold: "#ffd700",
      },
      fontFamily: {
        display: ["PlayfairDisplay_700Bold"],
        body: ["Nunito_400Regular"],
        bodyBold: ["Nunito_700Bold"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
    },
  },
  plugins: [],
};
```

### Global Background Gradient

```tsx
// components/UI/AppBackground.tsx
import { LinearGradient } from "expo-linear-gradient";

export function AppBackground({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient
      colors={["#1a0a2e", "#3d1053", "#6b2177", "#eb2f96"]}
      locations={[0, 0.4, 0.75, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ flex: 1 }}
    >
      {children}
    </LinearGradient>
  );
}
```

### Typography

```tsx
// Load in app/_layout.tsx
import {
  useFonts,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import {
  Nunito_400Regular,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";
```

### Card Design System

| Component | Background | Border | Radius | Shadow |
|-----------|-----------|--------|--------|--------|
| Game Mode Card | white/10 backdrop-blur | 1px white/20 | rounded-3xl | shadow-love-500/30 |
| Scratch Card | glitter texture PNG | none | rounded-3xl | elevation-8 |
| Task Card | white | none | rounded-2xl | shadow-md |
| Partner Header | white/10 | none | rounded-2xl | none |
| Level Badge | gold gradient | none | rounded-full | shadow-gold/40 |

---

## 11. Animations & Effects

### Scratch Reveal Animation

```tsx
// On card scratched, animate the reveal content in:
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  withSequence,
  withDelay,
} from "react-native-reanimated";

const scale = useSharedValue(0.5);
const opacity = useSharedValue(0);

const onScratched = () => {
  scale.value = withSpring(1, { damping: 12, stiffness: 150 });
  opacity.value = withDelay(200, withSpring(1));
};

const revealStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
  opacity: opacity.value,
}));
```

### Card Flip (Pre-scratch → Post-scratch)

```tsx
// Rotate Y 0 → 180 to flip card face
const rotateY = useSharedValue(0);

const flipCard = () => {
  rotateY.value = withSpring(180, { damping: 15 });
};

const frontStyle = useAnimatedStyle(() => ({
  transform: [{ rotateY: `${rotateY.value}deg` }],
  backfaceVisibility: "hidden",
}));
```

### Level-Up Celebration

```tsx
// Use Lottie animation + sound on level up
import LottieView from "lottie-react-native";

{showLevelUp && (
  <LottieView
    source={require("@/assets/animations/level-up.json")}
    autoPlay
    loop={false}
    onAnimationFinish={() => setShowLevelUp(false)}
    style={StyleSheet.absoluteFillObject}
  />
)}
```

---

## 12. Milestone & Level System

```typescript
// hooks/useMilestone.ts

const TASKS_PER_LEVEL = 10;

export function useMilestone() {

  const checkLevelUp = async (userUid: string) => {
    const progress = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userUid, userUid))
      .get();

    if (!progress) return { leveledUp: false, newLevel: 1 };

    const newCompleted = progress.completedCount + 1;
    const newLevel = Math.floor(newCompleted / TASKS_PER_LEVEL) + 1;
    const leveledUp = newLevel > progress.currentLevel;

    await db
      .update(userProgress)
      .set({
        completedCount: newCompleted,
        scratchCount: progress.scratchCount + 1,
        currentLevel: newLevel,
        updatedAt: new Date(),
      })
      .where(eq(userProgress.userUid, userUid));

    return { leveledUp, newLevel };
  };

  return { checkLevelUp, TASKS_PER_LEVEL };
}
```

### Level Badges

| Level | Badge | Unlocked Tasks |
|-------|-------|---------------|
| 1 | 🌱 New Couple | Starter tasks (Romantic, Fun) |
| 2 | 💞 Getting Closer | + Playful tasks |
| 3 | 🔥 Heating Up | + Dare tasks |
| 4 | 💜 Deeply Connected | + Intimate tasks |
| 5+ | 👑 Soulmates | All tasks + bonus |

---

## 13. Timer & Sound System

### Timer Hook

```typescript
// hooks/useTimer.ts
import { useState, useEffect, useRef } from "react";

export function useTimer(initialSeconds: number) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          setIsRunning(false);
          setIsFinished(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [isRunning]);

  const start = () => {
    setIsRunning(true);
    setIsFinished(false);
  };

  const reset = () => {
    clearInterval(intervalRef.current!);
    setIsRunning(false);
    setIsFinished(false);
    setTimeLeft(initialSeconds);
  };

  const formattedTime = `${Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`;

  return { timeLeft, isRunning, isFinished, start, reset, formattedTime };
}
```

### Sound Hook

```typescript
// hooks/useSound.ts
import { Audio } from "expo-av";

export function useSound() {
  const playAlarm = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require("@/assets/sounds/alarm.mp3")
    );
    await sound.playAsync();
  };

  const playScratch = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require("@/assets/sounds/scratch.mp3")
    );
    await sound.playAsync();
  };

  const playLevelUp = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require("@/assets/sounds/level-up.mp3")
    );
    await sound.playAsync();
  };

  return { playAlarm, playScratch, playLevelUp };
}
```

### Timer Display Component

```tsx
// components/TaskCard/TaskTimer.tsx
import Animated, { useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

// The last 10 seconds → text pulses red
const isUrgent = timeLeft <= 10 && isRunning;

return (
  <View className="items-center mt-6">
    <Animated.Text
      className={`text-5xl font-display ${isUrgent ? "text-red-400" : "text-white"}`}
    >
      {formattedTime}
    </Animated.Text>
    <Text className="text-white/60 text-sm mt-1">seconds remaining</Text>
  </View>
);
```

---

## 14. History System

### History Screen Layout

```tsx
// app/(game)/history.tsx

const [activeTab, setActiveTab] = useState<"A" | "B">("A");

// Fetch history from DB
const historyA = await db
  .select()
  .from(userHistory)
  .where(eq(userHistory.userUid, partnerAUid))
  .orderBy(desc(userHistory.scratchedAt));

// UI
<View className="flex-row bg-white/10 rounded-full p-1 mx-4">
  <TabPill label={`💃 ${partnerAName}`} active={activeTab === "A"}
    onPress={() => setActiveTab("A")} />
  <TabPill label={`🕺 ${partnerBName}`} active={activeTab === "B"}
    onPress={() => setActiveTab("B")} />
</View>

<FlatList
  data={activeTab === "A" ? historyA : historyB}
  renderItem={({ item }) => <HistoryCard item={item} />}
  keyExtractor={(item) => item.id.toString()}
/>
```

### Reset History Confirmation

```tsx
const handleReset = () => {
  Alert.alert(
    "Reset History? 🗑️",
    `This will clear all of ${partnerAName}'s scratch history. Tasks will repeat again.`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          await resetHistory(partnerAUid);
          // Refetch history
        },
      },
    ]
  );
};
```

---

## 15. Build Phases & Timeline

### Phase 1 — Foundation (Week 1–2)

| Task | Description |
|------|-------------|
| Project init | `npx create-expo-app couples-game --template expo-router` |
| Install deps | NativeWind, Drizzle, Firebase, Reanimated, etc. |
| DB schema | Define schema, run first migration |
| Firebase setup | Create Firebase project, enable Email/Password auth |
| Auth screens | Login + Signup screens with Firebase |
| Auth store | Zustand store wired to Firebase `onAuthStateChanged` |

### Phase 2 — Onboarding & Profile (Week 2–3)

| Task | Description |
|------|-------------|
| Profile setup screen | Two-step form, save to SQLite via Drizzle |
| Partner detection | On second login, match/link Partner B UID |
| Navigation guards | Redirect to profile setup if incomplete |
| Partner header | Component showing both names + scratch counts |

### Phase 3 — Core Game (Week 3–5)

| Task | Description |
|------|-------------|
| Main game screen | Two mode cards with navigation |
| Scratch card component | Integrate `react-native-scratch-card` |
| Heart confetti | `react-native-confetti-cannon` on scratch |
| Image reveal mode | Full image reveal flow + reaction prompt |
| Task reveal mode | Task card with Start Timer / Skip buttons |
| Timer component | Countdown with urgent pulse + sound alarm |
| History logging | Write to DB after each scratch |
| Next/previous task | Navigation between tasks using history |

### Phase 4 — Gamification (Week 5–6)

| Task | Description |
|------|-------------|
| Milestone tracking | `useMilestone` hook + `userProgress` updates |
| Level up animation | Lottie animation + sound on level up |
| Level badge display | LevelBadge component on main screen |
| Task level gating | Only show tasks ≤ current level |

### Phase 5 — History & Polish (Week 6–7)

| Task | Description |
|------|-------------|
| History screen | Tabbed A/B history FlatList |
| Reset history | Confirmation dialog + DB delete |
| Dark/light theme | NativeWind dark variant support |
| Haptics | `expo-haptics` on scratch, button presses |
| Splash screen | Custom animated splash with logo |
| Error handling | Empty states, no-more-tasks state |

### Phase 6 — QA & Launch (Week 7–8)

| Task | Description |
|------|-------------|
| Device testing | Android + iOS physical device testing |
| Sound integration | Finalize all audio assets |
| Add more tasks | Expand static data to 50+ tasks per mode |
| Accessibility | Minimum touch targets, contrast |
| EAS Build | Configure `eas.json`, build APK for Android |
| App Store prep | Icons, screenshots, store description |

---

## 16. Dependencies Reference

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "expo-sqlite": "~14.0.0",
    "expo-av": "~14.0.0",
    "expo-haptics": "~13.0.0",
    "expo-linear-gradient": "~13.0.0",
    "firebase": "^10.12.0",
    "@react-native-async-storage/async-storage": "^1.23.1",
    "drizzle-orm": "^0.31.0",
    "nativewind": "^4.0.1",
    "react-native-reanimated": "~3.10.0",
    "react-native-gesture-handler": "~2.16.0",
    "react-native-scratch-card": "^1.2.0",
    "react-native-confetti-cannon": "^1.5.2",
    "lottie-react-native": "^6.7.0",
    "zustand": "^4.5.2",
    "@expo-google-fonts/playfair-display": "^0.2.3",
    "@expo-google-fonts/nunito": "^0.2.3",
    "@expo/vector-icons": "^14.0.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.22.0",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.3.0"
  }
}
```

### Install Command

```bash
npx create-expo-app couples-game --template expo-router
cd couples-game
npx expo install expo-sqlite expo-av expo-haptics expo-linear-gradient
npx expo install react-native-reanimated react-native-gesture-handler
npm install nativewind tailwindcss drizzle-orm drizzle-kit
npm install firebase @react-native-async-storage/async-storage
npm install zustand lottie-react-native
npm install react-native-scratch-card react-native-confetti-cannon
npx expo install @expo-google-fonts/playfair-display @expo-google-fonts/nunito
```

---

## Quick Reference: Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| "Postgres local" | `expo-sqlite` + `drizzle-orm` | Only SQL DB that runs on device; Drizzle gives Postgres-like API |
| Auth | Firebase Email/Password | Handles token refresh, persistence, partner linking |
| Styling | NativeWind v4 | Tailwind syntax in React Native, familiar developer experience |
| State | Zustand | Minimal boilerplate, TypeScript-friendly |
| Scratch mechanic | `react-native-scratch-card` | Canvas-based, handles touch gestures internally |
| History scope | Per-UID, not shared | Core game mechanic: A's history ≠ B's history |
| Task data | Static TypeScript arrays | No backend needed; easy to expand |
| Skip window | Before timer start only | Prevents unfair skipping after seeing the task |

---

*Built with ❤️ — Happy scratching, couples!*
