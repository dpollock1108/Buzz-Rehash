import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateCelebrity, getStats } from "../api/client";
import type { StatsResponse } from "../types";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsResponse>({ pending: 0, approved: 0, denied: 0 });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generation options
  const [genres, setGenres] = useState("");
  const [vibeKeywords, setVibeKeywords] = useState("");

  useEffect(() => {
    getStats().then(setStats).catch(console.error);
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const request: Record<string, unknown> = {};
      if (genres) request.genres = genres.split(",").map((s) => s.trim());
      if (vibeKeywords) request.vibeKeywords = vibeKeywords.split(",").map((s) => s.trim());

      const celebrity = await generateCelebrity(request);
      navigate(`/admin/celebrities/${celebrity.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <h2 className="text-3xl font-bold text-white mb-8">Dashboard</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 text-center">
          <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
          <p className="text-gray-400 text-sm mt-1">Pending Review</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 text-center">
          <p className="text-3xl font-bold text-green-400">{stats.approved}</p>
          <p className="text-gray-400 text-sm mt-1">Approved</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 text-center">
          <p className="text-3xl font-bold text-red-400">{stats.denied}</p>
          <p className="text-gray-400 text-sm mt-1">Denied</p>
        </div>
      </div>

      {/* Generator */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Generate Celebrity</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Genres (optional, comma-separated)</label>
            <input
              type="text"
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              placeholder="e.g., fitness, comedy, drama"
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Vibe keywords (optional, comma-separated)</label>
            <input
              type="text"
              value={vibeKeywords}
              onChange={(e) => setVibeKeywords(e.target.value)}
              placeholder="e.g., chaotic, wholesome, unhinged"
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          {generating ? "Generating..." : "Generate New Celebrity"}
        </button>
        {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}
