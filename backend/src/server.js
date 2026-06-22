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

async function findOrCreateUser(username = "guest", password = "demo-password") {
  const safeUsername = String(username || "guest").trim() || "guest";
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
    type: post.type,
    movieTitle: post.movieTitle,
    nickname: post.nickname,
    rating: post.rating,
    content: post.content,
    spoiler: post.spoiler,
    tags: post.tags,
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
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "아이디와 비밀번호를 입력해주세요." });
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
    const { username, password } = req.body;
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
    const review = await prisma.review.create({
      data: {
        userId: user.id,
        tmdbId: Number(req.params.tmdbId),
        movieTitle: req.body.movieTitle,
        nickname: req.body.nickname || user.username,
        rating: Number(req.body.rating),
        text: req.body.text,
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

app.get("/api/community/posts", async (_req, res, next) => {
  try {
    const posts = await prisma.communityPost.findMany({
      orderBy: { createdAt: "desc" },
      include: { comments: { orderBy: { createdAt: "asc" } }, likes: true },
    });
    res.json(posts.map(toClientPost));
  } catch (error) {
    next(error);
  }
});

app.post("/api/community/posts", async (req, res, next) => {
  try {
    const user = await findOrCreateUser(req.body.user);
    const post = await prisma.communityPost.create({
      data: {
        userId: user.id,
        type: req.body.type || "review",
        movieTitle: req.body.movieTitle,
        nickname: req.body.nickname || user.username,
        rating: Number(req.body.rating || 0),
        content: req.body.content,
        spoiler: Boolean(req.body.spoiler),
        tags: req.body.tags || [],
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
    const comment = await prisma.communityComment.create({
      data: {
        postId: req.params.postId,
        userId: user.id,
        nickname: req.body.nickname || user.username,
        content: req.body.content,
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
