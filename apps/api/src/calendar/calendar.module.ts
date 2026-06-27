import { Logger, Module } from '@nestjs/common';
import { CALENDAR_PROVIDER, CalendarProvider } from './calendar-provider.interface';
import { MockCalendarProvider } from './mock-calendar.provider';
import { GoogleCalendarProvider } from './google-calendar.provider';
import { readGoogleConfig } from './google-oauth';

/**
 * 캘린더 연동 모듈.
 *
 * 환경변수 CALENDAR_PROVIDER 로 구현을 선택한다.
 *   - 'google' → 실제 Google Calendar (GOOGLE_* 자격증명 필요)
 *   - 그 외/미설정 → MockCalendarProvider (기본값, 자격증명 불필요)
 */
@Module({
  providers: [
    {
      provide: CALENDAR_PROVIDER,
      useFactory: (): CalendarProvider => {
        const kind = (process.env.CALENDAR_PROVIDER ?? 'mock').toLowerCase();
        if (kind === 'google') {
          Logger.log('Using GoogleCalendarProvider', 'CalendarModule');
          return new GoogleCalendarProvider(readGoogleConfig());
        }
        Logger.log('Using MockCalendarProvider', 'CalendarModule');
        return new MockCalendarProvider();
      },
    },
  ],
  exports: [CALENDAR_PROVIDER],
})
export class CalendarModule {}
