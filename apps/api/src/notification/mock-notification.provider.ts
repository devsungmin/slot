import { Injectable, Logger } from '@nestjs/common';
import type { Booking } from '@slot/shared';
import { NotificationProvider } from './notification-provider.interface';
import { buildMessage } from './notification-message';

/**
 * 기본 알림 구현. 실제 발송 대신 콘솔에 기록한다 (자격증명 불필요).
 * 실제 발송은 EmailNotificationProvider 로 전환 (NOTIFY_PROVIDER=email).
 */
@Injectable()
export class MockNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(MockNotificationProvider.name);

  private log(kind: 'created' | 'rescheduled' | 'cancelled', booking: Booking): void {
    const msg = buildMessage(kind, booking);
    this.logger.log(`[NOTIFY:mock] → ${msg.to} | ${msg.subject}`);
  }

  async bookingCreated(booking: Booking): Promise<void> {
    this.log('created', booking);
  }
  async bookingRescheduled(booking: Booking): Promise<void> {
    this.log('rescheduled', booking);
  }
  async bookingCancelled(booking: Booking): Promise<void> {
    this.log('cancelled', booking);
  }
}
