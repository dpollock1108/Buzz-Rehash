import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/connection.js";
import type { AuthProvider, User, UserRole } from "../types.js";

interface UserRow {
  id: string;
  provider: AuthProvider;
  subject: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    provider: row.provider,
    subject: row.subject,
    email: row.email ?? undefined,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    role: row.role,
    createdAt: row.created_at,
  };
}

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getUserById(id: string): User | undefined {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? rowToUser(row) : undefined;
}

/**
 * Look up or create the account for an identity coming back from the identity
 * provider (or the dev login). Role: dev users are always admins; OIDC users
 * are admins when their email is listed in ADMIN_EMAILS.
 */
export function findOrCreateUser(identity: {
  provider: AuthProvider;
  subject: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
}): User {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM users WHERE provider = ? AND subject = ?")
    .get(identity.provider, identity.subject) as UserRow | undefined;

  const isAdmin =
    identity.provider === "dev" ||
    (identity.email !== undefined && adminEmails().has(identity.email.toLowerCase()));
  const role: UserRole = isAdmin ? "admin" : "user";

  if (existing) {
    // Keep profile fields and role in sync with the provider on every login
    db.prepare(
      "UPDATE users SET email = ?, display_name = ?, avatar_url = ?, role = ? WHERE id = ?"
    ).run(
      identity.email ?? existing.email,
      identity.displayName || existing.display_name,
      identity.avatarUrl ?? existing.avatar_url,
      role,
      existing.id
    );
    return getUserById(existing.id)!;
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO users (id, provider, subject, email, display_name, avatar_url, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    identity.provider,
    identity.subject,
    identity.email ?? null,
    identity.displayName,
    identity.avatarUrl ?? null,
    role,
    new Date().toISOString()
  );
  return getUserById(id)!;
}
