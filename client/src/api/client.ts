import type {
  AuthInfo,
  Celebrity,
  CelebrityMemory,
  CelebrityStatus,
  Comment,
  EventGenerationRequest,
  EventStatus,
  FeedPost,
  GenerationRequest,
  NarrativeEvent,
  RelationshipType,
  RelationshipWithNames,
  StatsResponse,
  User,
} from "../types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// --- Auth ---

export function getAuthInfo(): Promise<AuthInfo> {
  return request<AuthInfo>("/api/auth/me");
}

export function devLogin(name?: string): Promise<{ user: User }> {
  return request<{ user: User }>("/api/auth/dev-login", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function logout(): Promise<void> {
  return request<void>("/api/auth/logout", { method: "POST" });
}

// --- Celebrities ---

export function generateCelebrity(req?: GenerationRequest): Promise<Celebrity> {
  return request<Celebrity>("/api/celebrities/generate", {
    method: "POST",
    body: JSON.stringify(req || {}),
  });
}

export function listCelebrities(status?: CelebrityStatus): Promise<Celebrity[]> {
  const params = status ? `?status=${status}` : "";
  return request<Celebrity[]>(`/api/celebrities${params}`);
}

export function getCelebrity(id: string): Promise<Celebrity> {
  return request<Celebrity>(`/api/celebrities/${id}`);
}

export function updateCelebrityStatus(id: string, status: CelebrityStatus): Promise<Celebrity> {
  return request<Celebrity>(`/api/celebrities/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getStats(): Promise<StatsResponse> {
  return request<StatsResponse>("/api/celebrities/stats");
}

export function getMemories(celebrityId: string): Promise<CelebrityMemory[]> {
  return request<CelebrityMemory[]>(`/api/celebrities/${celebrityId}/memories`);
}

// --- Posts ---

export function generatePost(req: {
  celebrityId: string;
  topic?: string;
  eventId?: string;
}): Promise<FeedPost> {
  return request<FeedPost>("/api/posts/generate", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function listPosts(options?: {
  celebrityId?: string;
  eventId?: string;
}): Promise<FeedPost[]> {
  const params = new URLSearchParams();
  if (options?.celebrityId) params.set("celebrityId", options.celebrityId);
  if (options?.eventId) params.set("eventId", options.eventId);
  const query = params.toString();
  return request<FeedPost[]>(`/api/posts${query ? `?${query}` : ""}`);
}

export function listComments(postId: string): Promise<Comment[]> {
  return request<Comment[]>(`/api/posts/${postId}/comments`);
}

export function addComment(postId: string, content: string): Promise<Comment> {
  return request<Comment>(`/api/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function toggleLike(postId: string): Promise<{ liked: boolean; likeCount: number }> {
  return request<{ liked: boolean; likeCount: number }>(`/api/posts/${postId}/like`, {
    method: "POST",
  });
}

// --- Events ---

export function generateEvent(req?: EventGenerationRequest): Promise<NarrativeEvent> {
  return request<NarrativeEvent>("/api/events/generate", {
    method: "POST",
    body: JSON.stringify(req || {}),
  });
}

export function listEvents(status?: EventStatus): Promise<NarrativeEvent[]> {
  const params = status ? `?status=${status}` : "";
  return request<NarrativeEvent[]>(`/api/events${params}`);
}

export function updateEventStatus(id: string, status: EventStatus): Promise<NarrativeEvent> {
  return request<NarrativeEvent>(`/api/events/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function generateReactions(eventId: string): Promise<FeedPost[]> {
  return request<FeedPost[]>(`/api/events/${eventId}/reactions`, { method: "POST" });
}

// --- Relationships ---

export function listRelationships(celebrityId?: string): Promise<RelationshipWithNames[]> {
  const params = celebrityId ? `?celebrityId=${celebrityId}` : "";
  return request<RelationshipWithNames[]>(`/api/relationships${params}`);
}

export function createRelationship(req: {
  celebrityAId: string;
  celebrityBId: string;
  type: RelationshipType;
  description?: string;
}): Promise<RelationshipWithNames> {
  return request<RelationshipWithNames>("/api/relationships", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function updateRelationship(
  id: string,
  req: { type?: RelationshipType; description?: string }
): Promise<RelationshipWithNames> {
  return request<RelationshipWithNames>(`/api/relationships/${id}`, {
    method: "PATCH",
    body: JSON.stringify(req),
  });
}

export function deleteRelationship(id: string): Promise<void> {
  return request<void>(`/api/relationships/${id}`, { method: "DELETE" });
}
