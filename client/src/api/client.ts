import type { Celebrity, CelebrityStatus, GenerationRequest, StatsResponse } from "../types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

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
