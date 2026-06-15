import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db } from "./db/client";
import { textTasks, imageTasks, spinWheelItems, lotteryItems, adminUsers, couple, userProgress, taskHistory, appConfig } from "./db/schema";
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
    const [couplesResult] = await db.select({ count: sql<number>`count(*)` }).from(couple);
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

    const totalCouples = Number(couplesResult.count);

    res.json({
      totalCouples,
      totalUsers: totalCouples * 2,
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
    const couples = await db.select().from(couple).orderBy(couple.createdAt);
    res.json(couples);
  } catch (err) {
    console.error("[GET /api/couples]", err);
    res.status(500).json({ error: "Failed to fetch couples" });
  }
});

app.get("/api/couples/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [coupleData] = await db.select().from(couple).where(eq(couple.id, id));
    if (!coupleData) {
      res.status(404).json({ error: "Couple not found" });
      return;
    }
    res.json(coupleData);
  } catch (err) {
    console.error("[GET /api/couples/:id]", err);
    res.status(500).json({ error: "Failed to fetch couple" });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
// COUPLE PROFILE
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/couple/:uid", authenticateToken, async (req: Request, res: Response) => {
  try {
    const uid = String(req.params.uid);
    // Find couple profile where this user is partnerA or partnerB
    const profiles = await db.select().from(couple).where(
      sql`${couple.partnerAUid} = ${uid} OR ${couple.partnerBUid} = ${uid}`
    );
    if (profiles.length === 0) {
      res.status(404).json({ error: "Couple profile not found" });
      return;
    }
    res.json(profiles[0]);
  } catch (err) {
    console.error("[GET /api/couple/:uid]", err);
    res.status(500).json({ error: "Failed to fetch couple profile" });
  }
});

app.post("/api/couple", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id, partnerAUid, partnerBUid, partnerAName, partnerBName, partnerAAge, partnerBAge, partnerAGender, partnerBGender, whatALikes, whatBLikes } = req.body;
    if (!partnerAUid || !partnerAName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (id) {
      const [updated] = await db
        .update(couple)
        .set({ partnerAUid, partnerBUid, partnerAName, partnerBName, partnerAAge, partnerBAge, partnerAGender, partnerBGender, whatALikes, whatBLikes })
        .where(eq(couple.id, Number(id)))
        .returning();
      res.json(updated);
    } else {
      const [inserted] = await db
        .insert(couple)
        .values({ partnerAUid, partnerBUid, partnerAName, partnerBName, partnerAAge, partnerBAge, partnerAGender, partnerBGender, whatALikes, whatBLikes })
        .returning();
      res.status(201).json(inserted);
    }
  } catch (err) {
    console.error("[POST /api/couple]", err);
    res.status(500).json({ error: "Failed to save couple profile" });
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
// APP CONFIG (CONTENT MANAGEMENT)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Express server running on http://0.0.0.0:${PORT}`);
  console.log(`   Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`   Text tasks:   http://0.0.0.0:${PORT}/api/tasks/text`);
  console.log(`   Image tasks:  http://0.0.0.0:${PORT}/api/tasks/image\n`);
});
