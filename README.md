# Slot

> Google 캘린더 기반 약속 잡기 서비스 — 내 빈 시간을 공유하면, 방문자가 그 시간을 드래그로 골라 예약하고 내 캘린더에 초대(인비)가 생성됩니다. (Calendly / Google "약속 시간 예약" 유사)

방문자는 호스트(나)의 **비어있는 시간**만 볼 수 있고, 시간을 선택하면 호스트의 Google 캘린더에 **이벤트가 생성**되어 양쪽에 초대가 발송됩니다. 내 캘린더에 일정이 있으면(바쁨) 그 시간은 선택할 수 없습니다.

## ✨ 주요 기능

- 🗓️ **주간 시간 그리드** — Google 캘린더처럼 일→토 주간 뷰에서 **빈 시간을 드래그로 긁어** 약속 구간 선택
- 🚫 **자동 가용성 계산** — `근무 시간 − 캘린더의 바쁜 시간 − 과거(최소 공지)` 만 선택 가능, 바쁜 시간은 "예약 불가"로 차단
- 📅 **날짜 피커** — 달력에서 하루 클릭 또는 범위 드래그(최대 7일)로 보기 이동
- 📝 **예약 폼** — 이름 / 소속(선택) / 이메일 / 연락처 입력
- 📨 **캘린더 인비 발송** — 예약 시 Google Calendar 이벤트 생성 + 참석자 초대
- 🔌 **Mock ↔ Google 전환** — 환경변수 한 줄로 가짜 데이터 ↔ 실제 캘린더 전환 (설정 없이 바로 실행 가능)

## 🧱 기술 스택

| 영역        | 스택                                                            |
| ----------- | --------------------------------------------------------------- |
| 프론트엔드  | React 18 + Vite + TypeScript (`apps/web`)                       |
| 백엔드      | NestJS 10 + TypeScript (`apps/api`)                             |
| 공통 타입   | `@slot/shared` (`packages/shared`) — 프론트/백 공유 도메인 타입 |
| 캘린더 연동 | `googleapis` (Google Calendar API)                              |
| 패키지 관리 | npm workspaces (모노레포)                                       |

## 🚀 빠른 시작

```bash
# 1) 의존성 설치 (루트에서 1회)
npm install

# 2) 개발 서버 실행 (shared 빌드 → api:3001 + web:5173 동시 실행)
npm run dev
```

- 웹: http://localhost:5173
- API: http://localhost:3001/api

