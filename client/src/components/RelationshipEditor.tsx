import { useEffect, useMemo, useState } from "react";
import {
  createRelationship,
  deleteRelationship,
  listCelebrities,
  listRelationships,
} from "../api/client";
import { RELATIONSHIP_TYPES } from "../types";
import type { Celebrity, RelationshipType, RelationshipWithNames } from "../types";

/**
 * Inline relationship management for one influencer, used inside the detail
 * page. Only meaningful for approved influencers (relationships need two
 * approved parties).
 */
export default function RelationshipEditor({ celebrity }: { celebrity: Celebrity }) {
  const [relationships, setRelationships] = useState<RelationshipWithNames[]>([]);
  const [others, setOthers] = useState<Celebrity[]>([]);
  const [targetId, setTargetId] = useState("");
  const [type, setType] = useState<RelationshipType>("friend");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setRelationships(await listRelationships(celebrity.id));
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    refresh();
    listCelebrities("approved")
      .then((all) => setOthers(all.filter((c) => c.id !== celebrity.id)))
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrity.id]);

  // Don't offer influencers this one is already tied to
  const relatedIds = useMemo(
    () =>
      new Set(
        relationships.map((r) =>
          r.celebrityAId === celebrity.id ? r.celebrityBId : r.celebrityAId
        )
      ),
    [relationships, celebrity.id]
  );
  const available = others.filter((o) => !relatedIds.has(o.id));

  async function handleAdd() {
    if (!targetId) return;
    setBusy(true);
    setError(null);
    try {
      await createRelationship({
        celebrityAId: celebrity.id,
        celebrityBId: targetId,
        type,
        description: description || undefined,
      });
      setTargetId("");
      setDescription("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add relationship");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await deleteRelationship(id);
      await refresh();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <section className="mb-6">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
        Relationships
      </h3>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
        {relationships.length === 0 ? (
          <p className="text-gray-500 text-sm">No relationships yet.</p>
        ) : (
          <div className="space-y-2">
            {relationships.map((r) => {
              const isA = r.celebrityAId === celebrity.id;
              const otherName = isA ? r.celebrityBName : r.celebrityAName;
              const otherHandle = isA ? r.celebrityBHandle : r.celebrityAHandle;
              return (
                <div key={r.id} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-300 flex-1">
                    {otherName} <span className="text-gray-600">{otherHandle}</span>
                  </span>
                  <span className="text-purple-400">{r.type}</span>
                  <button
                    onClick={() => handleRemove(r.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                    title="Remove relationship"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add form */}
        {available.length > 0 ? (
          <div className="border-t border-gray-700/60 pt-3 flex gap-2 flex-wrap items-end">
            <div className="flex-1 min-w-40">
              <label className="block text-gray-500 text-xs mb-1">Influencer</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="">Select...</option>
                {available.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as RelationshipType)}
                className="bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                {RELATIONSHIP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-gray-500 text-xs mb-1">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="how they know each other"
                className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={busy || !targetId}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm px-4 py-1.5 rounded transition-colors"
            >
              {busy ? "Adding..." : "Add"}
            </button>
          </div>
        ) : (
          others.length > 0 && (
            <p className="text-gray-600 text-xs border-t border-gray-700/60 pt-3">
              Already connected to every other approved influencer.
            </p>
          )
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </section>
  );
}
