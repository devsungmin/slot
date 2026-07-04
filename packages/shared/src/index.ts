/**
 * Slot 도메인 공통 타입.
 * 프론트엔드(web)와 백엔드(api)가 HTTP/JSON으로 주고받는 계약(contract)을 정의한다.
 * 모든 시간 값은 ISO 8601 문자열(예: "2026-06-29T09:00:00.000Z")로 직렬화한다.
 */

/** 바쁜 시간 구간 (캘린더에 이미 잡힌 일정) */
export interface BusyInterval {
  /** ISO 8601 시작 시각 */
  start: string;
  /** ISO 8601 종료 시각 */
  end: string;
}

/** 예약 가능한 하나의 시간 슬롯 */
export interface TimeSlot {
  /** ISO 8601 시작 시각 */
  start: string;
  /** ISO 8601 종료 시각 */
  end: string;
}

/** 하루 안에서의 근무 시간대 ("HH:mm" ~ "HH:mm", 호스트 로컬 타임존 기준) */
export interface WorkingWindow {
  start: string;
  end: string;
}

/**
 * 호스트 설정 (관리 API 계약).
 * 백엔드 호스트 레지스트리와 관리 UI 가 이 형태를 주고받는다.
 */
export interface HostSettings {
  /** URL 식별자 (?host=<slug>) */
  slug: string;
  hostName: string;
  hostEmail: string;
  /** IANA 타임존 */
  timezone: string;
  /** 이벤트를 생성할 캘린더 ID */
  calendarId: string;
  slotMinutes: number;
  slotIntervalMinutes: number;
  minNoticeHours: number;
  bookingWindowDays: number;
  /** 요일별 근무 시간 (0=일요일 ~ 6=토요일). 빈 배열이면 그날은 예약 불가 */
  workingHours: Record<number, WorkingWindow[]>;
}

/** GET /api/availability 응답 */
export interface AvailabilityResponse {
  /** 호스트 타임존 (IANA, 예: "Asia/Seoul") */
  timezone: string;
  /** 슬롯 길이 (분) */
  slotMinutes: number;
  /** 예약 가능한 슬롯 목록 (시간순) */
  slots: TimeSlot[];
}

/** 하루치 그리드 데이터 (근무 시간대 + 그날의 바쁜 시간) */
export interface DaySchedule {
  /** 호스트 타임존 기준 날짜 "YYYY-MM-DD" */
  date: string;
  /** 0=일요일 ~ 6=토요일 */
  weekday: number;
  /** 그날의 근무 시간대 (ISO 8601 구간) — 비어있으면 휴무 */
  working: TimeSlot[];
}

/**
 * GET /api/schedule 응답.
 * 프론트엔드가 주간 그리드를 그리고, 빈 시간만 드래그로 선택할 수 있게 하는 데 필요한 원본 데이터.
 */
export interface ScheduleResponse {
  /** 호스트 slug (URL 식별자) */
  hostSlug: string;
  /** 호스트 표시 이름 */
  hostName: string;
  /** 호스트 타임존 (IANA) */
  timezone: string;
  /** 최소 공지 시간(시간) — 지금으로부터 이 시간 이후만 예약 가능 */
  minNoticeHours: number;
  /** 드래그 스냅/최소 약속 단위 (분) */
  slotMinutes: number;
  /** 기간 내 일자별 근무 시간대 */
  days: DaySchedule[];
  /** 기간 내 호스트의 바쁜 시간 전체 */
  busy: BusyInterval[];
}

/** POST /api/bookings 요청 본문 */
export interface CreateBookingRequest {
  /** 예약 대상 호스트 slug (생략 시 기본 호스트) */
  hostSlug?: string;
  /** 선택한 시작 시각 (ISO 8601) */
  start: string;
  /** 선택한 종료 시각 (ISO 8601) */
  end: string;
  /** 방문자 이름 (필수) */
  guestName: string;
  /** 방문자 이메일 — 인비 수신자 (필수) */
  guestEmail: string;
  /** 방문자 연락처 (필수) */
  guestPhone: string;
  /** 소속 (선택) */
  organization?: string;
}

/** 예약 상태 */
export type BookingStatus = 'confirmed' | 'cancelled';

/** 생성된 예약 + 캘린더 이벤트 결과 */
export interface Booking {
  id: string;
  /** 예약 대상 호스트 slug */
  hostSlug: string;
  /** 이벤트가 생성된 캘린더 ID */
  calendarId: string;
  start: string;
  end: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  organization?: string;
  /** 생성된 캘린더 이벤트 ID */
  calendarEventId: string;
  /** 캘린더 이벤트로 연결되는 링크 (있을 경우) */
  htmlLink?: string;
  /** 예약 상태 */
  status: BookingStatus;
  /** 방문자가 취소/변경할 때 쓰는 토큰 (예약 관리 링크용) */
  cancelToken: string;
  /** 예약 생성 시각 (ISO 8601) */
  createdAt: string;
}

/** PATCH /api/bookings/:token 요청 — 시간 변경 */
export interface RescheduleRequest {
  start: string;
  end: string;
}

/** API 공통 에러 형태 */
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
