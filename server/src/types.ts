export type CelebrityStatus = "pending" | "approved" | "denied";

export type RelationshipType =
  | "friend"
  | "rival"
  | "ex"
  | "collaborator"
  | "nemesis"
  | "family"
  | "complicated"
  | "dating"
  | "engaged"
  | "married"
  | "situationship";

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  "friend",
  "rival",
  "ex",
  "collaborator",
  "nemesis",
  "family",
  "complicated",
  "dating",
  "engaged",
  "married",
  "situationship",
];

export interface CelebrityAttributes {
  age?: number;
  genres?: string[];
}

export interface Celebrity {
  id: string;
  name: string;
  handle: string;
  bio: string;
  personality: string;
  writingVoice: string;
  backstory: string;
  attributes: CelebrityAttributes;
  status: CelebrityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CelebrityRelationship {
  id: string;
  celebrityAId: string;
  celebrityBId: string;
  type: RelationshipType;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/** Relationship joined with both celebrities' display info. */
export interface RelationshipWithNames extends CelebrityRelationship {
  celebrityAName: string;
  celebrityAHandle: string;
  celebrityBName: string;
  celebrityBHandle: string;
}

export interface GenerationRequest {
  genres?: string[];
  vibeKeywords?: string[];
}

export type EventType =
  | "feud"
  | "romance"
  | "breakup"
  | "scandal"
  | "collab"
  | "announcement"
  | "mishap"
  | "milestone";

export const EVENT_TYPES: EventType[] = [
  "feud",
  "romance",
  "breakup",
  "scandal",
  "collab",
  "announcement",
  "mishap",
  "milestone",
];

export type EventStatus = "proposed" | "active" | "resolved" | "denied";

export interface EventParticipant {
  celebrityId: string;
  role: string;
  name: string;
  handle: string;
}

/** A relationship mutation an event proposes; applied when the event is approved. */
export interface RelationshipChange {
  celebrityAId: string;
  celebrityBId: string;
  action: "set" | "remove";
  type?: RelationshipType;
  description?: string;
}

export interface NarrativeEvent {
  id: string;
  title: string;
  description: string;
  type: EventType;
  status: EventStatus;
  relationshipChanges: RelationshipChange[];
  participants: EventParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface EventGenerationRequest {
  type?: EventType;
  prompt?: string;
  celebrityIds?: string[];
}

export interface Post {
  id: string;
  celebrityId: string;
  content: string;
  eventId?: string;
  replyToPostId?: string;
  createdAt: string;
}

/** Post joined with author info and engagement counts, as served to the feed. */
export interface FeedPost extends Post {
  celebrityName: string;
  celebrityHandle: string;
  likeCount: number;
  commentCount: number;
  /** Whether the requesting user has liked this post (set when signed in). */
  likedByMe?: boolean;
  /** Set when this post replies to another celebrity's post. */
  replyToHandle?: string;
  replyToName?: string;
}

export interface PostGenerationRequest {
  celebrityId: string;
  topic?: string;
  eventId?: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId?: string;
  /** Set when the comment was written by a celebrity (a reply in their thread). */
  celebrityId?: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface AutonomySettings {
  enabled: boolean;
  intervalMinutes: number;
  maxPostsPerTick: number;
  maxRepliesPerTick: number;
  maxCommentRepliesPerTick: number;
  /** 0-1 chance that a tick proposes a new narrative event (admin still approves). */
  eventChance: number;
}

export interface TickSummary {
  postsCreated: number;
  repliesCreated: number;
  commentRepliesCreated: number;
  eventProposed: string | null;
  details: string[];
  errors: string[];
}

export interface TickRun {
  id: string;
  startedAt: string;
  finishedAt?: string;
  trigger: "scheduled" | "manual";
  summary: TickSummary;
}

export type UserRole = "user" | "admin";
export type AuthProvider = "oidc" | "dev";

export interface User {
  id: string;
  provider: AuthProvider;
  subject: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
}

export type MemorySourceType = "event" | "post" | "relationship" | "manual";

export interface CelebrityMemory {
  id: string;
  celebrityId: string;
  content: string;
  sourceType: MemorySourceType;
  sourceId?: string;
  importance: number;
  createdAt: string;
}
