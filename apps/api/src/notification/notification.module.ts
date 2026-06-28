import { Logger, Module } from '@nestjs/common';
import { NOTIFICATION_PROVIDER, NotificationProvider } from './notification-provider.interface';
import { MockNotificationProvider } from './mock-notification.provider';
import { EmailNotificationProvider, readSmtpConfig } from './email-notification.provider';

/**
 * 알림 모듈. 환경변수 NOTIFY_PROVIDER 로 구현 선택.
 *   - 'email' → SMTP 이메일 (SMTP_* 필요)
 *   - 그 외/미설정 → Mock (콘솔, 기본값)
 */
@Module({
  providers: [
    {
      provide: NOTIFICATION_PROVIDER,
      useFactory: (): NotificationProvider => {
        const kind = (process.env.NOTIFY_PROVIDER ?? 'mock').toLowerCase();
        if (kind === 'email') {
          Logger.log('Using EmailNotificationProvider', 'NotificationModule');
          return new EmailNotificationProvider(readSmtpConfig());
        }
        Logger.log('Using MockNotificationProvider', 'NotificationModule');
        return new MockNotificationProvider();
      },
    },
  ],
  exports: [NOTIFICATION_PROVIDER],
})
export class NotificationModule {}
