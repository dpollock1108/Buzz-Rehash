import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { getEventById, listEvents } from "../services/event.js";
import { generateEvent, generateReactions, transitionEvent } from "../services/narrative.js";
import type { EventGenerationRequest, EventStatus } from "../types.js";

export const eventsRouter = Router();

const VALID_STATUSES: EventStatus[] = ["proposed", "active", "resolved", "denied"];

// Generate a new narrative event (lands in 'proposed' for admin review)
eventsRouter.post("/api/events/generate", requireAdmin, async (req: Request, res: Response) => {
  try {
    const request = req.body as EventGenerationRequest | undefined;
    const event = await generateEvent(request);
    res.status(201).json(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Event generation failed";
    res.status(500).json({ error: message });
  }
});

eventsRouter.get("/api/events", requireAdmin, (req: Request, res: Response) => {
  try {
    const status = req.query.status as EventStatus | undefined;
    if (status && !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: "Invalid status filter" });
      return;
    }
    res.json(listEvents(status));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list events";
    res.status(500).json({ error: message });
  }
});

eventsRouter.get("/api/events/:id", requireAdmin, (req: Request, res: Response) => {
  try {
    const event = getEventById(req.params.id as string);
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get event";
    res.status(500).json({ error: message });
  }
});

// Transition status: approving (-> active) applies relationship changes and
// writes participant memories
eventsRouter.patch("/api/events/:id/status", requireAdmin, (req: Request, res: Response) => {
  try {
    const { status } = req.body as { status: EventStatus };
    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
      return;
    }
    const event = transitionEvent(req.params.id as string, status);
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update event";
    res.status(500).json({ error: message });
  }
});

// Generate reaction posts from each participant of an active event
eventsRouter.post("/api/events/:id/reactions", requireAdmin, async (req: Request, res: Response) => {
  try {
    const posts = await generateReactions(req.params.id as string);
    res.status(201).json(posts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate reactions";
    res.status(500).json({ error: message });
  }
});
