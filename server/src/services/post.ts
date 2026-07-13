import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/connection.js";
import type { Comment, FeedPost } from "../types.js";

interface FeedPostRow {
  id: string;
  celebrity_id: string;
  content: string;
  event_id: string | null;
  reply_to_post_id: string | null;
  created_at: string;
  celebrity_name: string;
  celebrity_handle: string;
  like_count: number;
  comment_count: number;
  reply_to_name: string | null;
  reply_to_handle: string | null;
}

const SELECT_FEED = `
  SELECT p.*, c.name AS celebrity_name, c.handle AS celebrity_handle,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
    (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comment_count,
    rc.name AS reply_to_name, rc.handle AS reply_to_handle
  FROM posts p
  JOIN celebrities c ON c.id = p.celebrity_id
  LEFT JOIN posts rp ON rp.id = p.reply_to_post_id
  LEFT JOIN celebrities rc ON rc.id = rp.celebrity_id
`;

function rowToFeedPost(row: FeedPostRow): FeedPost {
  return {
    id: row.id,
    celebrityId: row.celebrity_id,
    content: row.content,
    eventId: row.event_id ?? undefined,
    replyToPostId: row.reply_to_post_id ?? undefined,
    createdAt: row.created_at,
    celebrityName: row.celebrity_name,
    celebrityHandle: row.celebrity_handle,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    replyToName: row.reply_to_name ?? undefined,
    replyToHandle: row.reply_to_handle ?? undefined,
  };
}

export function createPost(data: {
  celebrityId: string;
  content: string;
  eventId?: string;
  replyToPostId?: string;
}): FeedPost {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO posts (id, celebrity_id, content, event_id, reply_to_post_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, data.celebrityId, data.content, data.eventId ?? null, data.replyToPostId ?? null, now);
  return getPostById(id)!;
}

export function getPostById(id: string): FeedPost | undefined {
  const row = getDb()
    .prepare(`${SELECT_FEED} WHERE p.id = ?`)
    .get(id) as FeedPostRow | undefined;
  return row ? rowToFeedPost(row) : undefined;
}

export function listFeed(options?: {
  celebrityId?: string;
  eventId?: string;
  limit?: number;
  offset?: number;
}): FeedPost[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (options?.celebrityId) {
    conditions.push("p.celebrity_id = ?");
    params.push(options.celebrityId);
  }
  if (options?.eventId) {
    conditions.push("p.event_id = ?");
    params.push(options.eventId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(`${SELECT_FEED} ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, options?.limit ?? 50, options?.offset ?? 0) as FeedPostRow[];
  return rows.map(rowToFeedPost);
}

/** Recent posts by a celebrity, used as anti-repetition context for generation. */
export function recentPostContents(celebrityId: string, limit = 5): string[] {
  const rows = getDb()
    .prepare("SELECT content FROM posts WHERE celebrity_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(celebrityId, limit) as { content: string }[];
  return rows.map((r) => r.content);
}

interface CommentRow {
  id: string;
  post_id: string;
  user_id: string | null;
  celebrity_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id ?? undefined,
    celebrityId: row.celebrity_id ?? undefined,
    authorName: row.author_name,
    content: row.content,
    createdAt: row.created_at,
  };
}

/** Add a comment authored by a user or by a celebrity (exactly one of the two). */
export function addComment(data: {
  postId: string;
  userId?: string;
  celebrityId?: string;
  authorName: string;
  content: string;
}): Comment {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO comments (id, post_id, user_id, celebrity_id, author_name, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, data.postId, data.userId ?? null, data.celebrityId ?? null, data.authorName, data.content, now);
  const row = db.prepare("SELECT * FROM comments WHERE id = ?").get(id) as CommentRow;
  return rowToComment(row);
}

/**
 * User comments awaiting a celebrity response: threads on a celebrity's posts
 * where fans commented after the celebrity's last reply (or with no reply yet).
 */
export function commentsAwaitingReply(limit = 20): {
  postId: string;
  celebrityId: string;
  comments: Comment[];
}[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT p.id AS post_id, p.celebrity_id
       FROM comments cm
       JOIN posts p ON p.id = cm.post_id
       WHERE cm.celebrity_id IS NULL
         AND cm.created_at > COALESCE(
           (SELECT MAX(c2.created_at) FROM comments c2
            WHERE c2.post_id = cm.post_id AND c2.celebrity_id IS NOT NULL),
           ''
         )
       ORDER BY cm.created_at DESC
       LIMIT ?`
    )
    .all(limit) as { post_id: string; celebrity_id: string }[];

  return rows.map((r) => ({
    postId: r.post_id,
    celebrityId: r.celebrity_id,
    comments: listComments(r.post_id),
  }));
}

export function listComments(postId: string): Comment[] {
  const rows = getDb()
    .prepare("SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC")
    .all(postId) as CommentRow[];
  return rows.map(rowToComment);
}

/** Toggle a like for a user; returns the new liked state and count. */
export function toggleLike(postId: string, userId: string): { liked: boolean; likeCount: number } {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM likes WHERE post_id = ? AND user_id = ?")
    .get(postId, userId) as { id: string } | undefined;

  if (existing) {
    db.prepare("DELETE FROM likes WHERE id = ?").run(existing.id);
  } else {
    db.prepare(
      "INSERT INTO likes (id, post_id, user_id, created_at) VALUES (?, ?, ?, ?)"
    ).run(uuidv4(), postId, userId, new Date().toISOString());
  }

  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM likes WHERE post_id = ?")
    .get(postId) as { count: number };
  return { liked: !existing, likeCount: count };
}

/** Which of the given posts the user has liked (for rendering like state). */
export function likedPostIds(userId: string, postIds: string[]): Set<string> {
  if (postIds.length === 0) return new Set();
  const placeholders = postIds.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`SELECT post_id FROM likes WHERE user_id = ? AND post_id IN (${placeholders})`)
    .all(userId, ...postIds) as { post_id: string }[];
  return new Set(rows.map((r) => r.post_id));
}
