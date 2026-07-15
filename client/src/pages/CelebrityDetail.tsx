import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getCelebrity,
  getMemories,
  listPosts,
  listRelationships,
  setCelebrityRetired,
  updateCelebrity,
  updateCelebrityStatus,
} from "../api/client";
import type {
  Celebrity,
  CelebrityEdit,
  CelebrityMemory,
  FeedPost,
  RelationshipWithNames,
} from "../types";
import PostCard from "../components/PostCard";
import RelationshipEditor from "../components/RelationshipEditor";
import StatusBadge from "../components/StatusBadge";

interface FormState {
  name: string;
  handle: string;
  bio: string;
  personality: string;
  writingVoice: string;
  backstory: string;
  age: string;
  genres: string;
}

function toForm(c: Celebrity): FormState {
  return {
    name: c.name,
    handle: c.handle,
    bio: c.bio,
    personality: c.personality,
    writingVoice: c.writingVoice,
    backstory: c.backstory,
    age: c.attributes.age?.toString() ?? "",
    genres: (c.attributes.genres ?? []).join(", "),
  };
}

const labelClass = "block text-sm font-medium text-gray-500 uppercase tracking-wider mb-1.5";
const inputClass =
  "w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500";

export default function CelebrityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [celebrity, setCelebrity] = useState<Celebrity | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [relationships, setRelationships] = useState<RelationshipWithNames[]>([]);
  const [memories, setMemories] = useState<CelebrityMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function loadExtras(c: Celebrity) {
    if (c.status === "approved") {
      listPosts({ celebrityId: c.id }).then(setPosts).catch(console.error);
      listRelationships(c.id).then(setRelationships).catch(console.error);
      getMemories(c.id).then(setMemories).catch(console.error);
    }
  }

  useEffect(() => {
    if (!id) return;
    getCelebrity(id)
      .then((c) => {
        setCelebrity(c);
        setForm(toForm(c));
        loadExtras(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusUpdate(status: "approved" | "denied") {
    if (!id) return;
    setUpdating(true);
    try {
      await updateCelebrityStatus(id, status);
      navigate("/admin/influencers");
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  }

  async function handleRetire(retired: boolean) {
    if (!id) return;
    setUpdating(true);
    try {
      const updated = await setCelebrityRetired(id, retired);
      setCelebrity(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  }

  async function handleSave() {
    if (!id || !form || !celebrity) return;
    setSaving(true);
    setSaveError(null);
    try {
      const genres = form.genres
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const edit: CelebrityEdit = {
        name: form.name,
        handle: form.handle,
        bio: form.bio,
        personality: form.personality,
        writingVoice: form.writingVoice,
        backstory: form.backstory,
        attributes: {
          ...celebrity.attributes,
          age: form.age ? Number(form.age) : undefined,
          genres,
        },
      };
      const updated = await updateCelebrity(id, edit);
      setCelebrity(updated);
      setForm(toForm(updated));
      setEditing(false);
      // A significant edit may have written a rebrand memory
      if (updated.status === "approved") {
        getMemories(id).then(setMemories).catch(console.error);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    if (celebrity) setForm(toForm(celebrity));
    setSaveError(null);
    setEditing(false);
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!celebrity) return <p className="text-gray-500">Influencer not found.</p>;

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate(-1)}
        className="text-gray-400 hover:text-white text-sm mb-6 inline-block transition-colors"
      >
        &larr; Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="min-w-0">
          {editing && form ? (
            <div className="space-y-2">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`${inputClass} text-lg font-semibold`}
                placeholder="Name"
              />
              <input
                value={form.handle}
                onChange={(e) => setForm({ ...form, handle: e.target.value })}
                className={inputClass}
                placeholder="@handle"
              />
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-white truncate">{celebrity.name}</h2>
              <p className="text-purple-400 text-lg">{celebrity.handle}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {celebrity.retired && (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-500/20 text-gray-300 border-gray-500/40">
              retired
            </span>
          )}
          <StatusBadge status={celebrity.status} />
        </div>
      </div>

      {/* Edit toolbar */}
      <div className="flex gap-2 mb-6">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="border border-gray-600 text-gray-300 hover:text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              Edit
            </button>
            {celebrity.status === "approved" && (
              <button
                onClick={() => handleRetire(!celebrity.retired)}
                disabled={updating}
                className="border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 disabled:opacity-50 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                {updating ? "..." : celebrity.retired ? "Un-retire" : "Retire"}
              </button>
            )}
          </>
        )}
      </div>
      {saveError && <p className="text-red-400 text-sm mb-4">{saveError}</p>}

      {editing && form ? (
        /* ---- Edit form ---- */
        <div className="space-y-5 mb-8">
          <div>
            <label className={labelClass}>Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={2}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Personality</label>
            <textarea
              value={form.personality}
              onChange={(e) => setForm({ ...form, personality: e.target.value })}
              rows={4}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Writing Voice</label>
            <textarea
              value={form.writingVoice}
              onChange={(e) => setForm({ ...form, writingVoice: e.target.value })}
              rows={4}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Backstory</label>
            <textarea
              value={form.backstory}
              onChange={(e) => setForm({ ...form, backstory: e.target.value })}
              rows={6}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Age</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Genres (comma-separated)</label>
              <input
                value={form.genres}
                onChange={(e) => setForm({ ...form, genres: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <p className="text-gray-600 text-xs">
            Changing name, personality, writing voice, or backstory on an approved influencer
            records a "rebrand" memory so they remember evolving.
          </p>
        </div>
      ) : (
        /* ---- Read-only view ---- */
        <>
          <section className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Bio</h3>
            <p className="text-gray-300">{celebrity.bio}</p>
          </section>

          <section className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
              Personality
            </h3>
            <p className="text-gray-300">{celebrity.personality}</p>
          </section>

          <section className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
              Writing Voice
            </h3>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 italic text-gray-300">
              {celebrity.writingVoice}
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
              Backstory
            </h3>
            <div className="text-gray-300 whitespace-pre-line">{celebrity.backstory}</div>
          </section>

          <section className="mb-8">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
              Attributes
            </h3>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
              {celebrity.attributes.age && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Age</span>
                  <span className="text-white">{celebrity.attributes.age}</span>
                </div>
              )}
              {celebrity.attributes.genres && celebrity.attributes.genres.length > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-gray-400">Genres</span>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {celebrity.attributes.genres.map((g) => (
                      <span
                        key={g}
                        className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Relationships — editable inline for approved influencers */}
      {celebrity.status === "approved" && !editing && (
        <RelationshipEditor celebrity={celebrity} />
      )}

      {/* Memories */}
      {celebrity.status === "approved" && !editing && memories.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
            Memories
          </h3>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
            {memories.map((m) => (
              <div key={m.id} className="text-sm text-gray-300 flex gap-2">
                <span className="text-gray-600 shrink-0" title={`Importance ${m.importance}/10`}>
                  {m.importance}/10
                </span>
                <span>{m.content}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Posts */}
      {celebrity.status === "approved" && !editing && posts.length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Posts</h3>
          <div className="space-y-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} celebrityLinkBase="/admin/celebrities" />
            ))}
          </div>
        </section>
      )}

      {/* Approve / deny for pending influencers */}
      {celebrity.status === "pending" && !editing && (
        <div className="flex gap-4">
          <button
            onClick={() => handleStatusUpdate("approved")}
            disabled={updating}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-medium px-8 py-2.5 rounded-lg transition-colors"
          >
            {updating ? "Updating..." : "Approve"}
          </button>
          <button
            onClick={() => handleStatusUpdate("denied")}
            disabled={updating}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-medium px-8 py-2.5 rounded-lg transition-colors"
          >
            {updating ? "Updating..." : "Deny"}
          </button>
        </div>
      )}
    </div>
  );
}
