import type { Booking } from '@slot/shared';
import { getHost } from '../config/host-registry';

export type NotifyKind = 'created' | 'rescheduled' | 'cancelled';

export interface NotifyMessage {
  to: string;
  subject: string;
  text: string;
}

const appBaseUrl = (): string => process.env.APP_BASE_URL ?? 'http://localhost:5173';

const formatRange = (booking: Booking, timeZone: string): string => {
  const date = new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(booking.start));
  const end = new Intl.DateTimeFormat('ko-KR', { timeZone, timeStyle: 'short' }).format(
    new Date(booking.end),
  );
  return `${date} – ${end} (${timeZone})`;
};

/** 예약 이벤트별 방문자 알림 메시지를 만든다. */
export const buildMessage = (kind: NotifyKind, booking: Booking): NotifyMessage => {
  const host = getHost(booking.hostSlug);
  const when = formatRange(booking, host.timezone);
  const manageUrl = `${appBaseUrl()}/?manage=${booking.cancelToken}`;

  const heads: Record<NotifyKind, string> = {
    created: `[Slot] 예약이 확정되었어요 — ${host.hostName}`,
    rescheduled: `[Slot] 예약 시간이 변경되었어요 — ${host.hostName}`,
    cancelled: `[Slot] 예약이 취소되었어요 — ${host.hostName}`,
  };
  const intros: Record<NotifyKind, string> = {
    created: `${booking.guestName}님, ${host.hostName}님과의 약속이 확정되었습니다.`,
    rescheduled: `${booking.guestName}님, 약속 시간이 아래로 변경되었습니다.`,
    cancelled: `${booking.guestName}님, 아래 약속이 취소되었습니다.`,
  };

  const lines = [intros[kind], '', `• 일시: ${when}`, `• 호스트: ${host.hostName}`];
  if (kind !== 'cancelled') {
    lines.push('', `예약 변경/취소: ${manageUrl}`);
  }

  return { to: booking.guestEmail, subject: heads[kind], text: lines.join('\n') };
};

/** 호스트(나)에게 보내는 알림 본문 — 누가/언제 예약했는지 (텔레그램 등) */
export const buildHostMessage = (kind: NotifyKind, booking: Booking): string => {
  const host = getHost(booking.hostSlug);
  const when = formatRange(booking, host.timezone);

  const heads: Record<NotifyKind, string> = {
    created: '🆕 새 예약',
    rescheduled: '🔄 예약 변경',
    cancelled: '❌ 예약 취소',
  };
  const org = booking.organization ? ` (${booking.organization})` : '';

  return [
    `${heads[kind]} — ${host.hostName}`,
    `• 방문자: ${booking.guestName}${org}`,
    `• 일시: ${when}`,
    `• 연락처: ${booking.guestPhone}`,
    `• 이메일: ${booking.guestEmail}`,
  ].join('\n');
};
