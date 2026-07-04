/**
 * 기본 호스트 설정.
 * 개인정보(이름/이메일/타임존/캘린더)는 환경변수에서 읽고, 근무 시간 규칙은 코드에서 관리한다.
 * 런타임 조회/수정은 host-registry.ts 를 통해서 한다 — 관리 API 로 바뀐 호스트는
 * data/hosts.json 에 저장되며, 파일이 있으면 이 기본값보다 우선한다.
 * (dotenv 는 main.ts 에서 가장 먼저 로드되므로 이 모듈 평가 시점에 process.env 가 채워져 있다.)
 */
import type { HostSettings, WorkingWindow } from '@slot/shared';

export type HostConfig = HostSettings;
export type { WorkingWindow };

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

/** hosts.json 이 없을 때 사용하는 기본 호스트 목록 (첫 번째가 기본 호스트) */
export const defaultHosts: HostConfig[] = [
  // 기본 호스트 (환경변수)
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
