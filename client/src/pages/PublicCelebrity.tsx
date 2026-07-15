import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCelebrity, listPosts, listRelationships } from "../api/client";
import { useAuth } from "../auth";
import PostCard from "../components/PostCard";
import type { Celebrity, FeedPost, RelationshipWithNames } from "../types";

export default function PublicCelebrity() {
  const { id } = useParams<{ id: string }>();
  const { loading: authLoading } = useAuth();
  const [celebrity, setCelebrity] = useState<Celebrity | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [relationships, setRelationships] = useState<RelationshipWithNames[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || authLoading) return;
    Promise.all([getCelebrity(id), listPosts({ celebrityId: id }), listRelationships(id)])
      .then(([c, p, r]) => {
        setCelebrity(c);
        setPosts(p);
        setRelationships(r);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, authLoading]);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!celebrity) return <p className="text-gray-500">This influencer doesn't exist. Iconic.</p>;

  return (
    <div>
      <Link to="/" className="text-gray-500 hover:text-white text-sm transition-colors">
        &larr; Back to feed
      </Link>

      <div className="mt-4 mb-6">
        <h1 className="text-3xl font-bold text-white">{celebrity.name}</h1>
        <p className="text-purple-400 text-lg">{celebrity.handle}</p>
        <p className="text-gray-300 mt-3">{celebrity.bio}</p>
        {celebrity.attributes.genres && celebrity.attributes.genres.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-3">
            {celebrity.attributes.genres.map((g) => (
              <span key={g} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      {relationships.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
            Known associations
          </h2>
          <div className="space-y-1.5">
            {relationships.map((r) => {
              const otherId = r.celebrityAId === celebrity.id ? r.celebrityBId : r.celebrityAId;
              const otherName =
                r.celebrityAId === celebrity.id ? r.celebrityBName : r.celebrityAName;
              return (
                <div key={r.id} className="flex justify-between gap-3 text-sm">
                  <Link
                    to={`/celebrity/${otherId}`}
                    className="text-gray-300 hover:text-purple-300 transition-colors"
                  >
                    {otherName}
                  </Link>
                  <span className="text-purple-400">{r.type}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <p className="text-gray-500">No posts yet.</p>
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
