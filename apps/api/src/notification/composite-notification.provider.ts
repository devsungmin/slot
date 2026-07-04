import type { Booking } from '@slot/shared';
import { NotificationProvider } from './notification-provider.interface';

/** 여러 알림 채널(이메일/SMS)에 동시에 발송한다. */
export class CompositeNotificationProvider implements NotificationProvider {
  constructor(private readonly channels: NotificationProvider[]) {}

  async bookingCreated(booking: Booking): Promise<void> {
    await Promise.all(this.channels.map((c) => c.bookingCreated(booking)));
  }
  async bookingRescheduled(booking: Booking): Promise<void> {
    await Promise.all(this.channels.map((c) => c.bookingRescheduled(booking)));
  }
  async bookingCancelled(booking: Booking): Promise<void> {
    await Promise.all(this.channels.map((c) => c.bookingCancelled(booking)));
  }
}
