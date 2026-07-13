import { useEffect, useState } from "react";
import {
  generateEvent,
  generateReactions,
  listCelebrities,
  listEvents,
  updateEventStatus,
} from "../api/client";
import { EVENT_TYPES } from "../types";
import type { Celebrity, EventStatus, EventType, NarrativeEvent } from "../types";

const STATUS_STYLES: Record<EventStatus, string> = {
  proposed: "bg-yellow-500/20 text-yellow-300",
  active: "bg-green-500/20 text-green-300",
  resolved: "bg-blue-500/20 text-blue-300",
  denied: "bg-red-500/20 text-red-300",
};

function EventCard({
  event,
  onChanged,
}: {
  event: NarrativeEvent;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reactionCount, setReactionCount] = useState<number | null>(null);

  async function transition(status: EventStatus) {
    setBusy(status);
    setError(null);
    try {
      await updateEventStatus(event.id, status);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleReactions() {
    setBusy("reactions");
    setError(null);
    try {
      const posts = await generateReactions(event.id);
      setReactionCount(posts.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reaction generation failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-white font-semibold text-lg">{event.title}</h3>
          <span className="text-gray-500 text-xs uppercase tracking-wider">{event.type}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[event.status]}`}>
          {event.status}
        </span>
      </div>

      <p className="text-gray-300 text-sm whitespace-pre-line mb-3">{event.description}</p>

      <div className="mb-3">
        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Participants</p>
        <div className="flex gap-2 flex-wrap">
          {event.participants.map((p) => (
            <span key={p.celebrityId} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
              {p.name} — {p.role}
            </span>
          ))}
        </div>
      </div>

      {event.relationshipChanges.length > 0 && (
        <div className="mb-3">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
            Relationship changes {event.status === "proposed" ? "(applied on approval)" : ""}
          </p>
          <ul className="text-xs text-gray-400 space-y-0.5">
            {event.relationshipChanges.map((rc, i) => (
              <li key={i}>
                {rc.action === "remove" ? "Remove relationship" : `Set to "${rc.type}"`}
                {rc.description ? ` — ${rc.description}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {event.status === "proposed" && (
          <>
            <button
              onClick={() => transition("active")}
              disabled={busy !== null}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white text-sm px-4 py-1.5 rounded transition-colors"
            >
              {busy === "active" ? "Approving..." : "Approve"}
            </button>
            <button
              onClick={() => transition("denied")}
              disabled={busy !== null}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white text-sm px-4 py-1.5 rounded transition-colors"
            >
              {busy === "denied" ? "Denying..." : "Deny"}
            </button>
          </>
        )}
        {event.status === "active" && (
          <>
            <button
              onClick={handleReactions}
              disabled={busy !== null}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white text-sm px-4 py-1.5 rounded transition-colors"
            >
              {busy === "reactions" ? "Generating reactions..." : "Generate Reactions"}
            </button>
            <button
              onClick={() => transition("resolved")}
              disabled={busy !== null}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm px-4 py-1.5 rounded transition-colors"
            >
              {busy === "resolved" ? "Resolving..." : "Resolve"}
            </button>
          </>
        )}
      </div>
      {reactionCount !== null && (
        <p className="mt-2 text-green-400 text-sm">
          {reactionCount} reaction post{reactionCount === 1 ? "" : "s"} generated — see the Feed.
        </p>
      )}
      {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
    </div>
  );
}

export default function Events() {
  const [events, setEvents] = useState<NarrativeEvent[]>([]);
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [filter, setFilter] = useState<EventStatus | "">("");
  const [eventType, setEventType] = useState<EventType | "">("");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh(status?: EventStatus) {
    try {
      setEvents(await listEvents(status));
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    Promise.all([listEvents(), listCelebrities("approved")])
      .then(([e, c]) => {
        setEvents(e);
        setCelebrities(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      await generateEvent({
        type: eventType || undefined,
        prompt: prompt || undefined,
      });
      setPrompt("");
      await refresh(filter || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Event generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleFilterChange(status: EventStatus | "") {
    setFilter(status);
    await refresh(status || undefined);
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-3xl font-bold text-white mb-8">Narrative Engine</h2>

      {/* Generator */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">Generate Event</h3>
        {celebrities.length < 1 ? (
          <p className="text-gray-500 text-sm">Approve some celebrities first.</p>
        ) : (
          <>
            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Type (optional)</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as EventType | "")}
                  className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">Surprise me</option>
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-48">
                <label className="block text-gray-400 text-sm mb-1">
                  Creative direction (optional)
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., someone gets caught in a lie at an award show"
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium px-5 py-2 rounded-lg transition-colors"
              >
                {generating ? "Generating..." : "Generate"}
              </button>
            </div>
            {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
          </>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-gray-400 text-sm">Filter:</label>
        <select
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value as EventStatus | "")}
          className="bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500"
        >
          <option value="">All</option>
          <option value="proposed">Proposed</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
          <option value="denied">Denied</option>
        </select>
      </div>

      {/* Events */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : events.length === 0 ? (
        <p className="text-gray-500">No events yet. Generate one above.</p>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} onChanged={() => refresh(filter || undefined)} />
          ))}
        </div>
      )}
    </div>
  );
}
