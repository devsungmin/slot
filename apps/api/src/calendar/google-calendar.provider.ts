import { Logger } from '@nestjs/common';
import { calendar_v3, google } from 'googleapis';
import type { BusyInterval } from '@slot/shared';
import { CalendarProvider, CreateEventInput, CreatedEvent } from './calendar-provider.interface';
import { GoogleConfig, createOAuthClient } from './google-oauth';

/**
 * 실제 Google Calendar 연동.
 *
 * 활성화: 환경변수 CALENDAR_PROVIDER=google + GOOGLE_* 자격증명 설정.
 * (자세한 설정은 apps/api/.env.example, CLAUDE.md 참고)
 *
 * - 바쁜 시간: calendar.freebusy.query
 * - 이벤트 생성/인비 발송: calendar.events.insert (sendUpdates: 'all')
 */
export class GoogleCalendarProvider implements CalendarProvider {
  private readonly logger = new Logger(GoogleCalendarProvider.name);
  private readonly calendar: calendar_v3.Calendar;

  constructor(cfg: GoogleConfig) {
    if (!cfg.clientId || !cfg.clientSecret || !cfg.refreshToken) {
      throw new Error(
        'Google Calendar 연동 환경변수가 없습니다. GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN 를 설정하세요.',
      );
    }
    const auth = createOAuthClient(cfg);
    auth.setCredentials({ refresh_token: cfg.refreshToken });
    this.calendar = google.calendar({ version: 'v3', auth });
    this.logger.log('GoogleCalendarProvider active');
  }

  async getBusyIntervals(calendarId: string, from: string, to: string): Promise<BusyInterval[]> {
    const res = await this.calendar.freebusy.query({
      requestBody: {
        timeMin: from,
        timeMax: to,
        items: [{ id: calendarId }],
      },
    });
    const busy = res.data.calendars?.[calendarId]?.busy ?? [];
    return busy
      .filter((b): b is { start: string; end: string } => Boolean(b.start && b.end))
      .map((b) => ({ start: b.start, end: b.end }));
  }

  async createEvent(input: CreateEventInput): Promise<CreatedEvent> {
    const res = await this.calendar.events.insert({
      calendarId: input.calendarId,
      sendUpdates: 'all', // 호스트·방문자에게 인비 메일 발송
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start, timeZone: input.timezone },
        end: { dateTime: input.end, timeZone: input.timezone },
        attendees: [{ email: input.guestEmail, displayName: input.guestName }],
      },
    });

    this.logger.log(`Created Google event ${res.data.id} → invite to ${input.guestEmail}`);
    return {
      id: res.data.id ?? '',
      htmlLink: res.data.htmlLink ?? undefined,
    };
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    input: CreateEventInput,
  ): Promise<CreatedEvent> {
    const res = await this.calendar.events.update({
      calendarId,
      eventId,
      sendUpdates: 'all',
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start, timeZone: input.timezone },
        end: { dateTime: input.end, timeZone: input.timezone },
        attendees: [{ email: input.guestEmail, displayName: input.guestName }],
      },
    });
    this.logger.log(`Updated Google event ${eventId}`);
    return { id: res.data.id ?? eventId, htmlLink: res.data.htmlLink ?? undefined };
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: 'all',
    });
    this.logger.log(`Deleted Google event ${eventId}`);
  }
}
