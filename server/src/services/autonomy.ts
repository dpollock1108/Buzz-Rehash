import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/connection.js";
import type { AutonomySettings, TickRun, TickSummary } from "../types.js";
import { listByStatus } from "./celebrity.js";
import { generateEvent } from "./narrative.js";
import { commentsAwaitingReply, listFeed } from "./post.js";
import { generateCommentReply, generatePost, generateReplyPost } from "./postGenerator.js";
import { listRelationships } from "./relationship.js";

const DEFAULT_SETTINGS: AutonomySettings = {
  enabled: false,
  intervalMinutes: 240,
  maxPostsPerTick: 2,
  maxRepliesPerTick: 1,
  maxCommentRepliesPerTick: 2,
  eventChance: 0.25,
};

// --- Settings (persisted as one JSON blob in the settings table) ---

export function getSettings(): AutonomySettings {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = 'autonomy'")
    .get() as { value: string } | undefined;
  if (!row) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...(JSON.parse(row.value) as Partial<AutonomySettings>) };
}

export function updateSettings(patch: Partial<AutonomySettings>): AutonomySettings {
  const merged = { ...getSettings(), ...patch };
  merged.intervalMinutes = Math.max(5, merged.intervalMinutes);
  merged.maxPostsPerTick = Math.max(0, Math.min(10, merged.maxPostsPerTick));
  merged.maxRepliesPerTick = Math.max(0, Math.min(10, merged.maxRepliesPerTick));
  merged.maxCommentRepliesPerTick = Math.max(0, Math.min(10, merged.maxCommentRepliesPerTick));
  merged.eventChance = Math.max(0, Math.min(1, merged.eventChance));
  getDb()
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES ('autonomy', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(JSON.stringify(merged), new Date().toISOString());
  return merged;
}

// --- Tick runs ---

interface TickRunRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  trigger: "scheduled" | "manual";
  summary: string;
}

function rowToTickRun(row: TickRunRow): TickRun {
  return {
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined,
    trigger: row.trigger,
    summary: JSON.parse(row.summary) as TickSummary,
  };
}

export function listTickRuns(limit = 10): TickRun[] {
  const rows = getDb()
    .prepare("SELECT * FROM tick_runs ORDER BY started_at DESC LIMIT ?")
    .all(limit) as TickRunRow[];
  return rows.map(rowToTickRun);
}

function pickRandom<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (pool.length > 0 && picked.length < count) {
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!);
  }
  return picked;
}

/** Sample without replacement, probability proportional to weight. */
function pickWeighted<T>(items: T[], weightOf: (item: T) => number, count: number): T[] {
  const pool = items.map((item) => ({ item, weight: Math.max(weightOf(item), 0) }));
  const picked: T[] = [];
  while (pool.length > 0 && picked.length < count) {
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    if (total <= 0) {
      picked.push(...pickRandom(pool.map((p) => p.item), count - picked.length));
      break;
    }
    let roll = Math.random() * total;
    const index = pool.findIndex((p) => (roll -= p.weight) <= 0);
    picked.push(pool.splice(index === -1 ? pool.length - 1 : index, 1)[0]!.item);
  }
  return picked;
}

function ageHours(isoTimestamp: string): number {
  return Math.max(0, (Date.now() - new Date(isoTimestamp).getTime()) / (60 * 60 * 1000));
}

/**
 * Half-life-style decay: fresh posts dominate, and nothing older than the
 * candidate window (below) is considered at all.
 */
function recencyWeight(isoTimestamp: string, tauHours: number): number {
  return Math.exp(-ageHours(isoTimestamp) / tauHours);
}

/** Posts older than this are no longer reply/comment candidates. */
const REPLY_WINDOW_HOURS = 72;

let tickInProgress = false;

export function isTickRunning(): boolean {
  return tickInProgress;
}

/**
 * One heartbeat of the world: a few celebrities post, someone might clap back
 * at another celebrity's post, comment threads get responses, and occasionally
 * a new event is proposed (which still waits for admin approval).
 */
