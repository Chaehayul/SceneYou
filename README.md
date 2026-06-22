# SceneYou

영화를 발견하고 저장하며 취향과 감상을 기록하는 React 기반 영화 큐레이션 웹 앱입니다.

## 주요 기능

- TMDB 기반 인기작, 개봉 예정작, 검색, 장르 필터, 정렬
- 영화 상세 정보, OTT 제공처, 추천 영화
- PostgreSQL API 연동 컬렉션, 리뷰, 커뮤니티 데이터
- API 미설정 시 LocalStorage fallback
- 로컬 컬렉션과 최근 본 영화
- 컬렉션 기반 취향 분석
- 리뷰 등록, 정렬, 삭제
- 영화 커뮤니티 게시글, 댓글, 좋아요, 태그
- 이벤트 준비 중 화면
- 반응형 UI, 로딩·오류·빈 상태

로그인과 리뷰는 API 서버가 없을 때 LocalStorage 기반 데모 모드로 동작합니다. `VITE_API_URL`과 `DATABASE_URL`을 설정하면 PostgreSQL 기반 API 서버와 동기화됩니다.

## 로컬 실행

```bash
npm install
npm run dev
```

`.env.local`:

```env
VITE_TMDB_API_KEY=TMDB_API_KEY
VITE_EVENTS_API_URL=
VITE_API_URL=http://localhost:8787
```

`VITE_` 환경 변수는 브라우저 번들에 포함되므로 비밀키 저장 용도로 사용할 수 없습니다. TMDB 키에는 도메인 제한을 적용하는 것을 권장합니다.

## PostgreSQL API 실행

```bash
cd backend
npm install
copy .env.example .env
npm run db:generate
npm run db:push
npm run dev
```

`backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/sceneyou?schema=public"
PORT=8787
CLIENT_ORIGIN="http://localhost:5173"
```

프론트 `.env.local`에는 다음을 추가합니다.

```env
VITE_API_URL=http://localhost:8787
```

## 빌드

```bash
npm run build
npm run preview
```

빌드 결과는 `dist`에 생성됩니다.

## Vercel 배포

1. 저장소를 GitHub에 업로드합니다.
2. Vercel에서 저장소를 Import합니다.
3. Framework Preset은 `Vite`를 선택합니다.
4. 환경 변수 `VITE_TMDB_API_KEY`를 등록합니다.
5. 선택 사항으로 `VITE_EVENTS_API_URL`을 등록합니다.
6. Deploy를 누릅니다.

`vercel.json`에 React Router 새로고침 대응 설정이 포함되어 있습니다.

## Netlify 배포

Build command는 `npm run build`, Publish directory는 `dist`입니다.

SPA 라우팅을 위해 Netlify 설정에서 모든 경로를 `/index.html`로 rewrite해야 합니다.

## 기술 스택

React, Vite, React Router, Node.js, Express, Prisma, PostgreSQL, TMDB API, LocalStorage fallback
