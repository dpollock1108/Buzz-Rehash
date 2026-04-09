import { useEffect, useState } from "react";
import { listCelebrities } from "../api/client";
import type { Celebrity } from "../types";
import CelebrityCard from "../components/CelebrityCard";

export default function PendingReview() {
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    listCelebrities("pending")
      .then(setCelebrities)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">Pending Review</h2>
        <button
          onClick={load}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : celebrities.length === 0 ? (
        <p className="text-gray-500">No pending celebrities. Generate some from the Dashboard.</p>
      ) : (
        <div className="space-y-4">
          {celebrities.map((c) => (
            <CelebrityCard key={c.id} celebrity={c} />
          ))}
        </div>
      )}
    </div>
  );
}
