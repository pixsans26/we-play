import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const textTasks = pgTable("text_tasks", {
  id: text("id").primaryKey(), // Using the same ID string from your static data (e.g. 't001')
  title: text("title").notNull(),
  description: text("description").notNull(),
  timerSeconds: integer("timer_seconds").notNull(),
  level: integer("level").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const imageTasks = pgTable("image_tasks", {
  id: text("id").primaryKey(),
  imageSource: text("image_source").notNull(), // Will store the public URL to the image
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
  actionType: text("action_type").notNull().default("any"), // mouth, hand, any
  columnType: text("column_type").notNull(), // action, spot, extra
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



export const couple = pgTable("couple", {
  id: serial("id").primaryKey(),
  partnerAUid: text("partner_a_uid").notNull(),
  partnerBUid: text("partner_b_uid"),
  partnerAName: text("partner_a_name").notNull(),
  partnerBName: text("partner_b_name"),
  partnerAAge: integer("partner_a_age"),
  partnerBAge: integer("partner_b_age"),
  partnerAGender: text("partner_a_gender"),
  partnerBGender: text("partner_b_gender"),
  whatALikes: text("what_a_likes"),
  whatBLikes: text("what_b_likes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userUid: text("user_uid").notNull().unique(),
  scratchCount: integer("scratch_count").default(0),
  completedCount: integer("completed_count").default(0),
  currentLevel: integer("current_level").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const taskHistory = pgTable("task_history", {
  id: serial("id").primaryKey(),
  userUid: text("user_uid").notNull(),
  performerUid: text("performer_uid").notNull(),
  taskId: text("task_id").notNull(),
  taskType: text("task_type").notNull(),
  category: text("category"), // e.g. romantic, fun, intimate, dare
  scratchedAt: timestamp("scratched_at").defaultNow().notNull(),
  completed: boolean("completed").notNull().default(false),
  timeTaken: integer("time_taken"),
});
