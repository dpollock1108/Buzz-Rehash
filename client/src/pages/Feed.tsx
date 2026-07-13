import { useEffect, useState } from "react";
import { generatePost, listCelebrities, listPosts } from "../api/client";
import PostCard from "../components/PostCard";
import type { Celebrity, FeedPost } from "../types";

export default function Feed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [selectedCelebrity, setSelectedCelebrity] = useState("");
  const [topic, setTopic] = useState("");
  const [filterCelebrity, setFilterCelebrity] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh(celebrityId?: string) {
    try {
      setPosts(await listPosts(celebrityId ? { celebrityId } : undefined));
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    Promise.all([listPosts(), listCelebrities("approved")])
      .then(([p, c]) => {
        setPosts(p);
        setCelebrities(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    if (!selectedCelebrity) return;
    setGenerating(true);
    setError(null);
    try {
      await generatePost({ celebrityId: selectedCelebrity, topic: topic || undefined });
      setTopic("");
      await refresh(filterCelebrity || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleFilterChange(celebrityId: string) {
    setFilterCelebrity(celebrityId);
    await refresh(celebrityId || undefined);
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-3xl font-bold text-white mb-8">Feed</h2>

      {/* Generator */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">Generate Post</h3>
        {celebrities.length === 0 ? (
          <p className="text-gray-500 text-sm">Approve some celebrities first.</p>
        ) : (
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Celebrity</label>
              <select
                value={selectedCelebrity}
                onChange={(e) => setSelectedCelebrity(e.target.value)}
                className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="">Select...</option>
                {celebrities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.handle})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-gray-400 text-sm mb-1">Topic (optional)</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Leave empty for slice-of-life"
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedCelebrity}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium px-5 py-2 rounded-lg transition-colors"
            >
              {generating ? "Generating..." : "Generate"}
            </button>
          </div>
        )}
        {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-gray-400 text-sm">Filter:</label>
        <select
          value={filterCelebrity}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500"
        >
          <option value="">All celebrities</option>
          {celebrities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Posts */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-500">No posts yet. Generate one above.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} celebrityLinkBase="/admin/celebrities" />
          ))}
        </div>
      )}
    </div>
  );
}