> 별도 설정 없이 **Mock 캘린더**로 바로 동작합니다. 실제 Google 캘린더 연동은 아래 [Google Calendar 연동](#-google-calendar-연동) 참고.

### Docker로 실행

```bash
docker compose up --build   # web: http://localhost:8080
```

- `web`(nginx) 컨테이너가 정적 파일을 서빙하고 `/api` 를 `api` 컨테이너로 프록시한다.
- 예약 데이터는 `slot-data` 볼륨(`/data/bookings.json`)에 영속화된다.
- Google 연동/호스트 정보는 환경변수로 주입한다 (예: `HOST_NAME`, `CALENDAR_PROVIDER`, `GOOGLE_*`). 루트에 `.env` 를 두면 compose 가 읽는다.

### npm 스크립트

| 명령                   | 설명                               |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | shared 빌드 후 api + web 동시 실행 |
| `npm run build`        | 전체 프로덕션 빌드                 |
| `npm run format`       | Prettier 포맷 적용                 |
| `npm run format:check` | 포맷 검사                          |

## 🏗️ 아키텍처

Mock ↔ 실제 Google Calendar 전환을 **한 곳(인터페이스)** 에서만 바꾸도록 분리했습니다.

```
CalendarProvider (interface)
├── getBusyIntervals(from, to)   # 바쁜 시간 조회
└── createEvent(input)           # 이벤트 생성 + 인비 발송

         ▲                         ▲
         │                         │
MockCalendarProvider      GoogleCalendarProvider
(메모리, 기본값)           (freebusy.query / events.insert)
```

`apps/api/src/calendar/calendar.module.ts` 가 환경변수 `CALENDAR_PROVIDER` (`mock` | `google`) 로 구현을 선택합니다.

## 🔗 API 계약

| 메서드 | 경로                                    | 설명                                           |
| ------ | --------------------------------------- | ---------------------------------------------- |
| GET    | `/api/schedule?from=&to=`               | 주간 그리드용 데이터(일자별 근무시간+바쁜시간) |
| GET    | `/api/availability?from=&to=&duration=` | 기간 내 예약 가능한 30분 슬롯 목록             |
| POST   | `/api/bookings`                         | 예약 → 캘린더 이벤트 생성 (인비 발송)          |
| GET    | `/api/bookings`                         | (디버그) 생성된 예약 목록                      |
| GET    | `/api/auth/google`                      | Google 동의 시작 (refresh token 발급용)        |
| GET    | `/api/auth/google/callback`             | 동의 콜백 → refresh token 표시                 |

**예약 요청 본문**

```json
{
  "start": "2026-06-29T04:00:00.000Z",
  "end": "2026-06-29T04:30:00.000Z",
  "guestName": "홍길동",
  "guestEmail": "guest@example.com",
  "guestPhone": "010-1234-5678",
  "organization": "korea"
}
```

> 모든 시간 값은 API 경계에서 **ISO 8601 문자열**, 타임존은 IANA 문자열(`Asia/Seoul`)을 사용합니다.

## 🔐 Google Calendar 연동

실제 캘린더와 연동하려면 OAuth 자격증명이 필요합니다.

1. **Google Cloud Console** → Calendar API 사용 설정, OAuth 2.0 클라이언트 생성
   - 승인된 리디렉션 URI: `http://localhost:3001/api/auth/google/callback`
2. `apps/api/.env.example` 를 `apps/api/.env` 로 복사하고 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` 입력
3. 서버 실행 후 브라우저로 `http://localhost:3001/api/auth/google` 접속 → 동의 → 화면에 표시된 `GOOGLE_REFRESH_TOKEN` 을 `.env` 에 붙여넣기
4. `.env` 에 `CALENDAR_PROVIDER=google` 설정 후 재시작 → 실제 캘린더 연동 완료

> ⚠️ `.env` 와 키 파일은 `.gitignore` 로 커밋에서 제외됩니다. `.env.example` 만 저장소에 포함됩니다.

## 📁 프로젝트 구조

```
slot/
├── packages/
│   └── shared/             # @slot/shared — TimeSlot, DaySchedule, Booking 등 계약 타입
└── apps/
    ├── api/                # NestJS 백엔드 (포트 3001)
    │   ├── .env.example
    │   └── src/
    │       ├── config/         # 근무 시간/슬롯 규칙 (schedule.config.ts)
    │       ├── calendar/       # CalendarProvider 추상화 (Mock ↔ Google), OAuth 헬퍼
    │       ├── availability/   # 가용 슬롯 계산 + GET /api/availability
    │       ├── schedule/       # 주간 그리드용 데이터 + GET /api/schedule
    │       ├── booking/        # 예약 생성 + POST /api/bookings
    │       └── auth/           # Google OAuth 동의 플로우
    └── web/                # React + Vite 프론트엔드 (포트 5173)
        └── src/
            ├── components/     # WeekGrid(드래그), DatePickerPopover, BookingForm, Confirmation
            ├── utils/          # 타임존/날짜 헬퍼
            └── api.ts          # 백엔드 호출 클라이언트
```

## 🧭 로드맵

- [x] 모노레포 + 공통 타입 + 코딩 컨벤션
- [x] 백엔드: 가용 슬롯/주간 스케줄 계산 + 예약(이벤트 생성)
- [x] 프론트엔드: 주간 시간 그리드 드래그 선택 + 날짜 피커 + 예약 폼/확인
- [x] Google OAuth + Calendar API 실연동
- [x] 예약 영속화 (JSON 파일)
- [x] 예약 취소 / 변경 (관리 링크 `?manage=<token>`)
- [x] 방문자 타임존 선택 UI
- [x] 멀티 호스트 (`?host=<slug>` 호스트별 예약 페이지)
- [x] 알림 — 방문자 이메일(Mock↔SMTP) · **호스트 텔레그램**(Mock↔Bot API, 누가/언제 예약했는지) · 방문자 SMS(Mock↔Twilio)
- [x] Docker 배포 (compose)
- [x] 호스트 관리 UI (`?admin` + `ADMIN_TOKEN`) — 호스트 추가/수정/삭제, 근무시간 편집

## 🤝 기여

코드 컨벤션은 **ES6+ 문법**, **TypeScript strict**, **Prettier**(루트 `.prettierrc.json`)를 따릅니다. 커밋 전 `npm run format` 으로 포맷을 맞춰주세요.
