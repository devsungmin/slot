import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import type { BusyInterval } from '@slot/shared';
import { CalendarProvider, CreateEventInput, CreatedEvent } from './calendar-provider.interface';

interface CalendarState {
  seeded: BusyInterval[];
  events: Map<string, BusyInterval>;
}

/**
 * 메모리 기반 가짜 캘린더 (캘린더 ID별로 분리 → 멀티 호스트 지원).
 * - 캘린더마다 데모용 고정 바쁜 일정을 "오늘 기준 상대 시각"으로 생성한다.
 * - createEvent로 만든 예약도 해당 캘린더 바쁜 시간에 더해진다.
 *
 * 실제 Google 연동 시 이 클래스를 GoogleCalendarProvider로 교체한다.
 */
@Injectable()
export class MockCalendarProvider implements CalendarProvider {
  private readonly logger = new Logger(MockCalendarProvider.name);
  private readonly calendars = new Map<string, CalendarState>();

  /** 캘린더별 상태를 가져오되, 처음 보면 데모 일정을 시드한다. */
  private state(calendarId: string): CalendarState {
    let s = this.calendars.get(calendarId);
    if (!s) {
      s = { seeded: this.seed(calendarId), events: new Map() };
      this.calendars.set(calendarId, s);
      this.logger.log(`Seeded ${s.seeded.length} mock busy intervals for "${calendarId}"`);
    }
    return s;
  }

  /** 캘린더 ID에 따라 조금씩 다른 데모 일정을 만든다. */
  private seed(calendarId: string): BusyInterval[] {
    const now = new Date();
    const out: BusyInterval[] = [];
    const at = (dayOffset: number, hour: number, minute: number, durationMin: number): void => {
      const start = new Date(now);
      start.setDate(start.getDate() + dayOffset);
      start.setHours(hour, minute, 0, 0);
      const end = new Date(start.getTime() + durationMin * 60_000);
      out.push({ start: start.toISOString(), end: end.toISOString() });
    };

    // 캘린더마다 살짝 다르게 (해시로 시간 변형)
    const shift = calendarId.length % 3;
    at(1, 10 + shift, 30, 60);
    at(1, 14, 0, 90);
    at(2, 11, 0, 60);
    at(3, 15 - shift, 0, 30);
    at(4, 13, 0, 120);
    return out;
  }

  async getBusyIntervals(calendarId: string, from: string, to: string): Promise<BusyInterval[]> {
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    const s = this.state(calendarId);
    const all = [...s.seeded, ...s.events.values()];
    return all.filter((b) => {
      const start = new Date(b.start).getTime();
      const end = new Date(b.end).getTime();
      return start < toMs && end > fromMs;
    });
  }

  async createEvent(input: CreateEventInput): Promise<CreatedEvent> {
    const id = `mock_${uuid()}`;
    this.state(input.calendarId).events.set(id, { start: input.start, end: input.end });
    this.logger.log(
      `[MOCK] Created event ${id} on "${input.calendarId}": "${input.summary}" → invite to ${input.guestEmail}`,
    );
    return { id, htmlLink: `https://calendar.google.com/calendar/event?eid=${id}` };
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    input: CreateEventInput,
  ): Promise<CreatedEvent> {
    this.state(calendarId).events.set(eventId, { start: input.start, end: input.end });
    this.logger.log(`[MOCK] Updated event ${eventId} on "${calendarId}"`);
    return { id: eventId, htmlLink: `https://calendar.google.com/calendar/event?eid=${eventId}` };
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    this.state(calendarId).events.delete(eventId);
    this.logger.log(`[MOCK] Deleted event ${eventId} on "${calendarId}"`);
  }
}
