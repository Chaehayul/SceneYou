import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 8787);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: [clientOrigin, "http://localhost:4173"], credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function cleanText(value, fallback = "") {
  return String(value || fallback).trim();
}

function normalizeType(type) {
  if (type === "review") return "movie";
  if (type === "talk") return "free";
  if (["free", "movie", "recommend"].includes(type)) return type;
  return "free";
}

function typeWhere(type) {
  if (type === "movie") return { in: ["movie", "review"] };
  if (type === "free") return { in: ["free", "talk"] };
  return type;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => cleanText(tag).replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 4);
}

async function findOrCreateUser(username = "guest", password = "demo-password") {
  const safeUsername = cleanText(username, "guest") || "guest";
  const existing = await prisma.user.findUnique({ where: { username: safeUsername } });
  if (existing) return existing;
  return prisma.user.create({
    data: { username: safeUsername, passwordHash: hashPassword(password) },
  });
}

function toClientCollection(item) {
  return {
    id: item.tmdbId,
    title: item.title,
    poster_path: item.posterPath,
    backdrop_path: item.backdropPath,
    release_date: item.releaseDate,
    vote_average: item.voteAverage,
    genre_ids: item.genreIds,
    savedAt: item.savedAt.getTime(),
  };
}

function toClientPost(post) {
  return {
    id: post.id,
    type: normalizeType(post.type),
    title: post.title || post.movieTitle,
    movieTitle: post.movieTitle,
    nickname: post.nickname,
    rating: post.rating,
    content: post.content,
    spoiler: post.spoiler,
    tags: post.tags,
    views: post.viewCount || 0,
    viewCount: post.viewCount || 0,
    likes: post.likes?.length || 0,
    comments: (post.comments || []).map((comment) => ({
      id: comment.id,
      nickname: comment.nickname,
      content: comment.content,
      createdAt: comment.createdAt.getTime(),
    })),
    createdAt: post.createdAt.getTime(),
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "SceneYou API", database: "PostgreSQL" });
});

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const username = cleanText(req.body.username);
    const password = cleanText(req.body.password);
    if (!username || !password) return res.status(400).json({ message: "아이디와 비밀번호를 입력해 주세요." });
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return res.status(409).json({ message: "이미 사용 중인 아이디입니다." });
    const user = await prisma.user.create({ data: { username, passwordHash: hashPassword(password) } });
    res.status(201).json({ id: user.id, username: user.username });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/signin", async (req, res, next) => {
  try {
    const username = cleanText(req.body.username);
    const password = cleanText(req.body.password);
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });
    }
    res.json({ id: user.id, username: user.username });
  } catch (error) {
    next(error);
  }
});

app.get("/api/collection", async (req, res, next) => {
  try {
    const user = await findOrCreateUser(req.query.user);
    const items = await prisma.collectionItem.findMany({
      where: { userId: user.id },
      orderBy: { savedAt: "desc" },
    });
    res.json(items.map(toClientCollection));
  } catch (error) {
    next(error);
  }
});

