import { useEffect, useState } from "react";
import {
  createRelationship,
  deleteRelationship,
  listCelebrities,
  listRelationships,
} from "../api/client";
import { RELATIONSHIP_TYPES } from "../types";
import type { Celebrity, RelationshipType, RelationshipWithNames } from "../types";

export default function Relationships() {
  const [relationships, setRelationships] = useState<RelationshipWithNames[]>([]);
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [celebrityA, setCelebrityA] = useState("");
  const [celebrityB, setCelebrityB] = useState("");
  const [type, setType] = useState<RelationshipType>("friend");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setRelationships(await listRelationships());
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    Promise.all([listRelationships(), listCelebrities("approved")])
      .then(([r, c]) => {
        setRelationships(r);
        setCelebrities(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!celebrityA || !celebrityB) return;
    setBusy(true);
    setError(null);
    try {
      await createRelationship({
        celebrityAId: celebrityA,
        celebrityBId: celebrityB,
        type,
        description: description || undefined,
      });
      setCelebrityA("");
      setCelebrityB("");
      setDescription("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create relationship");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRelationship(id);
      await refresh();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-3xl font-bold text-white mb-8">Relationships</h2>

      {/* Create */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">Add Relationship</h3>
        {celebrities.length < 2 ? (
          <p className="text-gray-500 text-sm">You need at least two approved influencers.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Influencer A</label>
                <select
                  value={celebrityA}
                  onChange={(e) => setCelebrityA(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select...</option>
                  {celebrities
                    .filter((c) => c.id !== celebrityB)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Influencer B</label>
                <select
                  value={celebrityB}
                  onChange={(e) => setCelebrityB(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select...</option>
                  {celebrities
                    .filter((c) => c.id !== celebrityA)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as RelationshipType)}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {RELATIONSHIP_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-gray-400 text-sm mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., met at a brand event, been inseparable since"
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={busy || !celebrityA || !celebrityB}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium px-5 py-2 rounded-lg transition-colors"
              >
                {busy ? "Adding..." : "Add"}
              </button>
            </div>
            {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
          </>
        )}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : relationships.length === 0 ? (
        <p className="text-gray-500">
          No relationships yet. Add one above, or let the narrative engine create them through
          events.
        </p>
      ) : (
        <div className="space-y-3">
          {relationships.map((r) => (
            <div
              key={r.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-4"
            >
              <div className="flex-1">
                <p className="text-white">
                  {r.celebrityAName}{" "}
                  <span className="text-purple-400 text-sm mx-1">— {r.type} —</span>{" "}
                  {r.celebrityBName}
                </p>
                {r.description && <p className="text-gray-500 text-sm mt-1">{r.description}</p>}
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                className="text-gray-500 hover:text-red-400 text-sm transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
