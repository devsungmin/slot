import { Logger } from '@nestjs/common';
import type { Booking } from '@slot/shared';
import { NotificationProvider } from './notification-provider.interface';
import { buildHostMessage, type NotifyKind } from './notification-message';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export const readTelegramConfig = (): TelegramConfig => ({
  botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  chatId: process.env.TELEGRAM_CHAT_ID ?? '',
});

/**
 * 호스트(나)에게 텔레그램으로 예약 알림을 보낸다 — 누가/언제 예약·변경·취소했는지.
 * NOTIFY_TELEGRAM_PROVIDER=telegram + TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID 로 활성화.
 * (봇 생성: @BotFather → 토큰 발급, chat id: 봇에게 아무 메시지 보낸 뒤 getUpdates 로 확인)
 */
export class TelegramNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(TelegramNotificationProvider.name);

  constructor(private readonly cfg: TelegramConfig) {
    if (!cfg.botToken || !cfg.chatId) {
      throw new Error('텔레그램 알림에 TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID 가 필요합니다.');
    }
    this.logger.log('TelegramNotificationProvider active');
  }

  private async send(kind: NotifyKind, booking: Booking): Promise<void> {
    const text = buildHostMessage(kind, booking);
    const res = await fetch(`https://api.telegram.org/bot${this.cfg.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: this.cfg.chatId, text }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`텔레그램 발송 실패 (${res.status}): ${detail.slice(0, 200)}`);
    }
    this.logger.log(`[TELEGRAM] sent → chat ${this.cfg.chatId}`);
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

/** 기본값. 실제 발송 대신 호스트 알림 내용을 콘솔에 기록한다. */
export class MockTelegramNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(MockTelegramNotificationProvider.name);

  private log(kind: NotifyKind, booking: Booking): void {
    this.logger.log(`[TELEGRAM:mock]\n${buildHostMessage(kind, booking)}`);
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
