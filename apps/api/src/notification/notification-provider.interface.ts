import type { Booking } from '@slot/shared';

/**
 * 알림 연동 추상화 (CalendarProvider 와 동일한 패턴).
 * 예약 생성/변경/취소 시 방문자에게 알림을 보낸다.
 * 기본은 Mock(콘솔), 환경변수로 이메일(SMTP) 전환.
 */
export interface NotificationProvider {
  bookingCreated(booking: Booking): Promise<void>;
  bookingRescheduled(booking: Booking): Promise<void>;
  bookingCancelled(booking: Booking): Promise<void>;
}

/** NestJS DI 토큰 */
export const NOTIFICATION_PROVIDER = Symbol('NOTIFICATION_PROVIDER');
