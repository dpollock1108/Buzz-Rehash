import { Router } from "express";
import type { Request, Response } from "express";
import { generateCelebrity } from "../services/generator.js";
import {
  createCelebrity,
  listByStatus,
  getById,
  updateStatus,
  getCounts,
} from "../services/celebrity.js";
import { listMemories } from "../services/memory.js";
import { requireAdmin } from "../middleware/auth.js";
import type { CelebrityStatus, GenerationRequest } from "../types.js";

export const celebritiesRouter = Router();

// Generate a new celebrity
celebritiesRouter.post("/api/celebrities/generate", requireAdmin, async (req: Request, res: Response) => {
  try {
    const request = req.body as GenerationRequest | undefined;
    const generated = await generateCelebrity(request);
    const celebrity = createCelebrity(generated);
    res.status(201).json(celebrity);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    res.status(500).json({ error: message });
  }
});

// List celebrities, optionally filtered by status.
// Non-admins only ever see the approved cast.
celebritiesRouter.get("/api/celebrities", (req: Request, res: Response) => {
  try {
    const isAdmin = req.user?.role === "admin";
    let status = req.query.status as CelebrityStatus | undefined;
    if (status && !["pending", "approved", "denied"].includes(status)) {
      res.status(400).json({ error: "Invalid status filter" });
      return;
    }
    if (!isAdmin) status = "approved";
    const celebrities = listByStatus(status);
    res.json(celebrities);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list celebrities";
    res.status(500).json({ error: message });
  }
});

// Get stats
celebritiesRouter.get("/api/celebrities/stats", requireAdmin, (_req: Request, res: Response) => {
  try {
    const stats = getCounts();
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get stats";
    res.status(500).json({ error: message });
  }
});

// Get single celebrity (non-admins can only see approved ones)
celebritiesRouter.get("/api/celebrities/:id", (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const celebrity = getById(id);
    if (!celebrity || (req.user?.role !== "admin" && celebrity.status !== "approved")) {
      res.status(404).json({ error: "Celebrity not found" });
      return;
    }
    res.json(celebrity);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get celebrity";
    res.status(500).json({ error: message });
  }
});

// Get a celebrity's memories (internal lore — admin only)
celebritiesRouter.get("/api/celebrities/:id/memories", requireAdmin, (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!getById(id)) {
      res.status(404).json({ error: "Celebrity not found" });
      return;
    }
    res.json(listMemories(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list memories";
    res.status(500).json({ error: message });
  }
});

// Update celebrity status (approve/deny)
celebritiesRouter.patch("/api/celebrities/:id/status", requireAdmin, (req: Request, res: Response) => {
  try {
    const { status } = req.body as { status: CelebrityStatus };
    if (!status || !["approved", "denied"].includes(status)) {
      res.status(400).json({ error: "Status must be 'approved' or 'denied'" });
      return;
    }
    const id = req.params.id as string;
    const celebrity = updateStatus(id, status);
    if (!celebrity) {
      res.status(404).json({ error: "Celebrity not found" });
      return;
    }
    res.json(celebrity);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update status";
    res.status(500).json({ error: message });
  }
});
