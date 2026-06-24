import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 8787);
const clientOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;
const demoAccount = { username: "demo", password: "demo123" };
const demoCommunityAuthorNames = ["movie_lover", "cinephile", "scene_reader", "review_note"];
const authSecret = process.env.AUTH_SECRET || "sceneyou-dev-secret-change-me";
const tokenMaxAgeSeconds = 60 * 60 * 24 * 7;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normalized = origin.replace(/\/+$/, "");
  return (
    clientOrigins.includes(normalized)
    || normalized === "http://localhost:5173"
    || normalized === "http://localhost:4173"
    || normalized === "http://127.0.0.1:5173"
    || normalized === "http://127.0.0.1:4173"
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized)
  );
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

function legacyHashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(password, passwordHash = "") {
  if (passwordHash.startsWith("scrypt:")) {
    const [, salt, storedHash] = passwordHash.split(":");
    if (!salt || !storedHash) return false;
    const candidate = crypto.scryptSync(String(password), salt, 64);
    const stored = Buffer.from(storedHash, "hex");
    return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
  }
  return passwordHash === legacyHashPassword(password);
}

function isLegacyPasswordHash(passwordHash = "") {
  return !passwordHash.startsWith("scrypt:");
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signToken(user) {
  const payload = {
    sub: user.id,
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + tokenMaxAgeSeconds,
  };
  const unsigned = `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url(payload)}`;
  const signature = crypto.createHmac("sha256", authSecret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

function verifyToken(token = "") {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;
    const unsigned = `${header}.${payload}`;
    const expected = crypto.createHmac("sha256", authSecret).update(unsigned).digest("base64url");
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!decoded.sub || decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

async function requireAuth(req, res, next) {
  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ message: "濡쒓렇?몄씠 ?꾩슂??湲곕뒫?낅땲??" });
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return res.status(401).json({ message: "濡쒓렇?몄씠 ?꾩슂??湲곕뒫?낅땲??" });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function getOptionalUser(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const decoded = verifyToken(token);
  if (!decoded) return null;
  return prisma.user.findUnique({ where: { id: decoded.sub } });
}

function cleanText(value, fallback = "") {
  return String(value || fallback).trim();
}

function isValidNickname(value) {
  const nickname = cleanText(value);
  return nickname.length >= 2 && nickname.length <= 16 && !/[<>/{}[\]\\]/.test(nickname);
}

function makeRecommendedNickname(username) {
  const base = cleanText(username, "scene").replace(/_/g, "").slice(0, 10) || "scene";
  const suffix = crypto.randomInt(100, 999);
  return `${base}_scene${suffix}`;
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
    data: { username: safeUsername, nickname: safeUsername, passwordHash: hashPassword(password) },
  });
}

function toClientUser(user) {
  return { id: user.id, username: user.username, nickname: user.nickname || user.username };
}

function toAuthResponse(user) {
  return { user: toClientUser(user), token: signToken(user) };
}

async function ensurePublicCommunityContent() {
  const authors = await Promise.all(demoCommunityAuthorNames.map((username) => findOrCreateUser(username, "demo-password")));
  const [lover, cinephile, reader, reviewer] = authors;
  const demoUser = await findOrCreateUser(demoAccount.username, demoAccount.password);

  const publicPostCount = await prisma.communityPost.count({
    where: { userId: { in: authors.map((author) => author.id) } },
  });

  if (publicPostCount > 0) return;

  const posts = await Promise.all([
    prisma.communityPost.create({
      data: {
        userId: lover.id,
        type: "recommend",
        title: "숨은 명작 추천받아요",
        movieTitle: "Inception",
        nickname: "movie_lover",
        rating: 4.5,
        content: "복선이 많고 다시 볼수록 새로운 장면이 보이는 영화가 좋더라구요. 비슷한 작품 있으면 추천해주세요.",
        tags: ["숨은명작", "추천", "해석"],
        viewCount: 328,
      },
    }),
    prisma.communityPost.create({
      data: {
        userId: cinephile.id,
        type: "movie",
        title: "인셉션 결말 해석",
        movieTitle: "Inception",
        nickname: "cinephile",
        rating: 4.5,
        content: "토템보다 코브가 아이들을 바라보는 선택이 결말의 핵심처럼 느껴졌어요. 여러분은 어떻게 보셨나요?",
        tags: ["인셉션", "결말해석", "토론"],
        spoiler: true,
        viewCount: 512,
      },
    }),
    prisma.communityPost.create({
      data: {
        userId: reader.id,
        type: "free",
        title: "올해 본 영화 1위",
        movieTitle: "Parasite",
        nickname: "scene_reader",
        rating: 5,
        content: "완성도와 몰입감 모두 좋아서 올해 본 작품 중 가장 오래 기억에 남았어요.",
        tags: ["올해의영화", "리뷰", "추천"],
        viewCount: 441,
      },
    }),
    prisma.communityPost.create({
      data: {
        userId: reviewer.id,
        type: "movie",
        title: "OTT에서 보기 좋은 주말 영화",
        movieTitle: "Interstellar",
        nickname: "review_note",
        rating: 4,
        content: "러닝타임은 길지만 몰입하면 금방 지나가요. 주말 밤에 보기 좋은 SF 작품으로 추천합니다.",
        tags: ["OTT", "주말영화", "SF"],
        viewCount: 279,
      },
    }),
  ]);

  await prisma.communityComment.createMany({
    data: [
      { postId: posts[0].id, userId: cinephile.id, nickname: "cinephile", content: "저도 이런 구조의 영화 좋아해요. 메멘토도 추천해요." },
      { postId: posts[0].id, userId: demoUser.id, nickname: "demo", content: "추천 리스트에 담아둘게요!" },
      { postId: posts[1].id, userId: reader.id, nickname: "scene_reader", content: "저는 현실보다 선택에 더 초점을 둔 결말이라고 봤어요." },
      { postId: posts[2].id, userId: reviewer.id, nickname: "review_note", content: "마지막까지 긴장감이 유지되는 게 좋았어요." },
      { postId: posts[3].id, userId: lover.id, nickname: "movie_lover", content: "큰 화면으로 다시 보고 싶은 영화예요." },
    ],
  });

  await prisma.communityLike.createMany({
    data: [
      { postId: posts[0].id, userId: demoUser.id },
      { postId: posts[0].id, userId: reader.id },
      { postId: posts[1].id, userId: demoUser.id },
      { postId: posts[1].id, userId: lover.id },
      { postId: posts[2].id, userId: demoUser.id },
      { postId: posts[2].id, userId: cinephile.id },
      { postId: posts[3].id, userId: demoUser.id },
    ],
    skipDuplicates: true,
  });
}

async function ensureDemoAccountContent(user) {
  if (user.username !== demoAccount.username) return;

  const collectionCount = await prisma.collectionItem.count({ where: { userId: user.id } });
  if (collectionCount === 0) {
    await prisma.collectionItem.createMany({
      data: [
        {
          userId: user.id,
          tmdbId: 27205,
          title: "Inception",
          posterPath: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
          backdropPath: "/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
          releaseDate: "2010-07-15",
          voteAverage: 8.4,
          genreIds: [28, 878, 12],
        },
        {
          userId: user.id,
          tmdbId: 157336,
          title: "Interstellar",
          posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
          backdropPath: "/pbrkL804c8yAv3zBZR4QPEafpAR.jpg",
          releaseDate: "2014-11-05",
          voteAverage: 8.4,
          genreIds: [12, 18, 878],
        },
        {
          userId: user.id,
          tmdbId: 496243,
          title: "Parasite",
          posterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
          backdropPath: "/hiKmpZMGZsrkA3cdce8a7Dpos1j.jpg",
          releaseDate: "2019-05-30",
          voteAverage: 8.5,
          genreIds: [35, 53, 18],
        },
      ],
      skipDuplicates: true,
    });
  }

  const authorNames = ["movie_lover", "cinephile", "scene_reader", "review_note"];
  const authors = await Promise.all(authorNames.map((username) => findOrCreateUser(username, "demo-password")));
  const [lover, cinephile, reader, reviewer] = authors;

  const publicPostCount = await prisma.communityPost.count({
    where: { userId: { in: authors.map((author) => author.id) } },
  });

  if (publicPostCount === 0) {
    const posts = await Promise.all([
      prisma.communityPost.create({
        data: {
          userId: lover.id,
          type: "recommend",
          title: "숨은 명작 추천받아요",
          movieTitle: "Inception",
          nickname: "movie_lover",
          rating: 4.5,
          content: "복선이 많고 다시 볼수록 새로운 장면이 보이는 영화가 좋더라구요. 비슷한 작품 있으면 추천해주세요.",
          tags: ["숨은명작", "추천", "해석"],
          viewCount: 328,
        },
      }),
      prisma.communityPost.create({
        data: {
          userId: cinephile.id,
          type: "movie",
          title: "인셉션 결말 해석",
          movieTitle: "Inception",
          nickname: "cinephile",
          rating: 4.5,
          content: "토템보다 코브가 아이들을 바라보는 선택이 결말의 핵심처럼 느껴졌어요. 여러분은 어떻게 보셨나요?",
          tags: ["인셉션", "결말해석", "토론"],
          spoiler: true,
          viewCount: 512,
        },
      }),
      prisma.communityPost.create({
        data: {
          userId: reader.id,
          type: "free",
          title: "올해 본 영화 1위",
          movieTitle: "Parasite",
          nickname: "scene_reader",
          rating: 5,
          content: "완성도와 몰입감 모두 좋아서 올해 본 작품 중 가장 오래 기억에 남았어요.",
          tags: ["올해의영화", "리뷰", "추천"],
          viewCount: 441,
        },
      }),
      prisma.communityPost.create({
        data: {
          userId: reviewer.id,
          type: "movie",
          title: "OTT에서 보기 좋은 주말 영화",
          movieTitle: "Interstellar",
          nickname: "review_note",
          rating: 4,
          content: "러닝타임은 길지만 몰입하면 금방 지나가요. 주말 밤에 보기 좋은 SF 작품으로 추천합니다.",
          tags: ["OTT", "주말영화", "SF"],
          viewCount: 279,
        },
      }),
    ]);

    await prisma.communityComment.createMany({
      data: [
        { postId: posts[0].id, userId: cinephile.id, nickname: "cinephile", content: "저도 이런 구조의 영화 좋아해요. 메멘토도 추천해요." },
        { postId: posts[0].id, userId: user.id, nickname: "demo", content: "추천 리스트에 담아둘게요!" },
        { postId: posts[1].id, userId: reader.id, nickname: "scene_reader", content: "저는 현실보다 선택에 더 초점을 둔 결말이라고 봤어요." },
        { postId: posts[2].id, userId: reviewer.id, nickname: "review_note", content: "마지막까지 긴장감이 유지되는 게 좋았어요." },
        { postId: posts[3].id, userId: lover.id, nickname: "movie_lover", content: "큰 화면으로 다시 보고 싶은 영화예요." },
      ],
    });

    await prisma.communityLike.createMany({
      data: [
        { postId: posts[0].id, userId: user.id },
        { postId: posts[0].id, userId: reader.id },
        { postId: posts[1].id, userId: user.id },
        { postId: posts[1].id, userId: lover.id },
        { postId: posts[2].id, userId: user.id },
        { postId: posts[2].id, userId: cinephile.id },
        { postId: posts[3].id, userId: user.id },
      ],
      skipDuplicates: true,
    });
  }
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

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json(toClientUser(req.user));
});

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const username = cleanText(req.body.username);
    const password = cleanText(req.body.password);
    const nickname = cleanText(req.body.nickname, makeRecommendedNickname(username));
    if (!username || !password) return res.status(400).json({ message: "?꾩씠?붿? 鍮꾨?踰덊샇瑜??낅젰??二쇱꽭??" });
    if (!usernamePattern.test(username)) {
      return res.status(400).json({ message: "?꾩씠?붾뒗 ?곷Ц, ?レ옄, 諛묒쨪(_) 議고빀?쇰줈 3~20?먭퉴吏 ?낅젰??二쇱꽭??" });
    }
    if (!isValidNickname(nickname)) {
      return res.status(400).json({ message: "닉네임은 한글, 영문, 숫자 조합으로 2~16자까지 입력해 주세요." });
    }
    if (password.length < 6) return res.status(400).json({ message: "鍮꾨?踰덊샇??6???댁긽 ?낅젰??二쇱꽭??" });
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return res.status(409).json({ message: "?대? ?ъ슜 以묒씤 ?꾩씠?붿엯?덈떎." });
    const user = await prisma.user.create({ data: { username, nickname, passwordHash: hashPassword(password) } });
    res.status(201).json(toAuthResponse(user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/signin", async (req, res, next) => {
  try {
    const username = cleanText(req.body.username);
    const password = cleanText(req.body.password);
    if (!usernamePattern.test(username) || password.length < 6) {
      return res.status(401).json({ message: "?꾩씠???먮뒗 鍮꾨?踰덊샇媛 ?щ컮瑜댁? ?딆뒿?덈떎." });
    }
    let user = await prisma.user.findUnique({ where: { username } });
    if (!user && username === demoAccount.username && password === demoAccount.password) {
      user = await prisma.user.create({
        data: { username, nickname: "SceneYou 체험", passwordHash: hashPassword(password) },
      });
    }
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: "?꾩씠???먮뒗 鍮꾨?踰덊샇媛 ?щ컮瑜댁? ?딆뒿?덈떎." });
    }
    if (isLegacyPasswordHash(user.passwordHash)) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(password) },
      });
    }
    if (!user.nickname) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { nickname: username === demoAccount.username ? "SceneYou 체험" : makeRecommendedNickname(username) },
      });
    }
    await ensureDemoAccountContent(user);
    res.json(toAuthResponse(user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/collection", requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const items = await prisma.collectionItem.findMany({
      where: { userId: user.id },
      orderBy: { savedAt: "desc" },
    });
    res.json(items.map(toClientCollection));
  } catch (error) {
    next(error);
  }
});