app.post("/api/collection", async (req, res, next) => {
  try {
    const user = await findOrCreateUser(req.body.user);
    const movie = req.body.movie;
    if (!movie?.id) return res.status(400).json({ message: "영화 정보가 없습니다." });
    const item = await prisma.collectionItem.upsert({
      where: { userId_tmdbId: { userId: user.id, tmdbId: Number(movie.id) } },
      create: {
        userId: user.id,
        tmdbId: Number(movie.id),
        title: movie.title,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        releaseDate: movie.release_date,
        voteAverage: Number(movie.vote_average || 0),
        genreIds: movie.genre_ids || [],
      },
      update: {
        title: movie.title,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        releaseDate: movie.release_date,
        voteAverage: Number(movie.vote_average || 0),
        genreIds: movie.genre_ids || [],
        savedAt: new Date(),
      },
    });
    res.status(201).json(toClientCollection(item));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/collection/:tmdbId", async (req, res, next) => {
  try {
    const user = await findOrCreateUser(req.query.user);
    await prisma.collectionItem.deleteMany({ where: { userId: user.id, tmdbId: Number(req.params.tmdbId) } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/reviews/:tmdbId", async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { tmdbId: Number(req.params.tmdbId) },
      orderBy: { createdAt: "desc" },
    });
    res.json(reviews.map((review) => ({
      id: review.id,
      nickname: review.nickname,
      rating: review.rating,
      text: review.text,
      createdAt: review.createdAt.getTime(),
    })));
  } catch (error) {
    next(error);
  }
});

app.post("/api/reviews/:tmdbId", async (req, res, next) => {
  try {
    const user = await findOrCreateUser(req.body.user);
    const text = cleanText(req.body.text);
    if (text.length < 5) return res.status(400).json({ message: "리뷰 내용을 5자 이상 입력해 주세요." });
    const review = await prisma.review.create({
      data: {
        userId: user.id,
        tmdbId: Number(req.params.tmdbId),
        movieTitle: cleanText(req.body.movieTitle),
        nickname: cleanText(req.body.nickname, user.username),
        rating: Number(req.body.rating),
        text,
      },
    });
    res.status(201).json({
      id: review.id,
      nickname: review.nickname,
      rating: review.rating,
      text: review.text,
      createdAt: review.createdAt.getTime(),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/community/posts", async (req, res, next) => {
  try {
    const type = normalizeType(cleanText(req.query.type, "all"));
    const keyword = cleanText(req.query.q);
    const sort = cleanText(req.query.sort, "new");
    const where = {};
    if (req.query.type && req.query.type !== "all") where.type = typeWhere(type);
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: "insensitive" } },
        { movieTitle: { contains: keyword, mode: "insensitive" } },
        { content: { contains: keyword, mode: "insensitive" } },
        { nickname: { contains: keyword, mode: "insensitive" } },
        { tags: { has: keyword } },
      ];
    }

    const posts = await prisma.communityPost.findMany({
      where,
      orderBy: sort === "new" ? { createdAt: "desc" } : undefined,
      include: { comments: { orderBy: { createdAt: "asc" } }, likes: true },
      take: 100,
    });

    const mapped = posts.map(toClientPost).sort((a, b) => {
      if (sort === "new") return b.createdAt - a.createdAt;
      if (sort === "comment") return b.comments.length - a.comments.length;
      if (sort === "view") return b.views - a.views;
      return b.likes * 3 + b.comments.length * 5 + Math.floor(b.views / 10)
        - (a.likes * 3 + a.comments.length * 5 + Math.floor(a.views / 10));
    });
    res.json(mapped);
  } catch (error) {
    next(error);
  }
});

app.post("/api/community/posts", async (req, res, next) => {
  try {
    const user = await findOrCreateUser(req.body.user);
    const title = cleanText(req.body.title, req.body.movieTitle);
    const movieTitle = cleanText(req.body.movieTitle, title);
    const content = cleanText(req.body.content);
    if (!title || !movieTitle || content.length < 5) {
      return res.status(400).json({ message: "제목과 내용을 입력해 주세요." });
    }
    const post = await prisma.communityPost.create({
      data: {
        userId: user.id,
        type: normalizeType(cleanText(req.body.type, "free")),
        title,
        movieTitle,
        nickname: cleanText(req.body.nickname, user.username),
        rating: Number(req.body.rating || 0),
        content,
        spoiler: Boolean(req.body.spoiler),
        tags: normalizeTags(req.body.tags),
        viewCount: Number(req.body.views || req.body.viewCount || 1),
      },
      include: { comments: true, likes: true },
    });
    res.status(201).json(toClientPost(post));
  } catch (error) {
    next(error);
  }
});

app.post("/api/community/posts/:postId/like", async (req, res, next) => {
  try {
    const user = await findOrCreateUser(req.body.user);
    await prisma.communityLike.upsert({
      where: { postId_userId: { postId: req.params.postId, userId: user.id } },
      create: { postId: req.params.postId, userId: user.id },
      update: {},
    });
    const likes = await prisma.communityLike.count({ where: { postId: req.params.postId } });
    res.json({ likes });
  } catch (error) {
    next(error);
  }
});

app.post("/api/community/posts/:postId/comments", async (req, res, next) => {
  try {
    const user = await findOrCreateUser(req.body.user);
    const content = cleanText(req.body.content);
    if (!content) return res.status(400).json({ message: "댓글 내용을 입력해 주세요." });
    const comment = await prisma.communityComment.create({
      data: {
        postId: req.params.postId,
        userId: user.id,
        nickname: cleanText(req.body.nickname, user.username),
        content,
      },
    });
    res.status(201).json({
      id: comment.id,
      nickname: comment.nickname,
      content: comment.content,
      createdAt: comment.createdAt.getTime(),
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "서버 오류가 발생했습니다." });
});

app.listen(port, () => {
  console.log(`SceneYou API listening on http://localhost:${port}`);
});
