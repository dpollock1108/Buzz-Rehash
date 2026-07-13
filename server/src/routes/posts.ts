import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  addComment,
  getPostById,
  likedPostIds,
  listComments,
  listFeed,
  toggleLike,
} from "../services/post.js";
import { generatePost } from "../services/postGenerator.js";
import type { FeedPost, PostGenerationRequest } from "../types.js";

export const postsRouter = Router();

function withLikeState(posts: FeedPost[], req: Request): FeedPost[] {
  if (!req.user) return posts;
  const liked = likedPostIds(
    req.user.id,
    posts.map((p) => p.id)
  );
  return posts.map((p) => ({ ...p, likedByMe: liked.has(p.id) }));
}

// Generate a post for a celebrity (optionally about a topic or event)
postsRouter.post("/api/posts/generate", requireAdmin, async (req: Request, res: Response) => {
  try {
    const request = req.body as PostGenerationRequest;
    if (!request?.celebrityId) {
      res.status(400).json({ error: "celebrityId is required" });
      return;
    }
    const post = await generatePost(request);
    res.status(201).json(post);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Post generation failed";
    res.status(500).json({ error: message });
  }
});

// The feed: all posts with author info and engagement counts
postsRouter.get("/api/posts", (req: Request, res: Response) => {
  try {
    const posts = listFeed({
      celebrityId: req.query.celebrityId as string | undefined,
      eventId: req.query.eventId as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });
    res.json(withLikeState(posts, req));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list posts";
    res.status(500).json({ error: message });
  }
});

postsRouter.get("/api/posts/:id", (req: Request, res: Response) => {
  try {
    const post = getPostById(req.params.id as string);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.json(withLikeState([post], req)[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get post";
    res.status(500).json({ error: message });
  }
});

postsRouter.get("/api/posts/:id/comments", (req: Request, res: Response) => {
  try {
    res.json(listComments(req.params.id as string));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list comments";
    res.status(500).json({ error: message });
  }
});

// Comment as the signed-in user
postsRouter.post("/api/posts/:id/comments", requireAuth, (req: Request, res: Response) => {
  try {
    const { content } = req.body as { content?: string };
    if (!content?.trim()) {
      res.status(400).json({ error: "content is required" });
      return;
    }
    const postId = req.params.id as string;
    if (!getPostById(postId)) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    const comment = addComment({
      postId,
      userId: req.user!.id,
      authorName: req.user!.displayName,
      content: content.trim(),
    });
    res.status(201).json(comment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add comment";
    res.status(500).json({ error: message });
  }
});

// Toggle the signed-in user's like on a post
postsRouter.post("/api/posts/:id/like", requireAuth, (req: Request, res: Response) => {
  try {
    const postId = req.params.id as string;
    if (!getPostById(postId)) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.json(toggleLike(postId, req.user!.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to toggle like";
    res.status(500).json({ error: message });
  }
});
