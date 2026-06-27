# Slot

Google 캘린더 기반 약속 잡기 서비스. 호스트(나)의 캘린더에서 **비어있는 시간**을 방문자에게 보여주고,
방문자가 시간을 선택하면 호스트의 캘린더에 **이벤트(인비)를 생성**해 양쪽에 초대를 보낸다. (Calendly / Google "약속 시간 예약" 유사)

## 목표 / 핵심 플로우

1. 방문자가 예약 페이지 접속
2. **주간 시간 그리드**(일→토)에서 빈 시간을 **드래그로 긁어** 약속 구간 선택. 날짜는 달력 팝오버에서 하루 클릭/범위 드래그(최대 7일)로 이동
3. 방문자가 **이름 / 소속(선택) / 이메일 / 연락처** 입력
4. 백엔드가 캘린더 이벤트를 생성하고 방문자를 참석자로 추가 → 인비 발송
5. 확인 화면 표시

가용성 규칙: `근무 시간 − 캘린더의 바쁜 시간 − 과거(최소 공지)` = 선택 가능한 빈 시간. 내 캘린더에 일정이 있으면(바쁨) 그 시간은 선택 불가.

## 기술 스택

| 영역        | 스택                                                            |
| ----------- | --------------------------------------------------------------- |
| 프론트엔드  | React 18 + Vite + TypeScript (`apps/web`)                       |
| 백엔드      | NestJS 10 + TypeScript (`apps/api`)                             |
| 공통 타입   | `@slot/shared` (`packages/shared`) — 프론트/백 공유 도메인 타입 |
| 캘린더 연동 | `googleapis` (Google Calendar API) — Mock ↔ 실연동 env로 전환   |
| 패키지 관리 | npm workspaces (모노레포)                                       |

## 디렉토리 구조

```
slot/
├── package.json            # 루트 워크스페이스 + dev/build 스크립트
├── tsconfig.base.json      # 공통 tsconfig
├── .prettierrc.json        # 코드 포맷 규칙 (전 프로젝트 공통)
├── packages/
│   └── shared/             # @slot/shared — TimeSlot, DaySchedule, Booking 등 계약 타입
└── apps/
    ├── api/                # NestJS 백엔드 (포트 3001)
    │   ├── .env.example        # 환경변수 예시 (복사 → .env)
    │   └── src/
    │       ├── config/         # 근무 시간/슬롯 규칙 (schedule.config.ts)
    │       ├── calendar/       # CalendarProvider 추상화 (Mock ↔ Google), google-oauth 헬퍼
    │       ├── availability/   # 가용 슬롯 계산 + GET /api/availability
    │       ├── schedule/       # 주간 그리드용 원본 데이터 + GET /api/schedule
    │       ├── booking/        # 예약 생성 + POST /api/bookings
    │       └── auth/           # Google OAuth 동의 플로우 (refresh token 발급)
    └── web/                # React + Vite 프론트엔드 (포트 5173)
        └── src/
            ├── components/     # WeekGrid(드래그), DatePickerPopover, BookingForm, Confirmation
            ├── utils/          # 타임존/날짜 헬퍼 (datetime.ts)
            └── api.ts          # 백엔드 호출 클라이언트
```

## 아키텍처 핵심: CalendarProvider 추상화

Mock ↔ 실제 Google Calendar 전환을 **환경변수 한 줄**로 바꾸도록 인터페이스로 분리한다.

- `calendar/calendar-provider.interface.ts` — `getBusyIntervals()`, `createEvent()` 계약 + DI 토큰 `CALENDAR_PROVIDER`
- `calendar/mock-calendar.provider.ts` — **기본값.** 메모리 내 가짜 일정/예약 (자격증명 불필요)
- `calendar/google-calendar.provider.ts` — 실연동. `freebusy.query` + `events.insert(sendUpdates:'all')`
- `calendar/calendar.module.ts` — `CALENDAR_PROVIDER` env 로 구현 선택 (`google` | 그 외=mock)

## Google Calendar 실연동 설정

1. Google Cloud Console → Calendar API 사용 설정, OAuth 2.0 클라이언트 생성
   - 리디렉션 URI: `http://localhost:3001/api/auth/google/callback`
2. `apps/api/.env.example` → `apps/api/.env` 복사 후 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` 입력
3. 서버 실행 후 브라우저로 `http://localhost:3001/api/auth/google` 접속 → 동의 → 화면의 `GOOGLE_REFRESH_TOKEN` 을 `.env` 에 붙여넣기
4. `.env` 에 `CALENDAR_PROVIDER=google` 설정 후 재시작 → 실제 캘린더 연동

> 자격증명이 없으면 기본 `mock` 으로 동작하므로 `npm run dev` 는 설정 없이 바로 실행된다.

## 코딩 컨벤션 (반드시 준수)

- **ES6+ 문법**: `const`/`let`(`var` 금지), 화살표 함수, 템플릿 리터럴, 구조 분해, ES 모듈/`import`, `async/await`.
- **Prettier**로 포맷 통일. 설정은 루트 `.prettierrc.json` 하나로 전 프로젝트 공통.
  - 포맷 적용: `npm run format` / 포맷 검사: `npm run format:check`
- TypeScript `strict` 모드. `any` 지양.
- 시간 값은 API 경계에서 **ISO 8601 문자열**로 직렬화. 타임존은 IANA 문자열(`Asia/Seoul`).
- DTO 검증은 `class-validator` 사용.

## 실행 방법

```bash
npm install          # 루트에서 1회 (워크스페이스 전체 설치)
npm run dev          # shared 빌드 → api(3001) + web(5173) 동시 실행
npm run build        # 전체 프로덕션 빌드
npm run format       # Prettier 포맷 적용
```

웹: http://localhost:5173 · API: http://localhost:3001/api

## API 계약

| 메서드 | 경로                                    | 설명                                           |
| ------ | --------------------------------------- | ---------------------------------------------- |
| GET    | `/api/schedule?from=&to=`               | 주간 그리드용 데이터(일자별 근무시간+바쁜시간) |
| GET    | `/api/availability?from=&to=&duration=` | 기간 내 예약 가능한 30분 슬롯 목록             |
| POST   | `/api/bookings`                         | 예약 → 캘린더 이벤트 생성 (인비 발송)          |
| GET    | `/api/bookings`                         | (디버그) 생성된 예약 목록                      |
| GET    | `/api/auth/google`                      | Google 동의 시작 (refresh token 발급용)        |
| GET    | `/api/auth/google/callback`             | 동의 콜백 → refresh token 표시                 |

예약 요청 필드: `start`, `end`, `guestName`, `guestEmail`, `guestPhone`(필수), `organization`(선택).

## 현재 상태 / 다음 단계

- [x] 모노레포 + 공통 타입 + 코딩 컨벤션 정립
- [x] 백엔드: 가용 슬롯/주간 스케줄 계산 + 예약(이벤트 생성)
- [x] 프론트엔드: 주간 시간 그리드 드래그 선택 + 날짜 피커(하루/범위) + 예약 폼/확인
- [x] Google OAuth + Calendar API 실연동 (env로 Mock↔Google 전환, 동의 플로우 포함)
- [ ] (이후) 예약 영속화(DB), 예약 취소/변경, 멀티 호스트, 타임존 선택 UI
