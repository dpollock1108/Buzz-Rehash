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
import type { CelebrityStatus, GenerationRequest } from "../types.js";

export const celebritiesRouter = Router();

// Generate a new celebrity
celebritiesRouter.post("/api/celebrities/generate", async (req: Request, res: Response) => {
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

// List celebrities, optionally filtered by status
celebritiesRouter.get("/api/celebrities", (req: Request, res: Response) => {
  try {
    const status = req.query.status as CelebrityStatus | undefined;
    if (status && !["pending", "approved", "denied"].includes(status)) {
      res.status(400).json({ error: "Invalid status filter" });
      return;
    }
    const celebrities = listByStatus(status);
    res.json(celebrities);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list celebrities";
    res.status(500).json({ error: message });
  }
});

// Get stats
celebritiesRouter.get("/api/celebrities/stats", (_req: Request, res: Response) => {
  try {
    const stats = getCounts();
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get stats";
    res.status(500).json({ error: message });
  }
});

// Get single celebrity
celebritiesRouter.get("/api/celebrities/:id", (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const celebrity = getById(id);
    if (!celebrity) {
      res.status(404).json({ error: "Celebrity not found" });
      return;
    }
    res.json(celebrity);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get celebrity";
    res.status(500).json({ error: message });
  }
});

// Update celebrity status (approve/deny)
celebritiesRouter.patch("/api/celebrities/:id/status", (req: Request, res: Response) => {
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
