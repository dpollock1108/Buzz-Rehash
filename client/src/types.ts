export type CelebrityStatus = "pending" | "approved" | "denied";

export type RelationshipType =
  | "friend"
  | "rival"
  | "ex"
  | "collaborator"
  | "nemesis"
  | "family"
  | "complicated";

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

export interface GenerationRequest {
  genres?: string[];
  vibeKeywords?: string[];
}

export interface StatsResponse {
  pending: number;
  approved: number;
  denied: number;
}
