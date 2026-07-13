import { useState } from "react";
import { Link } from "react-router-dom";
import { addComment, listComments, toggleLike } from "../api/client";
import { useAuth } from "../auth";
import SignInButtons from "./SignInButtons";
import type { Comment, FeedPost } from "../types";

export default function PostCard({
  post,
  celebrityLinkBase = "/celebrity",
}: {
  post: FeedPost;
  /** Admin pages link into the admin detail view; public pages to the profile. */
  celebrityLinkBase?: string;
}) {
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [likedByMe, setLikedByMe] = useState(post.likedByMe ?? false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLike() {
    if (!user) return;
    try {
      const result = await toggleLike(post.id);
      setLikeCount(result.likeCount);
      setLikedByMe(result.liked);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleToggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments === null) {
      try {
        setComments(await listComments(post.id));
      } catch (err) {
        console.error(err);
      }
    }
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    setBusy(true);
    try {
      const comment = await addComment(post.id, commentText);
      setComments((prev) => [...(prev ?? []), comment]);
      setCommentCount((c) => c + 1);
      setCommentText("");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
      <div className="flex items-baseline gap-2 mb-2">
        <Link
          to={`${celebrityLinkBase}/${post.celebrityId}`}
          className="text-white font-semibold hover:text-purple-300 transition-colors"
        >
          {post.celebrityName}
        </Link>
        <span className="text-purple-400 text-sm">{post.celebrityHandle}</span>
        <span className="text-gray-600 text-xs ml-auto">
          {new Date(post.createdAt).toLocaleString()}
        </span>
      </div>
      <p className="text-gray-200 whitespace-pre-line mb-3">{post.content}</p>
      <div className="flex gap-4 text-sm">
        <button
          onClick={handleLike}
          disabled={!user}
          title={user ? undefined : "Sign in to like"}
          className={`transition-colors ${
            likedByMe ? "text-pink-400" : "text-gray-400 hover:text-pink-400"
          } disabled:cursor-not-allowed`}
        >
          ♥ {likeCount}
        </button>
        <button
          onClick={handleToggleComments}
          className="text-gray-400 hover:text-white transition-colors"
        >
          💬 {commentCount}
        </button>
      </div>

      {showComments && (
        <div className="mt-4 border-t border-gray-700 pt-3 space-y-2">
          {(comments ?? []).map((c) => (
            <div key={c.id} className="text-sm">
              <span className="text-gray-300 font-medium">{c.authorName}</span>{" "}
              <span className="text-gray-400">{c.content}</span>
            </div>
          ))}
          {comments !== null && comments.length === 0 && (
            <p className="text-gray-600 text-sm">No comments yet.</p>
          )}
          {user ? (
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder={`Comment as ${user.displayName}...`}
                className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleAddComment}
                disabled={busy || !commentText.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm px-3 py-1.5 rounded transition-colors"
              >
                Post
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 pt-1">
              <span className="text-gray-500 text-sm">Sign in to join the conversation:</span>
              <SignInButtons compact />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
