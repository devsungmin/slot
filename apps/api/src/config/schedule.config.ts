/**
 * 호스트(나)의 예약 가능 규칙.
 * 개인정보(이름/이메일/타임존)는 환경변수에서 읽고, 근무 시간 규칙만 코드에서 관리한다.
 * (dotenv 는 main.ts 에서 가장 먼저 로드되므로 이 모듈 평가 시점에 process.env 가 채워져 있다.)
 */
export interface ScheduleConfig {
  /** 호스트 이름 (이벤트 주최자로 표시) */
  hostName: string;
  /** 호스트 이메일 (이벤트 주최자 / 인비 발신) */
  hostEmail: string;
  /** 호스트 타임존 (IANA) */
  timezone: string;
  /** 기본 슬롯 길이 (분) */
  slotMinutes: number;
  /** 슬롯 간 최소 간격(분) — 0이면 연속 */
  slotIntervalMinutes: number;
  /** 지금으로부터 최소 몇 시간 뒤부터 예약 가능한지 (버퍼) */
  minNoticeHours: number;
  /** 며칠 앞까지 예약 가능한지 */
  bookingWindowDays: number;
  /** 요일별 근무 시간 (0=일요일 ~ 6=토요일). 빈 배열이면 그날은 예약 불가 */
  workingHours: Record<number, WorkingWindow[]>;
}

/** 하루 안에서의 근무 시간대 ("09:00" ~ "18:00", 호스트 로컬 타임존 기준) */
export interface WorkingWindow {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export const scheduleConfig: ScheduleConfig = {
  hostName: process.env.HOST_NAME ?? 'Slot Host',
  hostEmail: process.env.HOST_EMAIL ?? 'host@example.com',
  timezone: process.env.HOST_TIMEZONE ?? 'Asia/Seoul',
  slotMinutes: 30,
  slotIntervalMinutes: 0,
  minNoticeHours: 2,
  bookingWindowDays: 14,
  workingHours: {
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
  },
};
