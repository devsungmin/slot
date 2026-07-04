import { Logger, Module } from '@nestjs/common';
import { NOTIFICATION_PROVIDER, NotificationProvider } from './notification-provider.interface';
import { MockNotificationProvider } from './mock-notification.provider';
import { EmailNotificationProvider, readSmtpConfig } from './email-notification.provider';
import { SmsNotificationProvider } from './sms-notification.provider';
import { CompositeNotificationProvider } from './composite-notification.provider';
import { MockSmsSender, TwilioSmsSender, readTwilioConfig } from './sms-sender';

/**
 * 알림 모듈. 채널별로 환경변수로 구현을 선택한다.
 *   - 이메일: NOTIFY_PROVIDER = email(SMTP, SMTP_* 필요) | mock(콘솔, 기본)
 *   - SMS:   NOTIFY_SMS_PROVIDER = twilio(TWILIO_* 필요) | mock(콘솔, 기본) | off
 * 두 채널 모두 켜져 있으면 동시에 발송된다 (Composite).
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

        const smsKind = (process.env.NOTIFY_SMS_PROVIDER ?? 'mock').toLowerCase();
        if (smsKind === 'twilio') {
          Logger.log('SMS channel: Twilio', 'NotificationModule');
          channels.push(new SmsNotificationProvider(new TwilioSmsSender(readTwilioConfig())));
        } else if (smsKind !== 'off') {
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
