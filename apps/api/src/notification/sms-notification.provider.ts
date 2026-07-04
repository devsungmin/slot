import type { Booking } from '@slot/shared';
import { NotificationProvider } from './notification-provider.interface';
import { buildMessage, type NotifyKind } from './notification-message';
import type { SmsSender } from './sms-sender';

/**
 * SMS 알림 채널. 발송 수단(SmsSender)은 Mock ↔ Twilio 로 교체 가능하다.
 * 방문자 연락처(guestPhone)로 예약 생성/변경/취소를 알린다.
 */
export class SmsNotificationProvider implements NotificationProvider {
  constructor(private readonly sender: SmsSender) {}

  private async send(kind: NotifyKind, booking: Booking): Promise<void> {
    const msg = buildMessage(kind, booking);
    await this.sender.send(booking.guestPhone, `${msg.subject}\n${msg.text}`);
  }

  async bookingCreated(booking: Booking): Promise<void> {
    await this.send('created', booking);
  }
  async bookingRescheduled(booking: Booking): Promise<void> {
    await this.send('rescheduled', booking);
  }
  async bookingCancelled(booking: Booking): Promise<void> {
    await this.send('cancelled', booking);
  }
}