app.post("/api/collection", requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const movie = req.body.movie;
    if (!movie?.id) return res.status(400).json({ message: "?곹솕 ?뺣낫媛 ?놁뒿?덈떎." });
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

app.delete("/api/collection/:tmdbId", requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
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

app.post("/api/reviews/:tmdbId", requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const text = cleanText(req.body.text);
    if (text.length < 5) return res.status(400).json({ message: "由щ럭 ?댁슜??5???댁긽 ?낅젰??二쇱꽭??" });
    const review = await prisma.review.create({
      data: {
        userId: user.id,
        tmdbId: Number(req.params.tmdbId),
        movieTitle: cleanText(req.body.movieTitle),
        nickname: user.nickname || user.username,
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
    const currentUser = await getOptionalUser(req);
    const demoMode = currentUser?.username === demoAccount.username;
    if (demoMode) await ensurePublicCommunityContent();

    const type = normalizeType(cleanText(req.query.type, "all"));
    const keyword = cleanText(req.query.q);
    const sort = cleanText(req.query.sort, "new");
    const where = {};
    if (!demoMode) {
      where.user = { username: { notIn: [...demoCommunityAuthorNames, demoAccount.username] } };
    }
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

app.post("/api/community/posts", requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const title = cleanText(req.body.title, req.body.movieTitle);
    const movieTitle = cleanText(req.body.movieTitle, title);
    const content = cleanText(req.body.content);
    if (!title || !movieTitle || content.length < 5) {
      return res.status(400).json({ message: "?쒕ぉ怨??댁슜???낅젰??二쇱꽭??" });
    }
    const post = await prisma.communityPost.create({
      data: {
        userId: user.id,
        type: normalizeType(cleanText(req.body.type, "free")),
        title,
        movieTitle,
        nickname: user.nickname || user.username,
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

app.post("/api/community/posts/:postId/like", requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
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

app.post("/api/community/posts/:postId/comments", requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const content = cleanText(req.body.content);
    if (!content) return res.status(400).json({ message: "?볤? ?댁슜???낅젰??二쇱꽭??" });
    const comment = await prisma.communityComment.create({
      data: {
        postId: req.params.postId,
        userId: user.id,
        nickname: user.nickname || user.username,
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
  res.status(500).json({ message: "?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." });
});

app.listen(port, () => {
  console.log(`SceneYou API listening on http://localhost:${port}`);
});

