import { Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import type { Booking } from '@slot/shared';
import { NotificationProvider } from './notification-provider.interface';
import { buildMessage, type NotifyKind } from './notification-message';

export interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
}

export const readSmtpConfig = (): SmtpConfig => ({
  host: process.env.SMTP_HOST ?? '',
  port: Number(process.env.SMTP_PORT ?? 587),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM ?? 'Slot <no-reply@slot.local>',
});

/**
 * SMTP 이메일 알림. NOTIFY_PROVIDER=email + SMTP_* 환경변수로 활성화.
 */
export class EmailNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(EmailNotificationProvider.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(cfg: SmtpConfig) {
    if (!cfg.host) {
      throw new Error('이메일 알림에 SMTP_HOST 가 필요합니다.');
    }
    this.transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
    this.from = cfg.from;
    this.logger.log(`EmailNotificationProvider active (smtp: ${cfg.host}:${cfg.port})`);
  }

  private async send(kind: NotifyKind, booking: Booking): Promise<void> {
    const msg = buildMessage(kind, booking);
    await this.transporter.sendMail({
      from: this.from,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
    });
    this.logger.log(`[NOTIFY:email] sent → ${msg.to} | ${msg.subject}`);
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
