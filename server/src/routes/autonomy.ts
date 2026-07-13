import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import {
  getSettings,
  isTickRunning,
  listTickRuns,
  runTick,
  updateSettings,
} from "../services/autonomy.js";
import type { AutonomySettings } from "../types.js";

export const autonomyRouter = Router();

// Settings + recent tick history
autonomyRouter.get("/api/autonomy", requireAdmin, (_req: Request, res: Response) => {
  try {
    res.json({
      settings: getSettings(),
      tickRunning: isTickRunning(),
      recentRuns: listTickRuns(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load autonomy status";
    res.status(500).json({ error: message });
  }
});

autonomyRouter.patch("/api/autonomy/settings", requireAdmin, (req: Request, res: Response) => {
  try {
    const patch = req.body as Partial<AutonomySettings>;
    res.json(updateSettings(patch));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings";
    res.status(500).json({ error: message });
  }
});

// Run a tick immediately
autonomyRouter.post("/api/autonomy/tick", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const run = await runTick("manual");
    res.status(201).json(run);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tick failed";
    res.status(500).json({ error: message });
  }
});
