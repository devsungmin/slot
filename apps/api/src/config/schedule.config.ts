/**
 * 호스트 레지스트리.
 * 개인정보(이름/이메일/타임존/캘린더)는 환경변수에서 읽고, 근무 시간 규칙은 코드에서 관리한다.
 * 멀티 호스트: slug 로 구분되며 `?host=<slug>` 로 호스트별 예약 페이지를 연다.
 * (dotenv 는 main.ts 에서 가장 먼저 로드되므로 이 모듈 평가 시점에 process.env 가 채워져 있다.)
 */

/** 하루 안에서의 근무 시간대 ("09:00" ~ "18:00", 호스트 로컬 타임존 기준) */
export interface WorkingWindow {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export interface HostConfig {
  /** URL 식별자 */
  slug: string;
  /** 호스트 이름 (이벤트 주최자로 표시) */
  hostName: string;
  /** 호스트 이메일 (이벤트 주최자 / 인비 발신) */
  hostEmail: string;
  /** 호스트 타임존 (IANA) */
  timezone: string;
  /** 이벤트를 생성할 캘린더 ID (Google: 캘린더 주소, Mock: 네임스페이스 키) */
  calendarId: string;
  slotMinutes: number;
  slotIntervalMinutes: number;
  minNoticeHours: number;
  bookingWindowDays: number;
  /** 요일별 근무 시간 (0=일요일 ~ 6=토요일). 빈 배열이면 그날은 예약 불가 */
  workingHours: Record<number, WorkingWindow[]>;
}

/** 평일 근무 시간 기본값 */
const WEEKLY: Record<number, WorkingWindow[]> = {
  0: [], // 일요일 휴무
  1: [
    { start: '10:00', end: '12:00' },
    { start: '13:00', end: '18:00' },
  ],
  2: [
    { start: '10:00', end: '12:00' },
    { start: '13:00', end: '18:00' },
  ],
  3: [
    { start: '10:00', end: '12:00' },
    { start: '13:00', end: '18:00' },
  ],
  4: [
    { start: '10:00', end: '12:00' },
    { start: '13:00', end: '18:00' },
  ],
  5: [
    { start: '10:00', end: '12:00' },
    { start: '13:00', end: '17:00' },
  ],
  6: [], // 토요일 휴무
};

const baseRules = {
  slotMinutes: 30,
  slotIntervalMinutes: 0,
  minNoticeHours: 2,
  bookingWindowDays: 14,
  workingHours: WEEKLY,
};

export const hosts: HostConfig[] = [
  // 기본 호스트 (환경변수) — 항상 첫 번째
  {
    slug: process.env.HOST_SLUG ?? 'me',
    hostName: process.env.HOST_NAME ?? 'Slot Host',
    hostEmail: process.env.HOST_EMAIL ?? 'host@example.com',
    timezone: process.env.HOST_TIMEZONE ?? 'Asia/Seoul',
    calendarId: process.env.GOOGLE_CALENDAR_ID ?? 'primary',
    ...baseRules,
  },
  // 데모용 두 번째 호스트 (Mock) — `?host=jane`
  {
    slug: 'jane',
    hostName: 'Jane Lee',
    hostEmail: 'jane@example.com',
    timezone: 'America/Los_Angeles',
    calendarId: 'jane@example.com',
    ...baseRules,
  },
];

/** slug 로 호스트를 찾는다. 없으면 기본 호스트. */
export const getHost = (slug?: string): HostConfig =>
  hosts.find((h) => h.slug === slug) ?? hosts[0];

/** 기본 호스트 (하위 호환용 별칭) */
export const scheduleConfig = hosts[0];
