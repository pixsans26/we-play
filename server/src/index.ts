import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./db/client";
import { textTasks, imageTasks, spinWheelItems, lotteryItems, adminUsers, couple, userProgress, taskHistory,
  cycleTracking,
  cycleHistory,
  appConfig,
  appUsers,
  presetAvatars,
} from "./db/schema";
import { sql } from "drizzle-orm";

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_fallback";

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static File Serving (uploaded images) ────────────────────────────────────
const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// ─── Multer Config ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── SSE Notifications (Admin) ─────────────────────────────────────────────────
let adminClients: Response[] = [];

app.get("/api/admin/events", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  adminClients.push(res);

  req.on("close", () => {
    adminClients = adminClients.filter((client) => client !== res);
  });
});

const broadcastAdminEvent = (data: any) => {
  adminClients.forEach((client) => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
};

// ─── JWT Authentication Middleware ──────────────────────────────────────────
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token is missing" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    (req as any).user = user;
    next();
  });
};

// ─── Token Generation Endpoint ──────────────────────────────────────────────
app.post("/api/auth/token", async (req: Request, res: Response) => {
  try {
    const { uid, role } = req.body;
    
    // In production, this would verify Firebase token
    if (uid) {
      const token = jwt.sign({ role: role || "couple", uid }, JWT_SECRET, { expiresIn: "30d" });
      return res.json({ token });
    }

    res.status(400).json({ error: "Invalid request payload" });
  } catch (err) {
    console.error("[POST /api/auth/token]", err);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

app.post("/api/auth/signup", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const [existing] = await db.select().from(appUsers).where(eq(appUsers.email, email));
    if (existing) {
      return res.status(400).json({ error: "User already exists with this email" });
    }
    const uid = "local_" + Math.random().toString(36).substring(2, 15);
    const [inserted] = await db.insert(appUsers).values({
      uid,
      email,
      name: "",
    }).returning();
    const token = jwt.sign({ role: "couple", uid }, JWT_SECRET, { expiresIn: "30d" });
    res.status(201).json({ token, uid: inserted.uid, email: inserted.email });
  } catch (err) {
    console.error("[POST /api/auth/signup]", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const [user] = await db.select().from(appUsers).where(eq(appUsers.email, email));
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = jwt.sign({ role: "couple", uid: user.uid }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, uid: user.uid, email: user.email });
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── Admin Authentication ───────────────────────────────────────────────────
app.get("/api/auth/admin/check", async (_req: Request, res: Response) => {
  try {
    const users = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
    res.json({ hasAdmin: users.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ hasAdmin: false });
  }
});

app.post("/api/auth/admin/register", async (req: Request, res: Response) => {
  try {
    const existing = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
    if (existing.length > 0) return res.status(403).json({ error: "Admin already exists. Please login." });

    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Name, email, and password are required." });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(adminUsers).values({ name, email, passwordHash, role: "superadmin" }).returning();
    res.status(201).json({ success: true, userId: user.id });
  } catch (err) {
    console.error("[POST /api/auth/admin/register]", err);
    res.status(500).json({ error: "Registration failed." });
  }
});

app.post("/api/auth/admin/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ role: user.role, email: user.email, id: user.id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: String(user.id), name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error("[POST /api/auth/admin/login]", err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.put("/api/auth/admin/profile", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userPayload = (req as any).user;
    if (userPayload.role !== "superadmin" && userPayload.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { name, email, currentPassword, newPassword } = req.body;
    const userId = Number(userPayload.id);

    const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.id, userId));
    if (!existing) return res.status(404).json({ error: "User not found" });

    const updates: Record<string, any> = {};
    if (name) updates.name = name;
    if (email) updates.email = email;

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: "Current password required" });
      const valid = await bcrypt.compare(currentPassword, existing.passwordHash);
      if (!valid) return res.status(400).json({ error: "Current password is incorrect" });
      updates.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const [updated] = await db.update(adminUsers).set(updates).where(eq(adminUsers.id, userId)).returning();
    const { passwordHash: _, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    console.error("[PUT /api/auth/admin/profile]", err);
    res.status(500).json({ error: "Update failed" });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
// PROFILES (ADMINS)
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/profile", authenticateToken, async (req: Request, res: Response) => {
  try {
    const profiles = await db.select({
      id: adminUsers.id,
      name: adminUsers.name,
      email: adminUsers.email,
      role: adminUsers.role,
      createdAt: adminUsers.createdAt
    }).from(adminUsers);
    res.json(profiles);
  } catch (err) {
    console.error("[GET /api/profile]", err);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEXT TASKS
// ─────────────────────────────────────────────────────────────────────────────

// GET all text tasks
app.get("/api/tasks/text", authenticateToken, async (_req: Request, res: Response) => {
  try {
    const tasks = await db.select().from(textTasks).orderBy(textTasks.level);
    res.json(tasks);
  } catch (err) {
    console.error("[GET /api/tasks/text]", err);
    res.status(500).json({ error: "Failed to fetch text tasks" });
  }
});

// GET single text task by id
app.get("/api/tasks/text/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const [task] = await db.select().from(textTasks).where(eq(textTasks.id, id));
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  } catch (err) {
    console.error("[GET /api/tasks/text/:id]", err);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// POST create or update text task (upsert)
app.post("/api/tasks/text", authenticateToken, async (req: Request, res: Response) => {
  try {
    let { id, title, description, timerSeconds, level, category } = req.body;
    if (!title || !description || !timerSeconds || !level || !category) {
      res.status(400).json({ error: "Missing required fields: title, description, timerSeconds, level, category" });
      return;
    }

    if (!id) {
      id = `t_${Date.now()}_${Math.round(Math.random() * 1e4)}`;
    }

    const [existing] = await db.select().from(textTasks).where(eq(textTasks.id, String(id)));
    if (existing) {
      const [updated] = await db
        .update(textTasks)
        .set({ title, description, timerSeconds: Number(timerSeconds), level: Number(level), category })
        .where(eq(textTasks.id, String(id)))
        .returning();
      res.json(updated);
    } else {
      const [inserted] = await db
        .insert(textTasks)
        .values({ id: String(id), title, description, timerSeconds: Number(timerSeconds), level: Number(level), category })
        .returning();
      res.status(201).json(inserted);
    }
  } catch (err) {
    console.error("[POST /api/tasks/text]", err);
    res.status(500).json({ error: "Failed to save text task" });
  }
});

// DELETE text task
app.delete("/api/tasks/text/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const [deleted] = await db
      .delete(textTasks)
      .where(eq(textTasks.id, id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json({ success: true, deleted });
  } catch (err) {
    console.error("[DELETE /api/tasks/text/:id]", err);
    res.status(500).json({ error: "Failed to delete text task" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE TASKS
// ─────────────────────────────────────────────────────────────────────────────

// GET all image tasks
app.get("/api/tasks/image", authenticateToken, async (_req: Request, res: Response) => {
  try {
    const tasks = await db.select().from(imageTasks).orderBy(imageTasks.level);
    res.json(tasks);
  } catch (err) {
    console.error("[GET /api/tasks/image]", err);
    res.status(500).json({ error: "Failed to fetch image tasks" });
  }
});

// GET single image task by id
app.get("/api/tasks/image/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const [task] = await db.select().from(imageTasks).where(eq(imageTasks.id, id));
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  } catch (err) {
    console.error("[GET /api/tasks/image/:id]", err);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// POST create or update image task (with image upload via multipart/form-data)
app.post(
  "/api/tasks/image",
  authenticateToken,
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      let { id, title, level } = req.body;

      if (!title || !level) {
        res.status(400).json({ error: "Missing required fields: title, level" });
        return;
      }

      if (!id) {
        id = `i_${Date.now()}_${Math.round(Math.random() * 1e4)}`;
      }

      // Use the newly uploaded file URL, or an existing URL from the body
      let imageSource: string = req.body.imageSource || "";
      if (req.file) {
        imageSource = `/uploads/${req.file.filename}`;
      }

      if (!imageSource) {
        res.status(400).json({ error: "An image file is required" });
        return;
      }

      const parsedLevel = parseInt(level, 10);
      const [existing] = await db.select().from(imageTasks).where(eq(imageTasks.id, String(id)));

      if (existing) {
        // If a new file was uploaded, delete the old one to free disk space
        if (req.file && existing.imageSource.startsWith("/uploads/")) {
          const oldFilePath = path.join(uploadDir, path.basename(existing.imageSource));
          if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
        }
        const [updated] = await db
          .update(imageTasks)
          .set({ title, level: parsedLevel, imageSource })
          .where(eq(imageTasks.id, String(id)))
          .returning();
        res.json(updated);
      } else {
        const [inserted] = await db
          .insert(imageTasks)
          .values({ id: String(id), title, level: parsedLevel, imageSource })
          .returning();
        res.status(201).json(inserted);
      }
    } catch (err) {
      console.error("[POST /api/tasks/image]", err);
      res.status(500).json({ error: "Failed to save image task" });
    }
  }
);

// DELETE image task (also removes the file from disk)
app.delete("/api/tasks/image/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const [existing] = await db.select().from(imageTasks).where(eq(imageTasks.id, id));
    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    // Delete the image file from disk
    if (existing.imageSource.startsWith("/uploads/")) {
      const filePath = path.join(uploadDir, path.basename(existing.imageSource));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    const [deleted] = await db
      .delete(imageTasks)
      .where(eq(imageTasks.id, id))
      .returning();
    res.json({ success: true, deleted });
  } catch (err) {
    console.error("[DELETE /api/tasks/image/:id]", err);
    res.status(500).json({ error: "Failed to delete image task" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/stats", authenticateToken, async (_req: Request, res: Response) => {
  try {
    const [couplesResult] = await db.select({ count: sql<number>`count(*)` }).from(couple).where(eq(couple.status, "active"));
    const [usersResult] = await db.select({ count: sql<number>`count(*)` }).from(appUsers);
    const [txtResult] = await db.select({ count: sql<number>`count(*)` }).from(textTasks);
    const [imgResult] = await db.select({ count: sql<number>`count(*)` }).from(imageTasks);
    const [spinResult] = await db.select({ count: sql<number>`count(*)` }).from(spinWheelItems);
    const [lotResult] = await db.select({ count: sql<number>`count(*)` }).from(lotteryItems);

    // History counts
    const [scratchesResult] = await db.select({ count: sql<number>`count(*)` })
      .from(taskHistory)
      .where(sql`${taskHistory.taskType} IN ('text', 'image')`);
      
    const [rollsResult] = await db.select({ count: sql<number>`count(*)` })
      .from(taskHistory)
      .where(sql`${taskHistory.taskType} IN ('spin_wheel', 'lottery')`);

    res.json({
      totalCouples: Number(couplesResult.count),
      totalUsers: Number(usersResult.count),
      totalScratches: Number(scratchesResult.count),
      totalImageGames: Number(imgResult.count),
      totalTaskGames: Number(txtResult.count),
      totalLotteryItems: Number(lotResult.count),
      totalSpins: Number(spinResult.count),
      totalRolls: Number(rollsResult.count)
    });
  } catch (err) {
    console.error("[GET /api/stats]", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SPIN WHEEL
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/tasks/spin", authenticateToken, async (_req: Request, res: Response) => {
  try {
    const items = await db.select().from(spinWheelItems).orderBy(spinWheelItems.id);
    res.json(items);
  } catch (err) {
    console.error("[GET /api/tasks/spin]", err);
    res.status(500).json({ error: "Failed to fetch spin wheel items" });
  }
});

app.post("/api/tasks/spin", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id, label, emoji, color, level, active } = req.body;
    if (!label) return res.status(400).json({ error: "Missing label" });

    if (id) {
      const [updated] = await db
        .update(spinWheelItems)
        .set({ label, emoji, color, level: Number(level || 1), active: Boolean(active) })
        .where(eq(spinWheelItems.id, Number(id)))
        .returning();
      res.json(updated);
    } else {
      const [inserted] = await db
        .insert(spinWheelItems)
        .values({ label, emoji, color, level: Number(level || 1), active: Boolean(active) })
        .returning();
      res.status(201).json(inserted);
    }
  } catch (err) {
    console.error("[POST /api/tasks/spin]", err);
    res.status(500).json({ error: "Failed to save spin wheel item" });
  }
});

app.delete("/api/tasks/spin/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [deleted] = await db.delete(spinWheelItems).where(eq(spinWheelItems.id, id)).returning();
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete spin wheel item" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LOTTERY ITEMS
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/tasks/lottery", authenticateToken, async (_req: Request, res: Response) => {
  try {
    const items = await db.select().from(lotteryItems).orderBy(lotteryItems.id);
    res.json(items);
  } catch (err) {
    console.error("[GET /api/tasks/lottery]", err);
    res.status(500).json({ error: "Failed to fetch lottery items" });
  }
});

app.post("/api/tasks/lottery", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id, label, actionType, columnType, level, active } = req.body;
    if (!label || !columnType) return res.status(400).json({ error: "Missing label or columnType" });

    if (id) {
      const [updated] = await db
        .update(lotteryItems)
        .set({ label, actionType: actionType || "any", columnType, level: Number(level || 1), active: Boolean(active) })
        .where(eq(lotteryItems.id, Number(id)))
        .returning();
      res.json(updated);
    } else {
      const [inserted] = await db
        .insert(lotteryItems)
        .values({ label, actionType: actionType || "any", columnType, level: Number(level || 1), active: Boolean(active) })
        .returning();
      res.status(201).json(inserted);
    }
  } catch (err) {
    console.error("[POST /api/tasks/lottery]", err);
    res.status(500).json({ error: "Failed to save lottery item" });
  }
});

app.delete("/api/tasks/lottery/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [deleted] = await db.delete(lotteryItems).where(eq(lotteryItems.id, id)).returning();
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete lottery item" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

// Removed api/profile because it was just returning all admin profiles which isn't used

// ─────────────────────────────────────────────────────────────────────────────
// APP USERS — profile registry for every mobile user
// ─────────────────────────────────────────────────────────────────────────────

// Called on every Firebase auth state change; upserts email + full profile
app.post("/api/user/register", async (req: Request, res: Response) => {
  try {
    const { uid, email, name, age, gender, avatar, whatLikes } = req.body;
    if (!uid) return res.status(400).json({ error: "uid is required" });

    const [existing] = await db.select().from(appUsers).where(eq(appUsers.uid, uid));
    if (existing) {
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (email !== undefined) updates.email = email;
      if (name !== undefined) updates.name = name;
      if (age !== undefined) updates.age = age;
      if (gender !== undefined) updates.gender = gender;
      if (avatar !== undefined) updates.avatar = avatar;
      if (whatLikes !== undefined) updates.whatLikes = whatLikes;
      const [updated] = await db.update(appUsers).set(updates).where(eq(appUsers.uid, uid)).returning();
      return res.json(updated);
    }

    const [inserted] = await db.insert(appUsers).values({ uid, email, name, age, gender, avatar, whatLikes }).returning();
    res.status(201).json(inserted);
  } catch (err) {
    console.error("[POST /api/user/register]", err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// Get own full profile from appUsers
app.get("/api/user/profile/:identifier", authenticateToken, async (req: Request, res: Response) => {
  try {
    const identifier = String(req.params.identifier);
    let user;
    if (identifier.includes("@")) {
      [user] = await db.select().from(appUsers).where(eq(appUsers.email, identifier.toLowerCase()));
    } else {
      [user] = await db.select().from(appUsers).where(eq(appUsers.uid, identifier));
    }
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("[GET /api/user/profile/:identifier]", err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Update own profile
app.put("/api/user/profile", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { uid, name, age, gender, avatar, whatLikes } = req.body;
    if (!uid) return res.status(400).json({ error: "uid is required" });
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (age !== undefined) updates.age = age;
    if (gender !== undefined) updates.gender = gender;
    if (avatar !== undefined) updates.avatar = avatar;
    if (whatLikes !== undefined) updates.whatLikes = whatLikes;
    const [updated] = await db.update(appUsers).set(updates).where(eq(appUsers.uid, uid)).returning();
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json(updated);
  } catch (err) {
    console.error("[PUT /api/user/profile]", err);
    res.status(500).json({ error: "Failed to update user profile" });
  }
});

app.get("/api/admin/app-users", authenticateToken, async (_req: Request, res: Response) => {
  try {
    // Join with couple to show partnership status
    const users = await db
      .select({
        user: appUsers,
        coupleId: couple.id,
        coupleStatus: couple.status,
        isPartnerA: sql<boolean>`${couple.partnerAUid} = ${appUsers.uid}`,
      })
      .from(appUsers)
      .leftJoin(couple, sql`${couple.partnerAUid} = ${appUsers.uid} OR ${couple.partnerBUid} = ${appUsers.uid}`);
    res.json(users);
  } catch (err) {
    console.error("[GET /api/admin/app-users]", err);
    res.status(500).json({ error: "Failed to fetch app users" });
  }
});

app.get("/api/admin/app-users/:uid", authenticateToken, async (req: Request, res: Response) => {
  try {
    const uid = String(req.params.uid);
    const [user] = await db.select().from(appUsers).where(eq(appUsers.uid, uid));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [progress] = await db.select().from(userProgress).where(eq(userProgress.userUid, uid));

    const [coupleRow] = await db
      .select({
        couple: couple,
        isPartnerA: sql<boolean>`${couple.partnerAUid} = ${uid}`,
      })
      .from(couple)
      .where(sql`${couple.partnerAUid} = ${uid} OR ${couple.partnerBUid} = ${uid}`);

    let partner = null;
    if (coupleRow) {
      const partnerUid = coupleRow.isPartnerA ? coupleRow.couple.partnerBUid : coupleRow.couple.partnerAUid;
      if (partnerUid) {
        const [partnerUser] = await db.select().from(appUsers).where(eq(appUsers.uid, partnerUid as string));
        partner = partnerUser || null;
      }
    }

    const [cycle] = await db
      .select()
      .from(cycleTracking)
      .where(
        sql`${cycleTracking.femaleUid} = ${uid} OR ${cycleTracking.coupleId} = ${coupleRow?.couple.id || -1}`
      );

    res.json({
      user,
      progress: progress || null,
      couple: coupleRow ? {
        ...coupleRow.couple,
        isPartnerA: coupleRow.isPartnerA
      } : null,
      partner,
      cycle: cycle || null
    });
  } catch (err) {
    console.error("[GET /api/admin/app-users/:uid]", err);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

app.put("/api/admin/app-users/:uid", authenticateToken, upload.single("avatar"), async (req: Request, res: Response) => {
  try {
    const uid = String(req.params.uid);
    const { name, email, age, gender, whatLikes } = req.body;
    let avatar = req.body.avatar;

    if (req.file) {
      avatar = `/uploads/${req.file.filename}`;
    }

    const [existing] = await db.select().from(appUsers).where(eq(appUsers.uid, uid));
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (age !== undefined) updates.age = age ? Number(age) : null;
    if (gender !== undefined) updates.gender = gender;
    if (avatar !== undefined) updates.avatar = avatar;
    if (whatLikes !== undefined) updates.whatLikes = whatLikes;

    const [updated] = await db.update(appUsers).set(updates).where(eq(appUsers.uid, uid)).returning();
    res.json(updated);
  } catch (err) {
    console.error("[PUT /api/admin/app-users/:uid]", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Clear all app users' data (Danger zone action)
app.delete("/api/admin/clear-users-data", authenticateToken, async (_req: Request, res: Response) => {
  try {
    // Truncate/delete user-centric tables in reverse order of foreign keys/dependencies
    await db.delete(cycleHistory);
    await db.delete(cycleTracking);
    await db.delete(taskHistory);
    await db.delete(userProgress);
    await db.delete(couple);
    await db.delete(appUsers);

    broadcastAdminEvent({ type: "SYSTEM_RESET", message: "All user data has been cleared by an administrator." });

    res.json({ success: true, message: "All user data has been successfully cleared." });
  } catch (err) {
    console.error("[DELETE /api/admin/clear-users-data]", err);
    res.status(500).json({ error: "Failed to clear user data" });
  }
});

app.delete("/api/admin/couple/:uid", authenticateToken, async (req: Request, res: Response) => {
  try {
    const uid = String(req.params.uid);
    const [existing] = await db.select().from(couple).where(
      sql`${couple.partnerAUid} = ${uid} OR ${couple.partnerBUid} = ${uid}`
    );
    if (!existing) return res.status(404).json({ error: "Couple not found" });

    await db.delete(couple).where(eq(couple.id, existing.id));
    await db.delete(userProgress).where(eq(userProgress.coupleId, existing.id)).catch(() => {});
    await db.delete(cycleTracking).where(eq(cycleTracking.coupleId, existing.id)).catch(() => {});
    
    broadcastAdminEvent({ type: "COUPLE_DISCONNECTED", message: `A couple was disconnected by an admin.` });
    
    res.json({ success: true, message: "Couple disconnected successfully" });
  } catch (err) {
    console.error("[DELETE /api/admin/couple/:uid]", err);
    res.status(500).json({ error: "Failed to disconnect couple" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CYCLE ANALYTICS (ADMIN)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/admin/cycles", authenticateToken, async (_req: Request, res: Response) => {
  try {
    const partnerA = alias(appUsers, "partner_a");
    const partnerB = alias(appUsers, "partner_b");
    const cycles = await db
      .select({
        couple: {
          id: couple.id,
          partnerAUid: couple.partnerAUid,
          partnerBUid: couple.partnerBUid,
          inviteCode: couple.inviteCode,
          status: couple.status,
          createdAt: couple.createdAt,
          partnerAName: partnerA.name,
          partnerBName: partnerB.name,
          partnerAGender: partnerA.gender,
          partnerBGender: partnerB.gender,
        },
        cycleTracking: cycleTracking,
        femaleEmail: appUsers.email,
        femaleName: appUsers.name,
      })
      .from(cycleTracking)
      .leftJoin(couple, eq(cycleTracking.coupleId, couple.id))
      .leftJoin(appUsers, eq(appUsers.uid, cycleTracking.femaleUid))
      .leftJoin(partnerA, eq(couple.partnerAUid, partnerA.uid))
      .leftJoin(partnerB, eq(couple.partnerBUid, partnerB.uid));
    res.json(cycles);
  } catch (err) {
    console.error("[GET /api/admin/cycles]", err);
    res.status(500).json({ error: "Failed to fetch cycle analytics" });
  }
});

app.get("/api/admin/cycles/:coupleId/history", authenticateToken, async (req: Request, res: Response) => {
  try {
    const identifier = String(req.params.coupleId);
    let coupleId: number | null = null;
    let femaleUid: string | null = null;

    if (/^\d+$/.test(identifier)) {
      coupleId = Number(identifier);
    } else {
      femaleUid = identifier;
      const [coupleRow] = await db.select().from(couple).where(
        sql`${couple.partnerAUid} = ${femaleUid} OR ${couple.partnerBUid} = ${femaleUid}`
      );
      if (coupleRow) {
        coupleId = coupleRow.id;
      }
    }

    let manualHistory: any[] = [];
    if (coupleId) {
      manualHistory = await db.select().from(cycleHistory).where(eq(cycleHistory.coupleId, coupleId)).orderBy(sql`${cycleHistory.createdAt} ASC`);
    } else if (femaleUid) {
      manualHistory = await db.select().from(cycleHistory).where(eq(cycleHistory.femaleUid, femaleUid)).orderBy(sql`${cycleHistory.createdAt} ASC`);
    }

    let tracking: any = null;
    if (coupleId) {
      const [row] = await db.select().from(cycleTracking).where(eq(cycleTracking.coupleId, coupleId));
      tracking = row;
    }
    if (!tracking && femaleUid) {
      const [row] = await db.select().from(cycleTracking).where(eq(cycleTracking.femaleUid, femaleUid));
      tracking = row;
    }

    if (!tracking || !tracking.lastPeriodStart) {
      return res.json(manualHistory);
    }

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const avgCycle = tracking.averageCycleLength || 28;
    const avgPeriod = tracking.averagePeriodLength || 5;

    // 1. Gather all explicit manual logs
    const manualMarkers: any[] = manualHistory.map(h => ({
      ...h,
      isPredicted: false
    }));
    
    // Add the current config as an explicit log if it's not already in there
    if (!manualMarkers.some(m => m.periodStart === tracking.lastPeriodStart)) {
      manualMarkers.push({
        id: "current",
        coupleId: coupleId || null,
        femaleUid: femaleUid || null,
        periodStart: tracking.lastPeriodStart,
        periodEnd: tracking.lastPeriodEnd,
        cycleLength: avgCycle,
        createdAt: tracking.updatedAt || new Date().toISOString(),
        isPredicted: false
      });
    }

    // Sort ascending by period start date
    manualMarkers.sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime());

    const unified: any[] = [];
    
    // 2. Fill gaps and extrapolate
    for (let i = 0; i < manualMarkers.length; i++) {
      const currentMarker = manualMarkers[i];
      unified.push(currentMarker);
      
      const isLastMarker = i === manualMarkers.length - 1;
      let iterDate = new Date(currentMarker.periodStart);
      
      let endBoundary: Date;
      if (!isLastMarker) {
        endBoundary = new Date(manualMarkers[i + 1].periodStart);
      } else {
        endBoundary = new Date();
        endBoundary.setMonth(endBoundary.getMonth() + 6);
      }

      let predCounter = 1;
      while (true) {
        iterDate = new Date(iterDate.getTime() + avgCycle * MS_PER_DAY);
        
        if (isLastMarker) {
          if (iterDate > endBoundary) break; // Finished extrapolating 6 months
        } else {
          // If the next predicted date is within 14 days of the actual next marker, we skip it
          const daysDiff = (endBoundary.getTime() - iterDate.getTime()) / MS_PER_DAY;
          if (daysDiff < 14) {
            break;
          }
        }
        
        const pEnd = new Date(iterDate.getTime() + avgPeriod * MS_PER_DAY);
        
        unified.push({
          id: `pred_${currentMarker.id}_${predCounter++}`,
          coupleId,
          periodStart: iterDate.toISOString(),
          periodEnd: pEnd.toISOString(),
          cycleLength: avgCycle,
          createdAt: currentMarker.createdAt,
          isPredicted: true,
        });
      }
    }

    // 3. Return sorted DESC so the newest logs are first
    unified.sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime());
    res.json(unified);
  } catch (err) {
    console.error("[GET /api/admin/cycles/:coupleId/history]", err);
    res.status(500).json({ error: "Failed to fetch cycle history" });
  }
});

app.get("/api/admin/cycles/:coupleId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const identifier = String(req.params.coupleId);
    let coupleId: number | null = null;
    let femaleUid: string | null = null;

    if (/^\d+$/.test(identifier)) {
      coupleId = Number(identifier);
    } else {
      femaleUid = identifier;
      const [coupleRow] = await db.select().from(couple).where(
        sql`${couple.partnerAUid} = ${femaleUid} OR ${couple.partnerBUid} = ${femaleUid}`
      );
      if (coupleRow) {
        coupleId = coupleRow.id;
      }
    }

    let tracking: any = null;
    if (coupleId) {
      const [row] = await db
        .select({
          couple: couple,
          cycleTracking: cycleTracking,
        })
        .from(cycleTracking)
        .where(eq(cycleTracking.coupleId, coupleId))
        .leftJoin(couple, eq(cycleTracking.coupleId, couple.id));
      tracking = row;
    }
    
    if (!tracking && femaleUid) {
      const [row] = await db
        .select({
          cycleTracking: cycleTracking,
        })
        .from(cycleTracking)
        .where(eq(cycleTracking.femaleUid, femaleUid));
      if (row) {
        const [userRow] = await db.select().from(appUsers).where(eq(appUsers.uid, femaleUid));
        tracking = {
          couple: null,
          cycleTracking: row,
          femaleEmail: userRow?.email || null,
          femaleName: userRow?.name || null,
        };
      }
    }

    if (!tracking) return res.status(404).json({ error: "Cycle tracking not found" });

    res.json(tracking);
  } catch (err) {
    console.error("[GET /api/admin/cycles/:coupleId]", err);
    res.status(500).json({ error: "Failed to fetch cycle details" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────────────────────────────────────
import { inArray } from "drizzle-orm";

// Admin GET all global history
app.get("/api/admin/history", authenticateToken, async (_req: Request, res: Response) => {
  try {
    const history = await db.select().from(taskHistory).orderBy(taskHistory.scratchedAt);
    res.json(history);
  } catch (err) {
    console.error("[GET /api/admin/history]", err);
    res.status(500).json({ error: "Failed to fetch global history" });
  }
});

app.get("/api/history", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { partnerAUid, partnerBUid } = req.query;
    if (!partnerAUid && !partnerBUid) {
      res.status(400).json({ error: "Missing partner UIDs" });
      return;
    }

    const uids = [partnerAUid, partnerBUid]
      .filter((u) => Boolean(u) && u !== "undefined" && u !== "null")
      .map(String);
    const history = await db.select().from(taskHistory).where(inArray(taskHistory.userUid, uids)).orderBy(taskHistory.scratchedAt);
    res.json(history);
  } catch (err) {
    console.error("[GET /api/history]", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.post("/api/history", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userUid, performerUid, taskId, taskType, category, completed, timeTaken } = req.body;
    if (!userUid || !performerUid || !taskId || !taskType) {
      res.status(400).json({ error: "Missing required history fields" });
      return;
    }

    const [inserted] = await db.insert(taskHistory).values({
      userUid,
      performerUid,
      taskId,
      taskType,
      category: category || null,
      completed: Boolean(completed),
      timeTaken: timeTaken ? Number(timeTaken) : null,
      scratchedAt: new Date()
    }).returning();
    
    // Increment scratchCount in userProgress
    const [progress] = await db.select().from(userProgress).where(eq(userProgress.userUid, userUid));
    if (progress) {
      await db.update(userProgress)
        .set({ scratchCount: (progress.scratchCount || 0) + 1, updatedAt: new Date() })
        .where(eq(userProgress.userUid, userUid));
    }
    
    broadcastAdminEvent({ type: "TASK_COMPLETED", message: `A user just completed a ${taskType} task!` });
    
    res.status(201).json(inserted);
  } catch (err) {
    console.error("[POST /api/history]", err);
    res.status(500).json({ error: "Failed to save history entry" });
  }
});

app.delete("/api/history/reset", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { uid, entryId } = req.query;
    if (!uid) {
      res.status(400).json({ error: "Missing uid" });
      return;
    }

    if (entryId) {
      await db.delete(taskHistory)
        .where(and(eq(taskHistory.userUid, String(uid)), eq(taskHistory.id, Number(entryId))));
      res.json({ success: true, deletedCount: 1 });
    } else {
      await db.delete(taskHistory)
        .where(eq(taskHistory.userUid, String(uid)));
      res.json({ success: true, deletedCount: 1 });
    }
  } catch (err) {
    console.error("[DELETE /api/history/reset]", err);
    res.status(500).json({ error: "Failed to reset history" });
  }
});

app.get("/api/couples", authenticateToken, async (_req: Request, res: Response) => {
  try {
    const partnerA = alias(appUsers, "partner_a");
    const partnerB = alias(appUsers, "partner_b");
    const result = await db
      .select({
        couple: couple,
        partnerA: partnerA,
        partnerB: partnerB,
      })
      .from(couple)
      .leftJoin(partnerA, eq(couple.partnerAUid, partnerA.uid))
      .leftJoin(partnerB, eq(couple.partnerBUid, partnerB.uid))
      .orderBy(couple.createdAt);

    const formatted = result.map((r) => ({
      ...r.couple,
      partnerAName: r.partnerA?.name || null,
      partnerBName: r.partnerB?.name || null,
      partnerAAvatar: r.partnerA?.avatar || null,
      partnerBAvatar: r.partnerB?.avatar || null,
      partnerAAge: r.partnerA?.age || null,
      partnerBAge: r.partnerB?.age || null,
      partnerAGender: r.partnerA?.gender || null,
      partnerBGender: r.partnerB?.gender || null,
      whatALikes: r.partnerA?.whatLikes || null,
      whatBLikes: r.partnerB?.whatLikes || null,
      partnerAUser: r.partnerA,
      partnerBUser: r.partnerB,
    }));
    res.json(formatted);
  } catch (err) {
    console.error("[GET /api/couples]", err);
    res.status(500).json({ error: "Failed to fetch couples" });
  }
});

app.get("/api/couples/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const partnerA = alias(appUsers, "partner_a");
    const partnerB = alias(appUsers, "partner_b");
    const [row] = await db
      .select({
        couple: couple,
        partnerA: partnerA,
        partnerB: partnerB,
      })
      .from(couple)
      .where(eq(couple.id, id))
      .leftJoin(partnerA, eq(couple.partnerAUid, partnerA.uid))
      .leftJoin(partnerB, eq(couple.partnerBUid, partnerB.uid));

    if (!row) {
      res.status(404).json({ error: "Couple not found" });
      return;
    }

    res.json({
      ...row.couple,
      partnerAName: row.partnerA?.name || null,
      partnerBName: row.partnerB?.name || null,
      partnerAAvatar: row.partnerA?.avatar || null,
      partnerBAvatar: row.partnerB?.avatar || null,
      partnerAAge: row.partnerA?.age || null,
      partnerBAge: row.partnerB?.age || null,
      partnerAGender: row.partnerA?.gender || null,
      partnerBGender: row.partnerB?.gender || null,
      whatALikes: row.partnerA?.whatLikes || null,
      whatBLikes: row.partnerB?.whatLikes || null,
      partnerAUser: row.partnerA,
      partnerBUser: row.partnerB,
    });
  } catch (err) {
    console.error("[GET /api/couples/:id]", err);
    res.status(500).json({ error: "Failed to fetch couple" });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
// COUPLE PROFILE
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/couple/:identifier", authenticateToken, async (req: Request, res: Response) => {
  try {
    const identifier = String(req.params.identifier);
    let uid = identifier;
    if (identifier.includes("@")) {
      const [user] = await db.select().from(appUsers).where(eq(appUsers.email, identifier.toLowerCase()));
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      uid = user.uid;
    }
    const partnerA = alias(appUsers, "partner_a");
    const partnerB = alias(appUsers, "partner_b");
    const [row] = await db
      .select({
        couple: couple,
        partnerA: partnerA,
        partnerB: partnerB,
      })
      .from(couple)
      .where(sql`${couple.partnerAUid} = ${uid} OR ${couple.partnerBUid} = ${uid}`)
      .leftJoin(partnerA, eq(couple.partnerAUid, partnerA.uid))
      .leftJoin(partnerB, eq(couple.partnerBUid, partnerB.uid));

    if (!row) {
      res.status(404).json({ error: "Couple profile not found" });
      return;
    }

    res.json({
      ...row.couple,
      partnerAName: row.partnerA?.name || null,
      partnerBName: row.partnerB?.name || null,
      partnerAAvatar: row.partnerA?.avatar || null,
      partnerBAvatar: row.partnerB?.avatar || null,
      partnerAAge: row.partnerA?.age || null,
      partnerBAge: row.partnerB?.age || null,
      partnerAGender: row.partnerA?.gender || null,
      partnerBGender: row.partnerB?.gender || null,
      whatALikes: row.partnerA?.whatLikes || null,
      whatBLikes: row.partnerB?.whatLikes || null,
      partnerAUser: row.partnerA,
      partnerBUser: row.partnerB,
    });
  } catch (err) {
    console.error("[GET /api/couple/:identifier]", err);
    res.status(500).json({ error: "Failed to fetch couple profile" });
  }
});

app.post("/api/couple", authenticateToken, upload.fields([{ name: "partnerAAvatar", maxCount: 1 }, { name: "partnerBAvatar", maxCount: 1 }]), async (req: Request, res: Response) => {
  try {
    const { id, partnerAUid, partnerBUid, partnerAName, partnerBName, partnerAAge, partnerBAge, partnerAGender, partnerBGender, whatALikes, whatBLikes } = req.body;
    if (!partnerAUid || !partnerAName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let partnerAAvatar = req.body.partnerAAvatar || undefined;
    let partnerBAvatar = req.body.partnerBAvatar || undefined;

    if (files && files["partnerAAvatar"]) {
      partnerAAvatar = `/uploads/${files["partnerAAvatar"][0].filename}`;
    }
    if (files && files["partnerBAvatar"]) {
      partnerBAvatar = `/uploads/${files["partnerBAvatar"][0].filename}`;
    }

    const dataToSave = {
      partnerAUid,
      partnerBUid: partnerBUid || null,
    };

    let targetId = id ? Number(id) : null;
    
    // If no ID is given, find by partnerAUid or partnerBUid to prevent duplicates
    if (!targetId) {
      const [existing] = await db.select().from(couple).where(
        sql`${couple.partnerAUid} = ${partnerAUid} OR ${couple.partnerBUid} = ${partnerAUid}`
      );
      if (existing) targetId = existing.id;
    }

    let responseRecord;
    if (targetId) {
      const [updated] = await db
        .update(couple)
        .set(dataToSave)
        .where(eq(couple.id, targetId))
        .returning();
      responseRecord = updated;
    } else {
      // Generate a unique 6-char invite code
      const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
      let inviteCode = generateCode();
      // Retry if collision
      let attempts = 0;
      while (attempts < 5) {
        const [collision] = await db.select().from(couple).where(eq(couple.inviteCode, inviteCode));
        if (!collision) break;
        inviteCode = generateCode();
        attempts++;
      }

      const [inserted] = await db
        .insert(couple)
        .values({ ...dataToSave, inviteCode, status: partnerBUid ? 'active' : 'pending' } as any)
        .returning();
      responseRecord = inserted;
      broadcastAdminEvent({ type: "NEW_USER", message: `A new couple just registered: ${partnerAName}!` });
    }

    // Sync partnerA profile into appUsers
    if (partnerAUid) {
      const [existingUser] = await db.select().from(appUsers).where(eq(appUsers.uid, partnerAUid));
      const profileUpdate = {
        name: partnerAName || undefined,
        age: partnerAAge ? Number(partnerAAge) : undefined,
        gender: partnerAGender || undefined,
        avatar: partnerAAvatar || undefined,
        whatLikes: whatALikes || undefined,
        updatedAt: new Date(),
      };
      if (existingUser) {
        await db.update(appUsers).set(profileUpdate).where(eq(appUsers.uid, partnerAUid));
      } else {
        await db.insert(appUsers).values({ uid: partnerAUid, ...profileUpdate }).catch(() => {});
      }
    }

    // Sync partnerB profile into appUsers
    if (partnerBUid) {
      const [existingUser] = await db.select().from(appUsers).where(eq(appUsers.uid, partnerBUid));
      const profileUpdate = {
        name: partnerBName || undefined,
        age: partnerBAge ? Number(partnerBAge) : undefined,
        gender: partnerBGender || undefined,
        avatar: partnerBAvatar || undefined,
        whatLikes: whatBLikes || undefined,
        updatedAt: new Date(),
      };
      if (existingUser) {
        await db.update(appUsers).set(profileUpdate).where(eq(appUsers.uid, partnerBUid));
      } else {
        await db.insert(appUsers).values({ uid: partnerBUid, ...profileUpdate }).catch(() => {});
      }
    }

    // Fetch and format the response record
    const partnerA = alias(appUsers, "partner_a");
    const partnerB = alias(appUsers, "partner_b");
    const [finalRecord] = await db
      .select({
        couple: couple,
        partnerA: partnerA,
        partnerB: partnerB,
      })
      .from(couple)
      .where(eq(couple.id, responseRecord.id))
      .leftJoin(partnerA, eq(couple.partnerAUid, partnerA.uid))
      .leftJoin(partnerB, eq(couple.partnerBUid, partnerB.uid));

    res.status(targetId ? 200 : 201).json({
      ...finalRecord.couple,
      partnerAName: finalRecord.partnerA?.name || null,
      partnerBName: finalRecord.partnerB?.name || null,
      partnerAAvatar: finalRecord.partnerA?.avatar || null,
      partnerBAvatar: finalRecord.partnerB?.avatar || null,
      partnerAAge: finalRecord.partnerA?.age || null,
      partnerBAge: finalRecord.partnerB?.age || null,
      partnerAGender: finalRecord.partnerA?.gender || null,
      partnerBGender: finalRecord.partnerB?.gender || null,
      whatALikes: finalRecord.partnerA?.whatLikes || null,
      whatBLikes: finalRecord.partnerB?.whatLikes || null,
      partnerAUser: finalRecord.partnerA,
      partnerBUser: finalRecord.partnerB,
    });
  } catch (err) {
    console.error("[POST /api/couple]", err);
    res.status(500).json({ error: "Failed to save couple profile" });
  }
});

// ── Invite Code: get or generate for a couple ──
app.get("/api/couple/invite/:uid", authenticateToken, async (req: Request, res: Response) => {
  try {
    const uid = String(req.params.uid);
    const [existingCouple] = await db.select().from(couple).where(
      sql`${couple.partnerAUid} = ${uid} OR ${couple.partnerBUid} = ${uid}`
    );
    if (!existingCouple) return res.status(404).json({ error: "No couple found for this user" });
    res.json({ inviteCode: existingCouple.inviteCode, status: existingCouple.status, coupleId: existingCouple.id });
  } catch (err) {
    console.error("[GET /api/couple/invite/:uid]", err);
    res.status(500).json({ error: "Failed to get invite code" });
  }
});

// ── Join couple using invite code ──
app.post("/api/couple/invite/join", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { uid, inviteCode } = req.body;
    if (!uid || !inviteCode) return res.status(400).json({ error: "uid and inviteCode are required" });
    
    const code = String(inviteCode).trim().toUpperCase();
    const [targetCouple] = await db.select().from(couple).where(eq(couple.inviteCode, code));
    if (!targetCouple) return res.status(404).json({ error: "Invalid invite code" });
    if (targetCouple.partnerBUid && targetCouple.partnerBUid !== uid) {
      return res.status(409).json({ error: "This couple is already linked to another partner" });
    }
    if (targetCouple.partnerAUid === uid) {
      return res.status(400).json({ error: "You cannot join your own couple" });
    }

    // Fetch partner B's appUser details
    const [userRecord] = await db.select().from(appUsers).where(eq(appUsers.uid, uid));

    // Link partner B and mark as active
    const [updated] = await db.update(couple)
      .set({ 
        partnerBUid: uid, 
        status: 'active',
      })
      .where(eq(couple.id, targetCouple.id))
      .returning();

    // Cleanup: If the joining user had a pending orphan couple as partnerA, delete it
    await db.delete(couple)
      .where(sql`${couple.partnerAUid} = ${uid} AND ${couple.status} = 'pending'`)
      .catch(() => {});

    // Update cycle tracking femaleUid if partner B is female
    if (userRecord?.gender?.toLowerCase() === 'female') {
      await db.update(cycleTracking)
        .set({ femaleUid: uid })
        .where(eq(cycleTracking.coupleId, targetCouple.id))
        .catch(() => {});
    }

    // Create progress record for partner B if none
    const [existingProgress] = await db.select().from(userProgress).where(eq(userProgress.userUid, uid));
    if (!existingProgress) {
      await db.insert(userProgress).values({ userUid: uid, coupleId: updated.id, scratchCount: 0, completedCount: 0, currentLevel: 1 }).catch(() => {});
    } else {
      await db.update(userProgress).set({ coupleId: updated.id }).where(eq(userProgress.userUid, uid)).catch(() => {});
    }

    broadcastAdminEvent({ type: "NEW_USER", message: `A partner just joined a couple!` });

    // Fetch and format the response record
    const partnerA = alias(appUsers, "partner_a");
    const partnerB = alias(appUsers, "partner_b");
    const [finalRecord] = await db
      .select({
        couple: couple,
        partnerA: partnerA,
        partnerB: partnerB,
      })
      .from(couple)
      .where(eq(couple.id, updated.id))
      .leftJoin(partnerA, eq(couple.partnerAUid, partnerA.uid))
      .leftJoin(partnerB, eq(couple.partnerBUid, partnerB.uid));

    res.json({
      ...finalRecord.couple,
      partnerAName: finalRecord.partnerA?.name || null,
      partnerBName: finalRecord.partnerB?.name || null,
      partnerAAvatar: finalRecord.partnerA?.avatar || null,
      partnerBAvatar: finalRecord.partnerB?.avatar || null,
      partnerAAge: finalRecord.partnerA?.age || null,
      partnerBAge: finalRecord.partnerB?.age || null,
      partnerAGender: finalRecord.partnerA?.gender || null,
      partnerBGender: finalRecord.partnerB?.gender || null,
      whatALikes: finalRecord.partnerA?.whatLikes || null,
      whatBLikes: finalRecord.partnerB?.whatLikes || null,
      partnerAUser: finalRecord.partnerA,
      partnerBUser: finalRecord.partnerB,
    });
  } catch (err) {
    console.error("[POST /api/couple/invite/join]", err);
    res.status(500).json({ error: "Failed to join couple" });
  }
});

app.patch("/api/couple/:uid", authenticateToken, async (req: Request, res: Response) => {
  try {
    const uid = String(req.params.uid);
    const { partnerAName, partnerBName, partnerAAge, partnerBAge, partnerAGender, partnerBGender } = req.body;
    
    const [existing] = await db.select().from(couple).where(
      sql`${couple.partnerAUid} = ${uid} OR ${couple.partnerBUid} = ${uid}`
    );

    if (!existing) {
      return res.status(404).json({ error: "Couple profile not found" });
    }

    // Update partner A in appUsers if creator
    if (existing.partnerAUid) {
      const pAUpdates: Record<string, any> = { updatedAt: new Date() };
      if (partnerAName !== undefined) pAUpdates.name = partnerAName;
      if (partnerAAge !== undefined) pAUpdates.age = partnerAAge === null ? null : Number(partnerAAge);
      if (partnerAGender !== undefined) pAUpdates.gender = partnerAGender;
      
      if (Object.keys(pAUpdates).length > 1) {
        await db.update(appUsers).set(pAUpdates).where(eq(appUsers.uid, existing.partnerAUid));
      }
    }

    // Update partner B in appUsers if linked
    if (existing.partnerBUid) {
      const pBUpdates: Record<string, any> = { updatedAt: new Date() };
      if (partnerBName !== undefined) pBUpdates.name = partnerBName;
      if (partnerBAge !== undefined) pBUpdates.age = partnerBAge === null ? null : Number(partnerBAge);
      if (partnerBGender !== undefined) pBUpdates.gender = partnerBGender;
      
      if (Object.keys(pBUpdates).length > 1) {
        await db.update(appUsers).set(pBUpdates).where(eq(appUsers.uid, existing.partnerBUid));
      }
    }

    // Fetch and format the response record
    const partnerA = alias(appUsers, "partner_a");
    const partnerB = alias(appUsers, "partner_b");
    const [finalRecord] = await db
      .select({
        couple: couple,
        partnerA: partnerA,
        partnerB: partnerB,
      })
      .from(couple)
      .where(eq(couple.id, existing.id))
      .leftJoin(partnerA, eq(couple.partnerAUid, partnerA.uid))
      .leftJoin(partnerB, eq(couple.partnerBUid, partnerB.uid));

    res.json({
      ...finalRecord.couple,
      partnerAName: finalRecord.partnerA?.name || null,
      partnerBName: finalRecord.partnerB?.name || null,
      partnerAAvatar: finalRecord.partnerA?.avatar || null,
      partnerBAvatar: finalRecord.partnerB?.avatar || null,
      partnerAAge: finalRecord.partnerA?.age || null,
      partnerBAge: finalRecord.partnerB?.age || null,
      partnerAGender: finalRecord.partnerA?.gender || null,
      partnerBGender: finalRecord.partnerB?.gender || null,
      whatALikes: finalRecord.partnerA?.whatLikes || null,
      whatBLikes: finalRecord.partnerB?.whatLikes || null,
      partnerAUser: finalRecord.partnerA,
      partnerBUser: finalRecord.partnerB,
    });
  } catch (err) {
    console.error("[PATCH /api/couple/:uid]", err);
    res.status(500).json({ error: "Failed to update couple profile" });
  }
});

app.delete("/api/couple/uid/:uid", authenticateToken, async (req: Request, res: Response) => {
  try {
    const uid = String(req.params.uid);
    const [existing] = await db.select().from(couple).where(
      sql`${couple.partnerAUid} = ${uid} OR ${couple.partnerBUid} = ${uid}`
    );

    if (!existing) {
      return res.status(404).json({ error: "Couple profile not found" });
    }

    const uids = [existing.partnerAUid, existing.partnerBUid].filter(Boolean) as string[];

    // Delete task history and progress
    if (uids.length > 0) {
      await db.delete(taskHistory).where(inArray(taskHistory.userUid, uids));
      await db.delete(userProgress).where(inArray(userProgress.userUid, uids));
    }

    // Delete couple
    await db.delete(couple).where(eq(couple.id, existing.id));

    // Get partner A's name for event message
    const [userA] = await db.select().from(appUsers).where(eq(appUsers.uid, existing.partnerAUid));
    const name = userA?.name || existing.partnerAUid;
    broadcastAdminEvent({ type: "USER_DELETED", message: `A user deleted their account: ${name}` });
    
    res.json({ success: true, deleted: true });
  } catch (err) {
    console.error("[DELETE /api/couple/uid/:uid]", err);
    res.status(500).json({ error: "Failed to delete couple profile" });
  }
});

app.delete("/api/couple/id/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(couple).where(eq(couple.id, id));

    if (!existing) {
      return res.status(404).json({ error: "Couple profile not found" });
    }

    const uids = [existing.partnerAUid, existing.partnerBUid].filter(Boolean) as string[];

    // Delete task history and progress
    if (uids.length > 0) {
      await db.delete(taskHistory).where(inArray(taskHistory.userUid, uids));
      await db.delete(userProgress).where(inArray(userProgress.userUid, uids));
    }

    // Delete couple
    await db.delete(couple).where(eq(couple.id, id));

    // Get partner A's name for event message
    const [userA] = await db.select().from(appUsers).where(eq(appUsers.uid, existing.partnerAUid));
    const name = userA?.name || existing.partnerAUid;
    broadcastAdminEvent({ type: "USER_DELETED", message: `Admin deleted an account: ${name}` });
    
    res.json({ success: true, deleted: true });
  } catch (err) {
    console.error("[DELETE /api/couple/id/:id]", err);
    res.status(500).json({ error: "Failed to delete couple profile" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USER PROGRESS
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/progress/:uid", authenticateToken, async (req: Request, res: Response) => {
  try {
    const uid = String(req.params.uid);
    const [progress] = await db.select().from(userProgress).where(eq(userProgress.userUid, uid));
    if (!progress) {
      res.status(404).json({ error: "User progress not found" });
      return;
    }
    res.json(progress);
  } catch (err) {
    console.error("[GET /api/progress/:uid]", err);
    res.status(500).json({ error: "Failed to fetch user progress" });
  }
});

app.patch("/api/progress/:uid/increment-completed", authenticateToken, async (req: Request, res: Response) => {
  try {
    const uid = String(req.params.uid);
    const [progress] = await db.select().from(userProgress).where(eq(userProgress.userUid, uid));
    if (!progress) {
      res.status(404).json({ error: "User progress not found" });
      return;
    }
    
    const completedCount = (progress.completedCount || 0) + 1;
    const newLevel = Math.floor(completedCount / 10) + 1;
    const oldLevel = progress.currentLevel || 1;
    const finalLevel = newLevel > oldLevel ? newLevel : oldLevel;

    const [updated] = await db
      .update(userProgress)
      .set({ completedCount, currentLevel: finalLevel, updatedAt: new Date() })
      .where(eq(userProgress.userUid, uid))
      .returning();
      
    res.json(updated);
  } catch (err) {
    console.error("[PATCH /api/progress/:uid/increment-completed]", err);
    res.status(500).json({ error: "Failed to increment progress" });
  }
});
app.post("/api/progress", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userUid, scratchCount, completedCount, currentLevel } = req.body;
    if (!userUid) return res.status(400).json({ error: "Missing userUid" });

    const [existing] = await db.select().from(userProgress).where(eq(userProgress.userUid, userUid));
    if (existing) {
      const [updated] = await db
        .update(userProgress)
        .set({ scratchCount: Number(scratchCount), completedCount: Number(completedCount), currentLevel: Number(currentLevel), updatedAt: new Date() })
        .where(eq(userProgress.userUid, userUid))
        .returning();
      res.json(updated);
    } else {
      const [inserted] = await db
        .insert(userProgress)
        .values({ userUid, scratchCount: Number(scratchCount || 0), completedCount: Number(completedCount || 0), currentLevel: Number(currentLevel || 1) })
        .returning();
      res.status(201).json(inserted);
    }
  } catch (err) {
    console.error("[POST /api/progress]", err);
    res.status(500).json({ error: "Failed to save user progress" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CYCLE TRACKING
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/cycle/:identifier", authenticateToken, async (req: Request, res: Response) => {
  try {
    const identifier = String(req.params.identifier);
    let coupleId: number | null = null;
    let femaleUid: string | null = null;

    if (/^\d+$/.test(identifier)) {
      coupleId = Number(identifier);
    } else {
      femaleUid = identifier;
      // Also try to find if a couple exists for this userUid
      const [coupleRow] = await db.select().from(couple).where(
        sql`${couple.partnerAUid} = ${femaleUid} OR ${couple.partnerBUid} = ${femaleUid}`
      );
      if (coupleRow) {
        coupleId = coupleRow.id;
      }
    }

    let existing = null;
    if (coupleId) {
      const [row] = await db.select().from(cycleTracking).where(eq(cycleTracking.coupleId, coupleId));
      existing = row;
    }
    
    // If not found by coupleId, try by femaleUid
    if (!existing && femaleUid) {
      const [row] = await db.select().from(cycleTracking).where(eq(cycleTracking.femaleUid, femaleUid));
      existing = row;
    }

    if (!existing) {
      // Return default values
      return res.json({
        coupleId,
        femaleUid,
        averageCycleLength: 28,
        averagePeriodLength: 5,
        lastPeriodStart: null,
        lastPeriodEnd: null,
        isLocked: false,
      });
    }
    res.json(existing);
  } catch (err) {
    console.error("[GET /api/cycle]", err);
    res.status(500).json({ error: "Failed to fetch cycle data" });
  }
});

app.put("/api/cycle/:identifier", authenticateToken, async (req: Request, res: Response) => {
  try {
    const identifier = String(req.params.identifier);
    let coupleId: number | null = null;
    let femaleUid: string | null = null;

    if (/^\d+$/.test(identifier)) {
      coupleId = Number(identifier);
    } else {
      femaleUid = identifier;
      const [coupleRow] = await db.select().from(couple).where(
        sql`${couple.partnerAUid} = ${femaleUid} OR ${couple.partnerBUid} = ${femaleUid}`
      );
      if (coupleRow) {
        coupleId = coupleRow.id;
      }
    }

    const { averageCycleLength, averagePeriodLength, lastPeriodStart, lastPeriodEnd, isLocked } = req.body;

    // Try to find if a cycleTracking row exists
    let existing = null;
    if (coupleId) {
      const [row] = await db.select().from(cycleTracking).where(eq(cycleTracking.coupleId, coupleId));
      existing = row;
    }
    if (!existing && femaleUid) {
      const [row] = await db.select().from(cycleTracking).where(eq(cycleTracking.femaleUid, femaleUid));
      existing = row;
    }

    // Auto-determine femaleUid if not already set (if we have a coupleId)
    if (coupleId && !femaleUid) {
      const [coupleRow] = await db.select().from(couple).where(eq(couple.id, coupleId));
      if (coupleRow) {
        const [userA] = await db.select({ gender: appUsers.gender }).from(appUsers).where(eq(appUsers.uid, coupleRow.partnerAUid));
        const isAFemale = userA?.gender?.toLowerCase() === 'female';
        if (isAFemale) {
          femaleUid = coupleRow.partnerAUid;
        } else if (coupleRow.partnerBUid) {
          const [userB] = await db.select({ gender: appUsers.gender }).from(appUsers).where(eq(appUsers.uid, coupleRow.partnerBUid));
          const isBFemale = userB?.gender?.toLowerCase() === 'female';
          if (isBFemale) {
            femaleUid = coupleRow.partnerBUid;
          }
        }
      }
    }

    if (existing) {
      if (existing.lastPeriodStart && lastPeriodStart && existing.lastPeriodStart !== lastPeriodStart) {
        await db.insert(cycleHistory).values({
          coupleId,
          femaleUid,
          periodStart: existing.lastPeriodStart,
          periodEnd: existing.lastPeriodEnd,
          cycleLength: existing.averageCycleLength,
        });
      }

      const [updated] = await db.update(cycleTracking)
        .set({
          coupleId: coupleId || existing.coupleId,
          femaleUid: femaleUid || existing.femaleUid,
          averageCycleLength: averageCycleLength ?? existing.averageCycleLength,
          averagePeriodLength: averagePeriodLength ?? existing.averagePeriodLength,
          lastPeriodStart: lastPeriodStart !== undefined ? lastPeriodStart : existing.lastPeriodStart,
          lastPeriodEnd: lastPeriodEnd !== undefined ? lastPeriodEnd : existing.lastPeriodEnd,
          isLocked: isLocked !== undefined ? isLocked : existing.isLocked,
          updatedAt: new Date(),
        })
        .where(eq(cycleTracking.id, existing.id))
        .returning();
      res.json(updated);
    } else {
      const [inserted] = await db.insert(cycleTracking)
        .values({
          coupleId,
          femaleUid,
          averageCycleLength: averageCycleLength ?? 28,
          averagePeriodLength: averagePeriodLength ?? 5,
          lastPeriodStart: lastPeriodStart ?? null,
          lastPeriodEnd: lastPeriodEnd ?? null,
          isLocked: isLocked ?? false,
        })
        .returning();
      res.status(201).json(inserted);
    }
  } catch (err) {
    console.error("[PUT /api/cycle]", err);
    res.status(500).json({ error: "Failed to update cycle data" });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// APP CONFIG (CONTENT MANAGEMENT)
// ─────────────────────────────────────────────────────────────────────────────
// Public GET (no auth) — used by app for FAQ, support, privacy, help, about
app.get("/api/config/public/:key", async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key);
    const [config] = await db.select().from(appConfig).where(eq(appConfig.key, key));
    if (!config) {
      res.status(404).json({ error: "Config not found", value: "" });
      return;
    }
    res.json(config);
  } catch (err) {
    console.error("[GET /api/config/public/:key]", err);
    res.status(500).json({ error: "Failed to fetch config" });
  }
});

// Admin GET (with auth)
app.get("/api/config/:key", authenticateToken, async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key);
    const [config] = await db.select().from(appConfig).where(eq(appConfig.key, key));
    if (!config) {
      res.status(404).json({ error: "Config not found", value: "" });
      return;
    }
    res.json(config);
  } catch (err) {
    console.error("[GET /api/config/:key]", err);
    res.status(500).json({ error: "Failed to fetch config" });
  }
});

app.post("/api/config/:key", authenticateToken, async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key);
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ error: "Missing value" });

    const [existing] = await db.select().from(appConfig).where(eq(appConfig.key, key));
    if (existing) {
      const [updated] = await db
        .update(appConfig)
        .set({ value, updatedAt: new Date() })
        .where(eq(appConfig.key, key))
        .returning();
      res.json(updated);
    } else {
      const [inserted] = await db
        .insert(appConfig)
        .values({ key, value })
        .returning();
      res.status(201).json(inserted);
    }
  } catch (err) {
    console.error("[POST /api/config/:key]", err);
    res.status(500).json({ error: "Failed to save config" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/users/push-token", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userUid, pushToken } = req.body;
    if (!userUid || !pushToken) return res.status(400).json({ error: "Missing userUid or pushToken" });

    const [existing] = await db.select().from(userProgress).where(eq(userProgress.userUid, userUid));
    if (existing) {
      await db.update(userProgress).set({ pushToken, updatedAt: new Date() }).where(eq(userProgress.userUid, userUid));
      res.json({ success: true });
    } else {
      await db.insert(userProgress).values({ userUid, pushToken, scratchCount: 0, completedCount: 0, currentLevel: 1 });
      res.json({ success: true });
    }
  } catch (err) {
    console.error("[POST /api/users/push-token]", err);
    res.status(500).json({ error: "Failed to save push token" });
  }
});

app.post("/api/notifications/send", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userPayload = (req as any).user;
    if (userPayload.role !== "superadmin" && userPayload.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ error: "Missing title or body" });

    const allProgress = await db.select({ pushToken: userProgress.pushToken }).from(userProgress);
    const tokens = allProgress.map(p => p.pushToken).filter(t => t && t.startsWith("ExponentPushToken"));
    const uniqueTokens = Array.from(new Set(tokens));

    if (uniqueTokens.length === 0) {
      return res.status(400).json({ error: "No users with registered push tokens found" });
    }

    const messages = uniqueTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
    }));

    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    let successCount = 0;
    for (const chunk of chunks) {
      const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
      if (expoRes.ok) successCount += chunk.length;
    }

    res.json({ success: true, count: successCount });
  } catch (err) {
    console.error("[POST /api/notifications/send]", err);
    res.status(500).json({ error: "Failed to send notifications" });
  }
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Unhandled Error]", err.message);
  res.status(500).json({ error: err.message });
});

// ─── Generic Upload ─────────────────────────────────────────────────────────────
app.post("/api/upload", authenticateToken, upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// ─── Preset Avatars Management ───────────────────────────────────────────────────
app.get("/api/preset-avatars", async (req: Request, res: Response) => {
  try {
    const list = await db.select().from(presetAvatars).orderBy(presetAvatars.id);
    res.json(list);
  } catch (err) {
    console.error("[GET /api/preset-avatars]", err);
    res.status(500).json({ error: "Failed to fetch preset avatars" });
  }
});

app.post("/api/preset-avatars", authenticateToken, upload.single("avatar"), async (req: Request, res: Response) => {
  try {
    const userPayload = (req as any).user;
    if (userPayload.role !== "superadmin" && userPayload.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const { name } = req.body;
    if (!name || !req.file) {
      return res.status(400).json({ error: "Name and image file are required" });
    }
    const url = `/uploads/${req.file.filename}`;
    const [inserted] = await db.insert(presetAvatars).values({ name, url }).returning();
    res.status(201).json(inserted);
  } catch (err) {
    console.error("[POST /api/preset-avatars]", err);
    res.status(500).json({ error: "Failed to upload preset avatar" });
  }
});

app.delete("/api/preset-avatars/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userPayload = (req as any).user;
    if (userPayload.role !== "superadmin" && userPayload.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const id = Number(req.params.id);
    const [existing] = await db.select().from(presetAvatars).where(eq(presetAvatars.id, id));
    if (!existing) {
      return res.status(404).json({ error: "Preset avatar not found" });
    }
    await db.delete(presetAvatars).where(eq(presetAvatars.id, id));
    
    if (existing.url.startsWith("/uploads/") && !existing.url.startsWith("/uploads/presets/")) {
      const filePath = path.join(__dirname, "../public", existing.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/preset-avatars/:id]", err);
    res.status(500).json({ error: "Failed to delete preset avatar" });
  }
});

async function seedDefaultAvatars() {
  try {
    const existing = await db.select().from(presetAvatars);
    if (existing.length === 0) {
      const defaults = [
        { name: "Boy", url: "/uploads/presets/avatar_boy.png" },
        { name: "Girl", url: "/uploads/presets/avatar_girl.png" },
        { name: "Cat", url: "/uploads/presets/avatar_cat.png" },
        { name: "Dog", url: "/uploads/presets/avatar_dog.png" },
      ];
      for (const item of defaults) {
        await db.insert(presetAvatars).values(item);
      }
      console.log("[Seeder] Populated default preset avatars");
    }
  } catch (err) {
    console.error("[Seeder] Failed to populate default avatars:", err);
  }
}

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Express server running on http://0.0.0.0:${PORT}`);
  console.log(`   Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`   Text tasks:   http://0.0.0.0:${PORT}/api/tasks/text`);
  console.log(`   Image tasks:  http://0.0.0.0:${PORT}/api/tasks/image\n`);
  seedDefaultAvatars();
});

