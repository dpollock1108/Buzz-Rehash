import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { getById } from "../services/celebrity.js";
import {
  createRelationship,
  deleteRelationship,
  findBetween,
  listRelationships,
  updateRelationship,
} from "../services/relationship.js";
import { RELATIONSHIP_TYPES } from "../types.js";
import type { RelationshipType } from "../types.js";

export const relationshipsRouter = Router();

relationshipsRouter.get("/api/relationships", (req: Request, res: Response) => {
  try {
    res.json(listRelationships(req.query.celebrityId as string | undefined));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list relationships";
    res.status(500).json({ error: message });
  }
});

relationshipsRouter.post("/api/relationships", requireAdmin, (req: Request, res: Response) => {
  try {
    const { celebrityAId, celebrityBId, type, description } = req.body as {
      celebrityAId?: string;
      celebrityBId?: string;
      type?: RelationshipType;
      description?: string;
    };
    if (!celebrityAId || !celebrityBId || !type) {
      res.status(400).json({ error: "celebrityAId, celebrityBId, and type are required" });
      return;
    }
    if (celebrityAId === celebrityBId) {
      res.status(400).json({ error: "A celebrity cannot have a relationship with themselves" });
      return;
    }
    if (!RELATIONSHIP_TYPES.includes(type)) {
      res.status(400).json({ error: `type must be one of: ${RELATIONSHIP_TYPES.join(", ")}` });
      return;
    }
    if (!getById(celebrityAId) || !getById(celebrityBId)) {
      res.status(404).json({ error: "Celebrity not found" });
      return;
    }
    if (findBetween(celebrityAId, celebrityBId)) {
      res.status(409).json({ error: "These celebrities already have a relationship" });
      return;
    }
    res.status(201).json(createRelationship({ celebrityAId, celebrityBId, type, description }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create relationship";
    res.status(500).json({ error: message });
  }
});

relationshipsRouter.patch("/api/relationships/:id", requireAdmin, (req: Request, res: Response) => {
  try {
    const { type, description } = req.body as { type?: RelationshipType; description?: string };
    if (type && !RELATIONSHIP_TYPES.includes(type)) {
      res.status(400).json({ error: `type must be one of: ${RELATIONSHIP_TYPES.join(", ")}` });
      return;
    }
    const relationship = updateRelationship(req.params.id as string, { type, description });
    if (!relationship) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }
    res.json(relationship);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update relationship";
    res.status(500).json({ error: message });
  }
});

relationshipsRouter.delete("/api/relationships/:id", requireAdmin, (req: Request, res: Response) => {
  try {
    if (!deleteRelationship(req.params.id as string)) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete relationship";
    res.status(500).json({ error: message });
  }
});
