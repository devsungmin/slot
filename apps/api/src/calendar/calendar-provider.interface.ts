import type { BusyInterval } from '@slot/shared';

/** 캘린더 이벤트 생성 입력 */
export interface CreateEventInput {
  start: string; // ISO 8601
  end: string; // ISO 8601
  summary: string;
  description?: string;
  /** 호스트 이메일 (주최자) */
  hostEmail: string;
  /** 방문자 이메일 (참석자/인비 수신자) */
  guestEmail: string;
  guestName: string;
  timezone: string;
}

/** 캘린더 이벤트 생성 결과 */
export interface CreatedEvent {
  id: string;
  htmlLink?: string;
}

/**
 * 캘린더 연동 추상화.
 * Mock 구현과 실제 Google 구현이 이 계약을 공유한다.
 * 실연동 전환 시 calendar.module.ts의 바인딩만 교체하면 된다.
 */
export interface CalendarProvider {
  /** 주어진 기간([from, to))에서 이미 잡혀있는 바쁜 시간 구간을 반환 */
  getBusyIntervals(from: string, to: string): Promise<BusyInterval[]>;

  /** 이벤트(인비)를 생성하고 호스트·방문자를 참석자로 추가 */
  createEvent(input: CreateEventInput): Promise<CreatedEvent>;

  /** 이벤트 수정 (시간 변경 등) → 참석자에게 업데이트 발송 */
  updateEvent(eventId: string, input: CreateEventInput): Promise<CreatedEvent>;

  /** 이벤트 삭제 → 참석자에게 취소 발송 */
  deleteEvent(eventId: string): Promise<void>;
}

/** NestJS DI 토큰 */
export const CALENDAR_PROVIDER = Symbol('CALENDAR_PROVIDER');
