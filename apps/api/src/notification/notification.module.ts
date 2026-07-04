import { Logger, Module } from '@nestjs/common';
import { NOTIFICATION_PROVIDER, NotificationProvider } from './notification-provider.interface';
import { MockNotificationProvider } from './mock-notification.provider';
import { EmailNotificationProvider, readSmtpConfig } from './email-notification.provider';
import { SmsNotificationProvider } from './sms-notification.provider';
import { CompositeNotificationProvider } from './composite-notification.provider';
import { MockSmsSender, TwilioSmsSender, readTwilioConfig } from './sms-sender';
import {
  MockTelegramNotificationProvider,
  TelegramNotificationProvider,
  readTelegramConfig,
} from './telegram-notification.provider';

/**
 * 알림 모듈. 채널별로 환경변수로 구현을 선택한다.
 *   - 방문자 이메일:  NOTIFY_PROVIDER = email(SMTP, SMTP_* 필요) | mock(콘솔, 기본) | off
 *   - 호스트 텔레그램: NOTIFY_TELEGRAM_PROVIDER = telegram(TELEGRAM_* 필요) | mock(콘솔, 기본) | off
 *     → 예약 생성/변경/취소 시 호스트에게 "누가/언제" 알림
 *   - 방문자 SMS:    NOTIFY_SMS_PROVIDER = twilio(TWILIO_* 필요) | mock | off(기본)
 * 켜진 채널 모두에 동시에 발송된다 (Composite).
 */
@Module({
  providers: [
    {
      provide: NOTIFICATION_PROVIDER,
      useFactory: (): NotificationProvider => {
        const channels: NotificationProvider[] = [];

        const emailKind = (process.env.NOTIFY_PROVIDER ?? 'mock').toLowerCase();
        if (emailKind === 'email') {
          Logger.log('Email channel: SMTP', 'NotificationModule');
          channels.push(new EmailNotificationProvider(readSmtpConfig()));
        } else if (emailKind !== 'off') {
          Logger.log('Email channel: mock(console)', 'NotificationModule');
          channels.push(new MockNotificationProvider());
        }

        const telegramKind = (process.env.NOTIFY_TELEGRAM_PROVIDER ?? 'mock').toLowerCase();
        if (telegramKind === 'telegram') {
          Logger.log('Telegram channel: Bot API (host)', 'NotificationModule');
          channels.push(new TelegramNotificationProvider(readTelegramConfig()));
        } else if (telegramKind !== 'off') {
          Logger.log('Telegram channel: mock(console, host)', 'NotificationModule');
          channels.push(new MockTelegramNotificationProvider());
        }

        const smsKind = (process.env.NOTIFY_SMS_PROVIDER ?? 'off').toLowerCase();
        if (smsKind === 'twilio') {
          Logger.log('SMS channel: Twilio', 'NotificationModule');
          channels.push(new SmsNotificationProvider(new TwilioSmsSender(readTwilioConfig())));
        } else if (smsKind === 'mock') {
          Logger.log('SMS channel: mock(console)', 'NotificationModule');
          channels.push(new SmsNotificationProvider(new MockSmsSender()));
        }

        return new CompositeNotificationProvider(channels);
      },
    },
  ],
  exports: [NOTIFICATION_PROVIDER],
})
export class NotificationModule {}
