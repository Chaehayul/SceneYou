# SceneYou

영화를 발견하고 저장하며 취향과 감상을 기록하는 React 기반 영화 큐레이션 웹 앱입니다.

## 주요 기능

- TMDB 기반 인기작, 개봉 예정작, 검색, 장르 필터, 정렬
- 영화 상세 정보, OTT 제공처, 추천 영화
- 로컬 컬렉션과 최근 본 영화
- 컬렉션 기반 취향 분석
- 리뷰 등록, 정렬, 삭제
- 진행 중인 이벤트 필터와 외부 이벤트 API 연결
- 반응형 UI, 로딩·오류·빈 상태

로그인과 리뷰는 프론트엔드 포트폴리오 시연을 위한 LocalStorage 기반 데모입니다. 실제 서비스에서는 Supabase, Firebase 또는 자체 서버 인증으로 교체해야 합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

`.env.local`:

```env
VITE_TMDB_API_KEY=TMDB_API_KEY
VITE_EVENTS_API_URL=
```

`VITE_` 환경 변수는 브라우저 번들에 포함되므로 비밀키 저장 용도로 사용할 수 없습니다. TMDB 키에는 도메인 제한을 적용하는 것을 권장합니다.

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

## 이벤트 운영

기본 데이터는 [events.json](./public/events.json)에서 관리합니다. 배포 후 코드 수정 없이 이벤트를 관리하려면 [EVENTS_SETUP.md](./docs/EVENTS_SETUP.md)의 Google Sheets 연결 방식을 사용하세요.

## 기술 스택

React, Vite, React Router, Lucide React, TMDB API, LocalStorage
