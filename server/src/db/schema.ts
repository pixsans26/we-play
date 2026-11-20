import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const textTasks = pgTable("text_tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  timerSeconds: integer("timer_seconds").notNull(),
  level: integer("level").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const imageTasks = pgTable("image_tasks", {
  id: text("id").primaryKey(),
  imageSource: text("image_source").notNull(),
  title: text("title").notNull(),
  level: integer("level").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const spinWheelItems = pgTable("spin_wheel_items", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  emoji: text("emoji").notNull().default("🎯"),
  color: text("color").notNull().default("#FF6B9D"),
  level: integer("level").notNull().default(1),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lotteryItems = pgTable("lottery_items", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  actionType: text("action_type").notNull().default("any"),
  columnType: text("column_type").notNull(),
  level: integer("level").notNull().default(1),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const presetAvatars = pgTable("preset_avatars", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});


// ─── CORE USER TABLE ───────────────────────────────────────────────────────────
// Single source of truth for every person using the app.
// Upserted on every Firebase auth state change.
export const appUsers = pgTable("app_users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),           // Firebase UID
  email: text("email"),                          // Firebase email
  // App profile (filled during onboarding)
  name: text("name"),                            // Chosen name in app
  age: integer("age"),
  gender: text("gender"),                        // 'Male' | 'Female' | 'Other'
  avatar: text("avatar"),                        // Avatar URL chosen in app
  whatLikes: text("what_likes"),                 // Comma-separated preferences
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── COUPLE TABLE ─────────────────────────────────────────────────────────────
// Links two appUsers together via an invite code.
// Backward-compat denormalized name/age/gender columns preserved for existing rows.
export const couple = pgTable("couple", {
  id: serial("id").primaryKey(),
  partnerAUid: text("partner_a_uid").notNull(),  // → appUsers.uid (creator)
  partnerBUid: text("partner_b_uid"),             // → appUsers.uid (null until Partner B joins)
  partnerAName: text("partner_a_name"),
  partnerBName: text("partner_b_name"),
  partnerAAge: integer("partner_a_age"),
  partnerBAge: integer("partner_b_age"),
  partnerAGender: text("partner_a_gender"),
  partnerBGender: text("partner_b_gender"),
  whatALikes: text("what_a_likes"),
  whatBLikes: text("what_b_likes"),
  inviteCode: text("invite_code").unique(),        // 6-char code shared with partner
  status: text("status").notNull().default("pending"), // 'pending' | 'active'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── USER PROGRESS ────────────────────────────────────────────────────────────
export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userUid: text("user_uid").notNull().unique(),
  coupleId: integer("couple_id"),                // → couple.id
  pushToken: text("push_token"),
  scratchCount: integer("scratch_count").default(0),
  completedCount: integer("completed_count").default(0),
  currentLevel: integer("current_level").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── TASK HISTORY ─────────────────────────────────────────────────────────────
export const taskHistory = pgTable("task_history", {
  id: serial("id").primaryKey(),
  userUid: text("user_uid").notNull(),
  performerUid: text("performer_uid").notNull(),
  taskId: text("task_id").notNull(),
  taskType: text("task_type").notNull(),
  category: text("category"),
  scratchedAt: timestamp("scratched_at").defaultNow().notNull(),
  completed: boolean("completed").notNull().default(false),
  timeTaken: integer("time_taken"),
});

// ─── CYCLE TRACKING ───────────────────────────────────────────────────────────
export const cycleTracking = pgTable("cycle_tracking", {
  id: serial("id").primaryKey(),
  coupleId: integer("couple_id").unique(),       // Nullable for single users
  femaleUid: text("female_uid").unique(),        // Nullable, unique link to female user
  averageCycleLength: integer("average_cycle_length").default(28).notNull(),
  averagePeriodLength: integer("average_period_length").default(5).notNull(),
  lastPeriodStart: text("last_period_start"),
  lastPeriodEnd: text("last_period_end"),
  isLocked: boolean("is_locked").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cycleHistory = pgTable("cycle_history", {
  id: serial("id").primaryKey(),
  coupleId: integer("couple_id"),                // Nullable for single users
  femaleUid: text("female_uid"),                 // Nullable link to female user
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end"),
  cycleLength: integer("cycle_length").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── LUDO GAME ────────────────────────────────────────────────────────────────
export const ludoTasks = pgTable("ludo_tasks", {
  id: serial("id").primaryKey(),
  stepNumber: integer("step_number"),            // 1-52 track, 101-105 home run, 999 home, or null for general
  stepType: text("step_type").notNull().default("normal"), // 'normal' | 'star' | 'home_entry' | 'home_stretch' | 'home'
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("Fun"),    // 'Romantic' | 'Fun' | 'Dares' | 'Deep' | 'Intimate' | 'Physical'
  performer: text("performer").notNull().default("lander"), // 'lander' | 'partner' | 'both'
  timerSeconds: integer("timer_seconds").default(0),
  level: integer("level").notNull().default(1),
  imageUrl: text("image_url"),
  categoryImageUrl: text("category_image_url"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ludoGameSessions = pgTable("ludo_game_sessions", {
  id: serial("id").primaryKey(),
  coupleId: integer("couple_id"),                // links to couple.id
  creatorUid: text("creator_uid").notNull(),
  playerCount: integer("player_count").notNull().default(2), // 2, 3, or 4
  players: text("players").notNull(),            // JSON string of player configs
  tokens: text("tokens").notNull(),              // JSON string of token positions
  tokensPerPlayer: integer("tokens_per_player").notNull().default(2), // 2 or 4
  currentTurn: integer("current_turn").notNull().default(0), // player index 0..playerCount-1
  currentStep: text("current_step").notNull().default("roll"), // 'roll' | 'move' | 'task'
  lastDiceRoll: integer("last_dice_roll"),
  activeTask: text("active_task"),               // JSON string of current active task if any
  status: text("status").notNull().default("in_progress"), // 'in_progress' | 'completed' | 'abandoned'
  winnerId: text("winner_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

