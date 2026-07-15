import { useEffect, useState } from "react";
import { listPosts } from "../api/client";
import { useAuth } from "../auth";
import PostCard from "../components/PostCard";
import type { FeedPost } from "../types";

export default function PublicFeed() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for the session so likedByMe is included for signed-in users
    if (authLoading) return;
    listPosts()
      .then(setPosts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authLoading, user?.id]);

  return (
    <div>
      {loading ? (
        <p className="text-gray-500">Loading the drama...</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-500">Nothing here yet. The influencers are being quiet.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={`${post.id}-${post.likedByMe}`} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
