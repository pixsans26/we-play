import { Router, Request, Response } from "express";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { db } from "../db/client";
import { ludoTasks, ludoGameSessions } from "../db/schema";
import { authenticateToken } from "../middleware/auth";

export const ludoRouter = Router();

// ─── ADMIN: GET /api/tasks/ludo ────────────────────────────────────────────────
ludoRouter.get("/api/tasks/ludo", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { stepType, stepNumber, search, category, level } = req.query;

    const conditions: any[] = [];

    if (stepType && stepType !== "all") {
      conditions.push(eq(ludoTasks.stepType, String(stepType)));
    }
    if (stepNumber !== undefined && stepNumber !== "" && stepNumber !== "all") {
      conditions.push(eq(ludoTasks.stepNumber, parseInt(String(stepNumber), 10)));
    }
    if (category && category !== "all") {
      conditions.push(eq(ludoTasks.category, String(category)));
    }
    if (level && level !== "all") {
      conditions.push(eq(ludoTasks.level, parseInt(String(level), 10)));
    }
    if (search) {
      const q = `%${String(search).toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${ludoTasks.title}) LIKE ${q}`,
          sql`LOWER(${ludoTasks.description}) LIKE ${q}`
        )
      );
    }

    const tasks = await db
      .select()
      .from(ludoTasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${ludoTasks.stepNumber} ASC NULLS LAST, ${ludoTasks.id} ASC`);

    res.json(tasks);
  } catch (err) {
    console.error("[GET /api/tasks/ludo]", err);
    res.status(500).json({ error: "Failed to fetch Ludo tasks" });
  }
});

// ─── ADMIN: POST /api/tasks/ludo (Create / Update) ────────────────────────────
ludoRouter.post("/api/tasks/ludo", authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      id,
      stepNumber,
      stepType,
      title,
      description,
      category,
      performer,
      timerSeconds,
      level,
      imageUrl,
      categoryImageUrl,
      active,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required" });
    }

    const payload = {
      stepNumber: stepNumber !== undefined && stepNumber !== "" && stepNumber !== null ? parseInt(String(stepNumber), 10) : null,
      stepType: stepType || "normal",
      title: String(title).trim(),
      description: String(description).trim(),
      category: category || "Fun",
      performer: performer || "lander",
      timerSeconds: timerSeconds ? parseInt(String(timerSeconds), 10) : 0,
      level: level ? parseInt(String(level), 10) : 1,
      imageUrl: imageUrl ? String(imageUrl).trim() : null,
      categoryImageUrl: categoryImageUrl ? String(categoryImageUrl).trim() : null,
      active: active !== undefined ? Boolean(active) : true,
    };

    if (id && parseInt(String(id), 10) > 0) {
      const [updated] = await db
        .update(ludoTasks)
        .set(payload)
        .where(eq(ludoTasks.id, parseInt(String(id), 10)))
        .returning();
      return res.json(updated);
    }

    const [created] = await db.insert(ludoTasks).values(payload).returning();
    res.json(created);
  } catch (err) {
    console.error("[POST /api/tasks/ludo]", err);
    res.status(500).json({ error: "Failed to save Ludo task" });
  }
});

// ─── ADMIN: DELETE /api/tasks/ludo/:id ─────────────────────────────────────────
ludoRouter.delete("/api/tasks/ludo/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(ludoTasks).where(eq(ludoTasks.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/tasks/ludo/:id]", err);
    res.status(500).json({ error: "Failed to delete Ludo task" });
  }
});

// ─── ADMIN: POST /api/tasks/ludo/seed ──────────────────────────────────────────
ludoRouter.post("/api/tasks/ludo/seed", authenticateToken, async (_req: Request, res: Response) => {
  try {
    await seedDefaultLudoTasks(true);
    const all = await db.select().from(ludoTasks).orderBy(ludoTasks.id);
    res.json({ success: true, count: all.length, tasks: all });
  } catch (err) {
    console.error("[POST /api/tasks/ludo/seed]", err);
    res.status(500).json({ error: "Failed to seed Ludo tasks" });
  }
});

// ─── PUBLIC: GET /api/ludo/tasks (Active Tasks for Gameplay) ──────────────────
ludoRouter.get("/api/ludo/tasks", async (_req: Request, res: Response) => {
  try {
    const tasks = await db
      .select()
      .from(ludoTasks)
      .where(eq(ludoTasks.active, true))
      .orderBy(sql`${ludoTasks.stepNumber} ASC NULLS LAST, ${ludoTasks.id} ASC`);
    res.json(tasks);
  } catch (err) {
    console.error("[GET /api/ludo/tasks]", err);
    res.status(500).json({ error: "Failed to fetch active Ludo tasks" });
  }
});

// ─── GAME: GET /api/ludo/session/active ────────────────────────────────────────
ludoRouter.get("/api/ludo/session/active", async (req: Request, res: Response) => {
  try {
    const { uid, coupleId } = req.query;
    if (!uid && !coupleId) {
      return res.status(400).json({ error: "uid or coupleId query parameter required" });
    }

    const conditions: any[] = [eq(ludoGameSessions.status, "in_progress")];

    if (coupleId && parseInt(String(coupleId), 10) > 0) {
      conditions.push(eq(ludoGameSessions.coupleId, parseInt(String(coupleId), 10)));
    } else if (uid) {
      const userUid = String(uid);
      conditions.push(
        or(
          eq(ludoGameSessions.creatorUid, userUid),
          sql`${ludoGameSessions.players} LIKE ${'%' + userUid + '%'}`
        )
      );
    }

    const [active] = await db
      .select()
      .from(ludoGameSessions)
      .where(and(...conditions))
      .orderBy(desc(ludoGameSessions.updatedAt))
      .limit(1);

    if (!active) {
      return res.json({ session: null });
    }

    const parsedTokens = typeof active.tokens === "string" ? JSON.parse(active.tokens) : active.tokens;
    
    // Check if any moves were actually played in this session
    let hasPlayedMoves = false;
    if (active.lastDiceRoll !== null) {
      hasPlayedMoves = true;
    } else if (parsedTokens && typeof parsedTokens === "object") {
      for (const col of Object.keys(parsedTokens)) {
        if (Array.isArray(parsedTokens[col])) {
          for (const tok of parsedTokens[col]) {
            if (tok.state !== "base") {
              hasPlayedMoves = true;
              break;
            }
          }
        }
        if (hasPlayedMoves) break;
      }
    }

    // Only prompt to resume if moves were actually made and abandoned
    if (!hasPlayedMoves) {
      return res.json({ session: null });
    }

    res.json({
      session: {
        ...active,
        players: typeof active.players === "string" ? JSON.parse(active.players) : active.players,
        tokens: parsedTokens,
        activeTask: active.activeTask ? (typeof active.activeTask === "string" ? JSON.parse(active.activeTask) : active.activeTask) : null,
      },
    });
  } catch (err) {
    console.error("[GET /api/ludo/session/active]", err);
    res.status(500).json({ error: "Failed to fetch active Ludo session" });
  }
});

// ─── GAME: POST /api/ludo/session/start ───────────────────────────────────────
ludoRouter.post("/api/ludo/session/start", async (req: Request, res: Response) => {
  try {
    const { coupleId, creatorUid, playerCount = 2, players, tokensPerPlayer = 2 } = req.body;

    if (!creatorUid) {
      return res.status(400).json({ error: "creatorUid is required" });
    }

    // Mark previous in_progress sessions for this couple/creator as abandoned
    if (coupleId) {
      await db
        .update(ludoGameSessions)
        .set({ status: "abandoned", updatedAt: new Date() })
        .where(
          and(
            eq(ludoGameSessions.coupleId, parseInt(String(coupleId), 10)),
            eq(ludoGameSessions.status, "in_progress")
          )
        );
    } else {
      await db
        .update(ludoGameSessions)
        .set({ status: "abandoned", updatedAt: new Date() })
        .where(
          and(
            eq(ludoGameSessions.creatorUid, String(creatorUid)),
            eq(ludoGameSessions.status, "in_progress")
          )
        );
    }

    // Default players setup if not supplied
    const colors = ["red", "green", "yellow", "blue"];
    const resolvedPlayers = Array.isArray(players) && players.length >= playerCount
      ? players.slice(0, playerCount).map((p: any, i: number) => ({
          id: p.id || `player_${i}`,
          name: p.name || `Player ${i + 1}`,
          color: p.color || colors[i],
          avatar: p.avatar || null,
          completedTokens: 0,
        }))
      : Array.from({ length: playerCount }).map((_, i) => ({
          id: `player_${i}`,
          name: `Player ${i + 1}`,
          color: colors[i],
          avatar: null,
          completedTokens: 0,
        }));

    // Couples Ludo has 4 chips per player across 2P, 3P, and 4P modes
    const chipsCount = 4;
    const initialTokens: Record<string, Array<{ id: number; state: "base" | "track" | "home_run" | "home"; position: number }>> = {};
    for (let p = 0; p < playerCount; p++) {
      const color = resolvedPlayers[p].color;
      initialTokens[color] = Array.from({ length: chipsCount }).map((_, tIdx) => ({
        id: tIdx,
        state: "base",
        position: -1,
      }));
    }

    const [newSession] = await db
      .insert(ludoGameSessions)
      .values({
        coupleId: coupleId ? parseInt(String(coupleId), 10) : null,
        creatorUid: String(creatorUid),
        playerCount: parseInt(String(playerCount), 10),
        players: JSON.stringify(resolvedPlayers),
        tokens: JSON.stringify(initialTokens),
        tokensPerPlayer: chipsCount,
        currentTurn: 0,
        currentStep: "roll",
        lastDiceRoll: null,
        activeTask: null,
        status: "in_progress",
        winnerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.json({
      session: {
        ...newSession,
        players: resolvedPlayers,
        tokens: initialTokens,
        activeTask: null,
      },
    });
  } catch (err) {
    console.error("[POST /api/ludo/session/start]", err);
    res.status(500).json({ error: "Failed to start Ludo session" });
  }
});

// ─── GAME: PATCH /api/ludo/session/:id/sync ───────────────────────────────────
ludoRouter.patch("/api/ludo/session/:id/sync", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const {
      currentTurn,
      currentStep,
      lastDiceRoll,
      tokens,
      activeTask,
      status,
      winnerId,
      players,
    } = req.body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (currentTurn !== undefined) updateData.currentTurn = parseInt(String(currentTurn), 10);
    if (currentStep !== undefined) updateData.currentStep = String(currentStep);
    if (lastDiceRoll !== undefined) updateData.lastDiceRoll = lastDiceRoll !== null ? parseInt(String(lastDiceRoll), 10) : null;
    if (tokens !== undefined) updateData.tokens = typeof tokens === "string" ? tokens : JSON.stringify(tokens);
    if (activeTask !== undefined) updateData.activeTask = activeTask ? (typeof activeTask === "string" ? activeTask : JSON.stringify(activeTask)) : null;
    if (status !== undefined) updateData.status = String(status);
    if (winnerId !== undefined) updateData.winnerId = winnerId ? String(winnerId) : null;
    if (players !== undefined) updateData.players = typeof players === "string" ? players : JSON.stringify(players);

    const [updated] = await db
      .update(ludoGameSessions)
      .set(updateData)
      .where(eq(ludoGameSessions.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({
      session: {
        ...updated,
        players: typeof updated.players === "string" ? JSON.parse(updated.players) : updated.players,
        tokens: typeof updated.tokens === "string" ? JSON.parse(updated.tokens) : updated.tokens,
        activeTask: updated.activeTask ? (typeof updated.activeTask === "string" ? JSON.parse(updated.activeTask) : updated.activeTask) : null,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/ludo/session/:id/sync]", err);
    res.status(500).json({ error: "Failed to sync Ludo session" });
  }
});

// ─── GAME: POST /api/ludo/session/:id/task-complete ───────────────────────────
ludoRouter.post("/api/ludo/session/:id/task-complete", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { nextTurn, currentStep = "roll", tokens } = req.body;

    const updateData: any = {
      activeTask: null,
      currentStep,
      updatedAt: new Date(),
    };

    if (nextTurn !== undefined) {
      updateData.currentTurn = parseInt(String(nextTurn), 10);
    }
    if (tokens !== undefined) {
      updateData.tokens = typeof tokens === "string" ? tokens : JSON.stringify(tokens);
    }

    const [updated] = await db
      .update(ludoGameSessions)
      .set(updateData)
      .where(eq(ludoGameSessions.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({
      session: {
        ...updated,
        players: typeof updated.players === "string" ? JSON.parse(updated.players) : updated.players,
        tokens: typeof updated.tokens === "string" ? JSON.parse(updated.tokens) : updated.tokens,
        activeTask: null,
      },
    });
  } catch (err) {
    console.error("[POST /api/ludo/session/:id/task-complete]", err);
    res.status(500).json({ error: "Failed to complete Ludo task" });
  }
});

// ─── GAME: POST /api/ludo/session/:id/end ─────────────────────────────────────
ludoRouter.post("/api/ludo/session/:id/end", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { status = "completed", winnerId = null } = req.body;

    await db
      .update(ludoGameSessions)
      .set({
        status: String(status),
        winnerId: winnerId ? String(winnerId) : null,
        updatedAt: new Date(),
      })
      .where(eq(ludoGameSessions.id, id));

    res.json({ success: true, message: "Game session ended" });
  } catch (err) {
    console.error("[POST /api/ludo/session/:id/end]", err);
    res.status(500).json({ error: "Failed to end Ludo session" });
  }
});

// ─── SEEDER FOR DEFAULT LUDO TASKS ───────────────────────────────────────────
export async function seedDefaultLudoTasks(force = false) {
  try {
    const existing = await db.select().from(ludoTasks);
    if (existing.length > 0 && !force) {
      return;
    }

    if (force) {
      await db.delete(ludoTasks);
    }

    const defaultTasks: Array<{
      stepNumber: number | null;
      stepType: "normal" | "star" | "home_entry" | "home_stretch" | "home";
      title: string;
      description: string;
      category: string;
      performer: "lander" | "partner" | "both";
      timerSeconds: number;
      level: number;
    }> = [
      // ── SPECIAL STARS (Safe Zones on steps 1, 9, 14, 22, 27, 35, 40, 48) ────
      {
        stepNumber: 1,
        stepType: "star",
        title: "Red Star: Earlobe Lick & Nibble",
        description: "Gently nibble and warm-lick your partner's earlobe, whispering what you want to do to them later.",
        category: "Lick",
        performer: "lander",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 9,
        stepType: "star",
        title: "Safe Haven: French Kiss Sanctuary",
        description: "Pull your partner in close for a deep, slow French kiss for 25 uninterrupted seconds.",
        category: "Kiss",
        performer: "both",
        timerSeconds: 25,
        level: 2,
      },
      {
        stepNumber: 14,
        stepType: "star",
        title: "Green Star: Collarbone Trail & Lick",
        description: "Trace soft kisses down partner's neck to their collarbone, ending with a slow, warm lick.",
        category: "Lick",
        performer: "lander",
        timerSeconds: 35,
        level: 2,
      },
      {
        stepNumber: 22,
        stepType: "star",
        title: "Spicy Truth: Wildest Bedroom Fantasy",
        description: "Confess your dirtiest or wildest fantasy with your partner that you haven't dared to share yet.",
        category: "Truth",
        performer: "lander",
        timerSeconds: 60,
        level: 2,
      },
      {
        stepNumber: 27,
        stepType: "star",
        title: "Yellow Star: Lap Tease Dare",
        description: "Sit directly on your partner's lap facing them, wrap your arms around their neck, and tease them for 30 seconds.",
        category: "Dare",
        performer: "lander",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 35,
        stepType: "star",
        title: "Sensual Dare: Skin on Skin Warmth",
        description: "Slip your hands under your partner's shirt and caress their bare back and waist while kissing their throat.",
        category: "Dare",
        performer: "lander",
        timerSeconds: 45,
        level: 3,
      },
      {
        stepNumber: 40,
        stepType: "star",
        title: "Blue Star: Lip Bite & Tease",
        description: "Kiss your partner passionately, gently nibbling and sucking their lower lip until they sigh.",
        category: "Kiss",
        performer: "both",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 48,
        stepType: "star",
        title: "Sensual Dare: Body Scent Trail",
        description: "Breathe in deeply at your partner's neck and chest pulse points, planting intense kisses on each spot.",
        category: "Intimate",
        performer: "lander",
        timerSeconds: 35,
        level: 2,
      },

      // ── SPECIAL HOME GATEWAYS (Own Color: 12, 25, 38, 51 | Other Color: 120, 250, 380, 510) ────
      // Red Gateway (Step 12 - Gateway into Red Home Stretch)
      {
        stepNumber: 12,
        stepType: "home_entry",
        title: "Red Gateway (Own Color): Passionate Neck Nuzzle & Whisper",
        description: "You've reached your own Red Gateway! Pull your partner into a warm embrace, nuzzle their neck softly, and whisper what you desire tonight.",
        category: "Romantic",
        performer: "lander",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 120,
        stepType: "home_entry",
        title: "Red Gateway (Other Color): Gatekeeper's Tease Kiss",
        description: "You stopped on another color's gateway! Pay the gatekeeper's toll: sit close, cup your partner's face, and give them a slow 15-second teaser kiss.",
        category: "Kiss",
        performer: "lander",
        timerSeconds: 15,
        level: 2,
      },

      // Green Gateway (Step 25 - Gateway into Green Home Stretch)
      {
        stepNumber: 25,
        stepType: "home_entry",
        title: "Green Gateway (Own Color): Collarbone Trace & Kiss",
        description: "You've reached your own Green Gateway! Trace your partner's collarbone with your lips and tell them the moment you fell for them.",
        category: "Intimate",
        performer: "lander",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 250,
        stepType: "home_entry",
        title: "Green Gateway (Other Color): Gatekeeper's Cheek Nibble",
        description: "You entered another color's gateway! Pay the gatekeeper: give your partner an affectionate cheek nibble and whisper a flirty compliment.",
        category: "Dare",
        performer: "lander",
        timerSeconds: 20,
        level: 2,
      },

      // Yellow Gateway (Step 38 - Gateway into Yellow Home Stretch)
      {
        stepNumber: 38,
        stepType: "home_entry",
        title: "Yellow Gateway (Own Color): Sensual Slow Dance",
        description: "You've reached your own Yellow Gateway! Stand up, press bodies flush against each other, and slow dance in place for 30 seconds.",
        category: "Romantic",
        performer: "both",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 380,
        stepType: "home_entry",
        title: "Yellow Gateway (Other Color): Gatekeeper's Hand Kiss",
        description: "You stopped on another color's gateway! Hold your partner's hand, kiss each knuckle passionately, and look deep into their eyes.",
        category: "Romantic",
        performer: "lander",
        timerSeconds: 20,
        level: 2,
      },

      // Blue Gateway (Step 51 - Gateway into Blue Home Stretch)
      {
        stepNumber: 51,
        stepType: "home_entry",
        title: "Blue Gateway (Own Color): Waist Hold & Ear Whisper",
        description: "You've reached your own Blue Gateway! Wrap both arms around partner's waist, pull them into your chest, and whisper a sweet secret.",
        category: "Intimate",
        performer: "both",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 510,
        stepType: "home_entry",
        title: "Blue Gateway (Other Color): Gatekeeper's Breath Tease",
        description: "You landed on another color's gateway! Hover your lips against partner's neck and blow warm breath for 20 seconds without touching.",
        category: "Dare",
        performer: "lander",
        timerSeconds: 20,
        level: 2,
      },

      // ── SPECIAL HOME STRETCH TILES (Steps 101 to 105) ──────────────────────
      {
        stepNumber: 101,
        stepType: "home_stretch",
        title: "Home Stretch 1: Boobs & Chest Sensual Kisses",
        description: "Uncover your partner's chest/boobs, planting warm lingering kisses and gentle licks around them for 45 seconds.",
        category: "Lick",
        performer: "lander",
        timerSeconds: 45,
        level: 3,
      },
      {
        stepNumber: 102,
        stepType: "home_stretch",
        title: "Home Stretch 2: Armpit Kiss & Sensual Lick",
        description: "Partner raises their arm while you kiss along their inner arm into their armpit with a warm, tingling sensory lick.",
        category: "Lick",
        performer: "lander",
        timerSeconds: 30,
        level: 3,
      },
      {
        stepNumber: 103,
        stepType: "home_stretch",
        title: "Home Stretch 3: Groin & Inner Thigh Kiss Trail",
        description: "Kiss slowly along your partner's lower belly and inner thighs towards their private area, blowing warm breath and licking softly.",
        category: "Intimate",
        performer: "lander",
        timerSeconds: 45,
        level: 3,
      },
      {
        stepNumber: 104,
        stepType: "home_stretch",
        title: "Home Stretch 4: Intimate Private Parts Oral",
        description: "Slide down to your partner's intimate private area. Plant hot, lingering kisses and slow warm licks on their most sensitive spot.",
        category: "Intimate",
        performer: "lander",
        timerSeconds: 60,
        level: 3,
      },
      {
        stepNumber: 105,
        stepType: "home_stretch",
        title: "Home Stretch 5: Passion Climax Deep Makeout",
        description: "A breathless, hands-everywhere passionate French makeout session for 45 uninterrupted seconds right before entering Home!",
        category: "Kiss",
        performer: "both",
        timerSeconds: 45,
        level: 3,
      },

      // ── SPECIAL HOME GOAL / 4 CHIP PROGRESSION (Steps 901, 902, 903, 904, 999) ────
      {
        stepNumber: 901,
        stepType: "home",
        title: "1st Chip Home: Chest & Boobs Sensual Kisses",
        description: "Your 1st chip reached home! Uncover your partner's chest/boobs, planting warm lingering kisses and gentle licks around them for 45 seconds.",
        category: "Lick",
        performer: "lander",
        timerSeconds: 45,
        level: 3,
      },
      {
        stepNumber: 902,
        stepType: "home",
        title: "2nd Chip Home: Armpit & Inner Arm Sensual Lick",
        description: "Your 2nd chip reached home! Partner raises their arm while you kiss along their inner arm into their armpit with a warm, tingling sensory lick.",
        category: "Lick",
        performer: "lander",
        timerSeconds: 30,
        level: 3,
      },
      {
        stepNumber: 903,
        stepType: "home",
        title: "3rd Chip Home: Intimate Private Parts Oral & Kisses",
        description: "Your 3rd chip reached home! Slide down between partner's thighs for hot, breathless kisses and teasing licks on their most sensitive private area.",
        category: "Intimate",
        performer: "lander",
        timerSeconds: 60,
        level: 3,
      },
      {
        stepNumber: 904,
        stepType: "home",
        title: "4th Chip Home: Grand Champion's Ultimate Desire!",
        description: "Your chip made it home! The winner can demand ANY sexual desire in ANY style (any sex position, oral, fantasy, or roleplay) and partner MUST fulfill it",
        category: "Reward",
        performer: "partner",
        timerSeconds: 0,
        level: 3,
      },
      {
        stepNumber: 999,
        stepType: "home",
        title: "CHIP REACHED HOME: Ultimate Sex Desire!",
        description: "Your chip made it home! The winner can demand ANY sexual desire in ANY style (any sex position, oral, fantasy, or roleplay) and partner MUST fulfill it",
        category: "Reward",
        performer: "partner",
        timerSeconds: 0,
        level: 3,
      },

      // ── REGULAR TRACK STEPS (1 to 52) ──────────────────────────────────────
      {
        stepNumber: 2,
        stepType: "normal",
        title: "Dare: Seductive Neck Nibble",
        description: "Gently bite and suck on your partner's neck until you hear a soft sigh or gasp.",
        category: "Dare",
        performer: "lander",
        timerSeconds: 25,
        level: 2,
      },
      {
        stepNumber: 3,
        stepType: "normal",
        title: "Truth: First Dirty Thought",
        description: "When and where was the very first time you had a spicy or sexual thought about your partner?",
        category: "Truth",
        performer: "lander",
        timerSeconds: 45,
        level: 1,
      },
      {
        stepNumber: 4,
        stepType: "normal",
        title: "Lick: Collarbone Delight",
        description: "Lick a slow, warm line from partner's throat down to the hollow of their collarbone.",
        category: "Lick",
        performer: "lander",
        timerSeconds: 20,
        level: 2,
      },
      {
        stepNumber: 5,
        stepType: "normal",
        title: "Dare: Blindfolded Touch",
        description: "Partner closes their eyes. Run your fingers over their lips, throat, and chest to give them shivers.",
        category: "Dare",
        performer: "lander",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 6,
        stepType: "normal",
        title: "Kiss: French Kiss Tease",
        description: "Kiss partner passionately using tongue, but pull away suddenly right when they lean in for more.",
        category: "Kiss",
        performer: "lander",
        timerSeconds: 25,
        level: 2,
      },
      {
        stepNumber: 7,
        stepType: "normal",
        title: "Truth: Turn-On Confession",
        description: "What outfit, movement, or sound does your partner make that instantly turns you on the most?",
        category: "Truth",
        performer: "lander",
        timerSeconds: 45,
        level: 1,
      },
      {
        stepNumber: 8,
        stepType: "normal",
        title: "Dare: Dirty Whisper in Ear",
        description: "Put your lips right against your partner's ear and whisper your dirtiest bedroom wish in detail.",
        category: "Dare",
        performer: "lander",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 10,
        stepType: "normal",
        title: "Kiss: Chin-Tilt Deep Kiss",
        description: "Gently tilt partner's chin up with your thumb and index finger, giving them a slow, sensual kiss.",
        category: "Kiss",
        performer: "lander",
        timerSeconds: 20,
        level: 1,
      },
      {
        stepNumber: 11,
        stepType: "normal",
        title: "Lick: Ear to Neck Glide",
        description: "Lick partner's earlobe softly, then glide your warm tongue down the side of their neck.",
        category: "Lick",
        performer: "lander",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 13,
        stepType: "normal",
        title: "Dare: Straddle Lap Tease",
        description: "Straddle your partner's lap for 30 seconds with your hands resting on their chest or waist.",
        category: "Dare",
        performer: "both",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 15,
        stepType: "normal",
        title: "Truth: Craved Touch",
        description: "Where on your body do you crave your partner's hands or lips the most right at this moment?",
        category: "Truth",
        performer: "partner",
        timerSeconds: 45,
        level: 2,
      },
      {
        stepNumber: 16,
        stepType: "normal",
        title: "Kiss: 30-Second Makeout",
        description: "Lock lips in a deep, breathy makeout for 30 unbroken seconds without stopping.",
        category: "Kiss",
        performer: "both",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 17,
        stepType: "normal",
        title: "Dare: Shirt Button Tease",
        description: "Slowly unbutton the top two buttons of your partner's shirt or slide hands beneath their shirt.",
        category: "Dare",
        performer: "lander",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 18,
        stepType: "normal",
        title: "Lick: Inner Wrist Sensation",
        description: "Hold your partner's wrist, plant a soft kiss, and lightly lick their inner pulse point.",
        category: "Lick",
        performer: "lander",
        timerSeconds: 20,
        level: 1,
      },
      {
        stepNumber: 19,
        stepType: "normal",
        title: "Truth: Secret Kink or Roleplay",
        description: "What playful kink, costume, or roleplay scenario would you be excited to try together?",
        category: "Truth",
        performer: "lander",
        timerSeconds: 60,
        level: 2,
      },
      {
        stepNumber: 20,
        stepType: "normal",
        title: "Dare: Sensual Thigh Massage",
        description: "Give your partner a firm, slow thigh massage, tracing your hands up towards their upper thigh.",
        category: "Dare",
        performer: "lander",
        timerSeconds: 40,
        level: 2,
      },
      {
        stepNumber: 21,
        stepType: "normal",
        title: "Kiss: Butterfly & Lip Lock",
        description: "Flutter your eyelashes against partner's cheek, then melt into a sweet, wet kiss.",
        category: "Kiss",
        performer: "lander",
        timerSeconds: 25,
        level: 1,
      },
      {
        stepNumber: 23,
        stepType: "normal",
        title: "Lick: Jawline Trace & Nip",
        description: "Trace your partner's jawline with your tongue from ear to chin, finishing with a tender nip on the chin.",
        category: "Lick",
        performer: "lander",
        timerSeconds: 25,
        level: 2,
      },
      {
        stepNumber: 24,
        stepType: "normal",
        title: "Dare: Strip One Item",
        description: "Take off one article of clothing (socks, belt, jacket, or shirt) - partner chooses which!",
        category: "Dare",
        performer: "lander",
        timerSeconds: 30,
        level: 3,
      },
      {
        stepNumber: 26,
        stepType: "normal",
        title: "Truth: Hottest Shared Memory",
        description: "Describe the hottest, most passionate intimate moment you two have ever shared together.",
        category: "Truth",
        performer: "both",
        timerSeconds: 60,
        level: 2,
      },
      {
        stepNumber: 28,
        stepType: "normal",
        title: "Kiss: Face Cup Passion",
        description: "Cup your partner's face firmly in both hands and kiss them with deep, breathless hunger.",
        category: "Kiss",
        performer: "lander",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 29,
        stepType: "normal",
        title: "Lick: Belly Button Caress",
        description: "Expose your partner's stomach, kiss their ribcage, and leave a slow, warm lick around their navel.",
        category: "Lick",
        performer: "lander",
        timerSeconds: 25,
        level: 3,
      },
      {
        stepNumber: 30,
        stepType: "normal",
        title: "Truth: Forbidden Desires",
        description: "What is one naughty thought you've had during work, in public, or at an inappropriate time?",
        category: "Truth",
        performer: "lander",
        timerSeconds: 45,
        level: 2,
      },
      {
        stepNumber: 31,
        stepType: "normal",
        title: "Dare: Hands Bound Behind",
        description: "Partner keeps their hands behind their back while you kiss their neck, cheeks, and lips freely.",
        category: "Dare",
        performer: "lander",
        timerSeconds: 35,
        level: 2,
      },
      {
        stepNumber: 32,
        stepType: "normal",
        title: "Lick: Bare Shoulder Lick",
        description: "Slide partner's shirt off their shoulder, kiss the skin, and lick up to the base of their neck.",
        category: "Lick",
        performer: "lander",
        timerSeconds: 25,
        level: 2,
      },
      {
        stepNumber: 33,
        stepType: "normal",
        title: "Kiss: Lip Bite Challenge",
        description: "Gently pull partner's lower lip between your teeth, giving a playful bite before kissing deeply.",
        category: "Kiss",
        performer: "lander",
        timerSeconds: 20,
        level: 2,
      },
      {
        stepNumber: 34,
        stepType: "normal",
        title: "Truth: Turn-On Rating",
        description: "Be totally honest: on a scale from 1 to 10, how turned on are you right now, and why?",
        category: "Truth",
        performer: "lander",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 36,
        stepType: "normal",
        title: "Dare: Warm Breath Tease",
        description: "Hover your lips millimeters away from partner's lips and neck, breathing warmly without touching for 20s.",
        category: "Dare",
        performer: "lander",
        timerSeconds: 20,
        level: 2,
      },
      {
        stepNumber: 37,
        stepType: "normal",
        title: "Lick: Finger Tease",
        description: "Take partner's index finger between your lips, suck gently, and tease it with your tongue.",
        category: "Lick",
        performer: "lander",
        timerSeconds: 20,
        level: 2,
      },
      {
        stepNumber: 39,
        stepType: "normal",
        title: "Truth: Bedroom Confession",
        description: "What is something naughty or intense you want your partner to do to you tonight in bed?",
        category: "Truth",
        performer: "partner",
        timerSeconds: 45,
        level: 2,
      },
      {
        stepNumber: 41,
        stepType: "normal",
        title: "Kiss: Throat & Collarbone Kisses",
        description: "Shower partner's throat and collarbones with warm, lingering kisses while holding their waist.",
        category: "Kiss",
        performer: "lander",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 42,
        stepType: "normal",
        title: "Dare: Hip & Waist Trace",
        description: "Slowly trace your partner's waist and hips with warm hands, pulling them firmly against you.",
        category: "Dare",
        performer: "lander",
        timerSeconds: 35,
        level: 2,
      },
      {
        stepNumber: 43,
        stepType: "normal",
        title: "Truth: Riskiest Location",
        description: "What is the most daring or adventurous place you've fantasized about hooking up with your partner?",
        category: "Truth",
        performer: "lander",
        timerSeconds: 45,
        level: 2,
      },
      {
        stepNumber: 44,
        stepType: "normal",
        title: "Lick: Nape of the Neck",
        description: "Lift partner's hair, nuzzle the back of their neck, and leave a warm, wet lick that gives them shivers.",
        category: "Lick",
        performer: "lander",
        timerSeconds: 25,
        level: 2,
      },
      {
        stepNumber: 45,
        stepType: "normal",
        title: "Dare: Partner's Choice Command",
        description: "Partner gets to command you to perform ANY spicy physical action right now, and you must obey!",
        category: "Dare",
        performer: "partner",
        timerSeconds: 45,
        level: 3,
      },
      {
        stepNumber: 46,
        stepType: "normal",
        title: "Kiss: Hollywood Makeout",
        description: "Grab partner by the waist, pull them into your body, and kiss them with passionate intensity.",
        category: "Kiss",
        performer: "both",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 47,
        stepType: "normal",
        title: "Truth: Midnight Dream",
        description: "Share the most explicit or romantic dream you have ever had about your partner.",
        category: "Truth",
        performer: "lander",
        timerSeconds: 50,
        level: 2,
      },
      {
        stepNumber: 49,
        stepType: "normal",
        title: "Dare: Hot Breath & Lick",
        description: "Whisper something naughty on partner's neck, blow warm air, then lightly lick that exact spot.",
        category: "Dare",
        performer: "lander",
        timerSeconds: 30,
        level: 2,
      },
      {
        stepNumber: 50,
        stepType: "normal",
        title: "Kiss: Thigh Grip Deep Kiss",
        description: "Pull your partner close with hands on their thighs, kissing them deeply until you are both breathless.",
        category: "Kiss",
        performer: "both",
        timerSeconds: 35,
        level: 3,
      },
      {
        stepNumber: 52,
        stepType: "normal",
        title: "Final Gatekeeper Dare: Ultimate Makeout",
        description: "Give partner a breathless 40-second deep French kiss with hands roaming before stepping to home stretch!",
        category: "Kiss",
        performer: "both",
        timerSeconds: 40,
        level: 3,
      },
    ];

    for (const task of defaultTasks) {
      await db.insert(ludoTasks).values(task);
    }
    console.log(`[Seeder] Seeded ${defaultTasks.length} default Ludo tasks`);
  } catch (err) {
    console.error("[Seeder] Failed to seed default Ludo tasks:", err);
  }
}
