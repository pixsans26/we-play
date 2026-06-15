import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";

// ── Game Content ──────────────────────────────────────────────────────────────

export const textTasks = pgTable("text_tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  timerSeconds: integer("timer_seconds").notNull(),
  level: integer("level").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imageTasks = pgTable("image_tasks", {
  id: text("id").primaryKey(),
  imageSource: text("image_source").notNull(),
  caption: text("caption").notNull(),
  reactionPrompt: text("reaction_prompt").notNull(),
  level: integer("level").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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

export const lotteryCards = pgTable("lottery_cards", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  category: text("category").notNull().default("romantic"),
  icon: text("icon").notNull().default("❤️"),
  level: integer("level").notNull().default(1),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Admin Users ───────────────────────────────────────────────────────────────

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── App Config ────────────────────────────────────────────────────────────────
export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TextTask = typeof textTasks.$inferSelect;
export type ImageTask = typeof imageTasks.$inferSelect;
export type SpinWheelItem = typeof spinWheelItems.$inferSelect;
export type LotteryCard = typeof lotteryCards.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
