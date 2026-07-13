import type { NextFunction, Request, Response } from "express";
import { verifySessionToken } from "../services/session.js";
import { getUserById } from "../services/user.js";
import type { User } from "../types.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const SESSION_COOKIE = "buzz_session";

/**
 * Resolves the current user from the session cookie or an Authorization
 * bearer token (the latter is what a future mobile client will send).
 * Never rejects — downstream guards decide.
 */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  const token = (req.cookies?.[SESSION_COOKIE] as string | undefined) ?? bearer;
  if (token) {
    const userId = await verifySessionToken(token);
    if (userId) {
      req.user = getUserById(userId);
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
