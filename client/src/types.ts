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

export interface StatsResponse {
  pending: number;
  approved: number;
  denied: number;
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

export interface FeedPost {
  id: string;
  celebrityId: string;
  content: string;
  eventId?: string;
  replyToPostId?: string;
  createdAt: string;
  celebrityName: string;
  celebrityHandle: string;
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  replyToHandle?: string;
  replyToName?: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId?: string;
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
  maxPeerCommentsPerTick: number;
  eventChance: number;
}

export interface TickSummary {
  postsCreated: number;
  repliesCreated: number;
  commentRepliesCreated: number;
  /** May be absent on runs recorded before peer comments existed. */
  peerCommentsCreated?: number;
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

export interface AutonomyStatus {
  settings: AutonomySettings;
  tickRunning: boolean;
  recentRuns: TickRun[];
}

export type UserRole = "user" | "admin";

export interface User {
  id: string;
  provider: "oidc" | "dev";
  subject: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthInfo {
  user: User | null;
  oidcConfigured: boolean;
  devLoginAllowed: boolean;
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
