# SceneYou

React와 TMDB API 기반의 영화 정보·취향 분석 웹 서비스입니다. 영화 검색, 상세 정보, OTT 제공처, 컬렉션 저장, 리뷰, 커뮤니티, 취향 분석 기능을 제공합니다.

## Features

- TMDB API 기반 영화 검색, 인기 영화, 개봉 예정작 조회
- 영화 상세 정보, 장르, 평점, OTT 제공처, 추천 영화 제공
- PostgreSQL API 기반 컬렉션, 리뷰, 커뮤니티 데이터 관리
- LocalStorage 기반 최근 본 영화와 사용자 경험 보조 저장
- 저장한 영화 데이터를 활용한 취향 분석
- 영화/드라마 커뮤니티 게시글, 댓글, 좋아요, 검색, 정렬
- 반응형 다크 테마 UI

## Tech Stack

- Frontend: React, Vite, React Router, JavaScript
- Backend: Node.js, Express
- Database / ORM: PostgreSQL, Prisma
- External API: TMDB API
- Deploy: Vercel, Render

## Environment Variables

Frontend:

```env
VITE_TMDB_API_KEY=your_tmdb_api_key
VITE_API_URL=https://your-api-server.onrender.com
```

Backend:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/sceneyou?schema=public"
PORT=8787
CLIENT_ORIGIN="https://your-vercel-domain.vercel.app"
```

## Local Development

```bash
npm install
npm run dev
```

API server:

```bash
cd backend
npm install
copy .env.example .env
npm run db:generate
npm run db:push
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deployment

Frontend is deployed on Vercel.

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

Backend is deployed on Render.

- Root Directory: `backend`
- Build Command: `npm install && npm run db:generate && npm run db:push`
- Start Command: `npm start`

`vercel.json` includes SPA routing support for React Router.
