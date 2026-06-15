# 이벤트 데이터 연결

SceneYou는 두 가지 이벤트 공급 방식을 지원합니다.

1. `public/events.json`: 저장소에서 직접 관리하는 기본 방식
2. `VITE_EVENTS_API_URL`: Google Apps Script 또는 자체 API로 관리하는 운영 방식

외부 API 요청이 실패하면 화면은 자동으로 기본 데이터로 전환됩니다.

## 권장 방식: Google Sheets

영화관 홈페이지를 프론트엔드에서 직접 크롤링하면 CORS 차단, HTML 변경, 이용약관 문제가 발생합니다. 제출용 프로젝트에서는 Google Sheets를 간단한 CMS로 사용하는 편이 안정적입니다.

### 1. 시트 만들기

Google Sheets에서 `events` 시트를 만들고 첫 행에 아래 컬럼을 입력합니다.

```text
id | title | summary | brand | category | image | startDate | endDate | url | featured | published
```

- `category`: `preview`, `discount`, `benefit`, `membership`
- `startDate`, `endDate`: `YYYY-MM-DD`
- `featured`, `published`: `TRUE` 또는 `FALSE`
- `image`: 외부 이미지 URL 또는 `/event-images/discount.jpg`
- `url`: 공식 이벤트 상세 페이지 URL

### 2. Apps Script 배포

1. Google Sheets에서 `확장 프로그램 > Apps Script`를 엽니다.
2. [google-apps-script.js](../scripts/google-apps-script.js)의 내용을 붙여 넣습니다.
3. `배포 > 새 배포 > 웹 앱`을 선택합니다.
4. 실행 사용자는 본인, 액세스 권한은 `모든 사용자`로 설정합니다.
5. 생성된 `/exec` URL을 복사합니다.

### 3. 앱 연결

로컬 `.env.local` 또는 Vercel 환경 변수에 다음 값을 등록합니다.

```env
VITE_EVENTS_API_URL=https://script.google.com/macros/s/배포_ID/exec
```

재배포하면 이벤트 화면이 시트 데이터를 사용합니다.

## 영화관 이벤트 자동 수집

CGV, 롯데시네마, 메가박스는 SceneYou에서 바로 사용할 수 있는 공개 이벤트 API를 제공하지 않습니다. 자동 수집이 꼭 필요하면 별도 서버에서 다음 작업을 수행해야 합니다.

1. 각 영화관의 이용약관과 robots 정책 확인
2. 서버 또는 예약 작업에서 공식 이벤트 페이지 수집
3. HTML을 공통 이벤트 스키마로 변환
4. 하루 1~2회만 갱신하고 캐싱
5. 실패 시 기존 데이터를 유지

포트폴리오 제출 단계에서는 Google Sheets 방식이 설명과 시연이 쉽고 장애 가능성도 낮습니다.