export async function runTick(trigger: "scheduled" | "manual"): Promise<TickRun> {
  if (tickInProgress) throw new Error("A tick is already running");
  tickInProgress = true;

  const db = getDb();
  const id = uuidv4();
  const startedAt = new Date().toISOString();
  const summary: TickSummary = {
    postsCreated: 0,
    repliesCreated: 0,
    commentRepliesCreated: 0,
    eventProposed: null,
    details: [],
    errors: [],
  };
  db.prepare(
    "INSERT INTO tick_runs (id, started_at, trigger, summary) VALUES (?, ?, ?, ?)"
  ).run(id, startedAt, trigger, JSON.stringify(summary));

  const settings = getSettings();

  try {
    const cast = listByStatus("approved");

    // 1. Slice-of-life posts, preferring celebrities who haven't posted lately
    if (cast.length > 0 && settings.maxPostsPerTick > 0) {
      const recentPosters = new Set(
        listFeed({ limit: settings.maxPostsPerTick * 2 }).map((p) => p.celebrityId)
      );
      const quiet = cast.filter((c) => !recentPosters.has(c.id));
      const posters = pickRandom(quiet.length > 0 ? quiet : cast, settings.maxPostsPerTick);
      for (const celebrity of posters) {
        try {
          await generatePost({ celebrityId: celebrity.id });
          summary.postsCreated++;
          summary.details.push(`${celebrity.handle} posted`);
        } catch (error) {
          summary.errors.push(`post by ${celebrity.handle}: ${(error as Error).message}`);
        }
      }
    }

    // 2. Celebrity-to-celebrity replies, biased toward existing relationships.
    // Only fresh posts are candidates, and fresher + more-discussed posts are
    // proportionally more likely to draw a reply.
    if (settings.maxRepliesPerTick > 0) {
      const recentPosts = listFeed({ limit: 30, sinceHours: REPLY_WINDOW_HOURS }).filter(
        (p) => !p.replyToPostId
      );
      const relationships = listRelationships();
      const related = (a: string, b: string) =>
        relationships.some(
          (r) =>
            (r.celebrityAId === a && r.celebrityBId === b) ||
            (r.celebrityAId === b && r.celebrityBId === a)
        );

      const candidates: {
        replierId: string;
        replierHandle: string;
        postId: string;
        weight: number;
      }[] = [];
      for (const post of recentPosts) {
        const weight = recencyWeight(post.createdAt, 24) * (1 + post.commentCount);
        for (const celebrity of cast) {
          if (celebrity.id === post.celebrityId) continue;
          if (related(celebrity.id, post.celebrityId)) {
            candidates.push({
              replierId: celebrity.id,
              replierHandle: celebrity.handle,
              postId: post.id,
              weight,
            });
          }
        }
      }
      const picks = pickWeighted(candidates, (c) => c.weight, settings.maxRepliesPerTick);
      for (const pick of picks) {
        try {
          await generateReplyPost(pick.replierId, pick.postId);
          summary.repliesCreated++;
          summary.details.push(`${pick.replierHandle} replied to a post`);
        } catch (error) {
          summary.errors.push(`reply by ${pick.replierHandle}: ${(error as Error).message}`);
        }
      }
    }

    // 3. Celebrities respond to fans in their comment threads. Stale threads
    // age out of the pool (see commentsAwaitingReply); among fresh ones,
    // newer posts with more unanswered fan comments get answered first.
    if (settings.maxCommentRepliesPerTick > 0) {
      const threads = pickWeighted(
        commentsAwaitingReply(REPLY_WINDOW_HOURS),
        (t) => recencyWeight(t.postCreatedAt, 48) * (1 + t.pendingCount),
        settings.maxCommentRepliesPerTick
      );
      for (const thread of threads) {
        try {
          await generateCommentReply(thread.postId);
          summary.commentRepliesCreated++;
          summary.details.push(`comment thread answered on post ${thread.postId.slice(0, 8)}`);
        } catch (error) {
          summary.errors.push(`comment reply: ${(error as Error).message}`);
        }
      }
    }

    // 4. Occasionally propose the next narrative beat (still admin-approved)
    if (cast.length >= 2 && Math.random() < settings.eventChance) {
      try {
        const event = await generateEvent();
        summary.eventProposed = event.title;
        summary.details.push(`proposed event: "${event.title}"`);
      } catch (error) {
        summary.errors.push(`event proposal: ${(error as Error).message}`);
      }
    }
  } finally {
    tickInProgress = false;
    db.prepare("UPDATE tick_runs SET finished_at = ?, summary = ? WHERE id = ?").run(
      new Date().toISOString(),
      JSON.stringify(summary),
      id
    );
  }

  return listTickRuns(1)[0]!;
}

// --- Scheduler (in-process; maps to EventBridge/Cloud Scheduler in the cloud) ---

export function startScheduler(): void {
  setInterval(async () => {
    const settings = getSettings();
    if (!settings.enabled || tickInProgress) return;
    const [last] = listTickRuns(1);
    const dueAt = last
      ? new Date(last.startedAt).getTime() + settings.intervalMinutes * 60 * 1000
      : 0;
    if (Date.now() >= dueAt) {
      try {
        const run = await runTick("scheduled");
        console.log("World tick complete:", run.summary.details.join("; ") || "nothing to do");
      } catch (error) {
        console.error("World tick failed:", error);
      }
    }
  }, 60 * 1000).unref();
}
