import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCelebrity, updateCelebrityStatus } from "../api/client";
import type { Celebrity } from "../types";
import StatusBadge from "../components/StatusBadge";

export default function CelebrityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [celebrity, setCelebrity] = useState<Celebrity | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    getCelebrity(id)
      .then(setCelebrity)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusUpdate(status: "approved" | "denied") {
    if (!id) return;
    setUpdating(true);
    try {
      await updateCelebrityStatus(id, status);
      navigate("/pending");
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!celebrity) return <p className="text-gray-500">Celebrity not found.</p>;

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate(-1)}
        className="text-gray-400 hover:text-white text-sm mb-6 inline-block transition-colors"
      >
        &larr; Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">{celebrity.name}</h2>
          <p className="text-purple-400 text-lg">{celebrity.handle}</p>
        </div>
        <StatusBadge status={celebrity.status} />
      </div>

      {/* Bio */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Bio</h3>
        <p className="text-gray-300">{celebrity.bio}</p>
      </section>

      {/* Personality */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
          Personality
        </h3>
        <p className="text-gray-300">{celebrity.personality}</p>
      </section>

      {/* Writing Voice */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
          Writing Voice
        </h3>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 italic text-gray-300">
          {celebrity.writingVoice}
        </div>
      </section>

      {/* Backstory */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
          Backstory
        </h3>
        <div className="text-gray-300 whitespace-pre-line">{celebrity.backstory}</div>
      </section>

      {/* Attributes */}
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
                  <span key={g} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Actions */}
      {celebrity.status === "pending" && (
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
