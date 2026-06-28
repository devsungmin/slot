import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import type { BusyInterval } from '@slot/shared';
import { CalendarProvider, CreateEventInput, CreatedEvent } from './calendar-provider.interface';

/**
 * 메모리 기반 가짜 캘린더.
 * - 데모용 고정 바쁜 일정 몇 개를 "오늘 기준 상대 시각"으로 생성한다.
 * - createEvent로 만든 예약도 바쁜 시간에 더해져, 같은 슬롯을 두 번 못 잡게 한다.
 * - updateEvent/deleteEvent로 생성된 이벤트를 수정·삭제할 수 있다.
 *
 * 실제 Google 연동 시 이 클래스를 GoogleCalendarProvider로 교체한다.
 */
@Injectable()
export class MockCalendarProvider implements CalendarProvider {
  private readonly logger = new Logger(MockCalendarProvider.name);

  /** 시드된(고정) 바쁜 시간 */
  private readonly seeded: BusyInterval[] = [];
  /** createEvent로 생성된 이벤트 (id → 구간) — 수정/삭제 대상 */
  private readonly events = new Map<string, BusyInterval>();

  constructor() {
    this.seed();
  }

  /** 데모를 위해 앞으로 며칠간 가짜 일정을 흩뿌린다. */
  private seed(): void {
    const now = new Date();
    const at = (dayOffset: number, hour: number, minute: number, durationMin: number): void => {
      const start = new Date(now);
      start.setDate(start.getDate() + dayOffset);
      start.setHours(hour, minute, 0, 0);
      const end = new Date(start.getTime() + durationMin * 60_000);
      this.seeded.push({ start: start.toISOString(), end: end.toISOString() });
    };

    at(1, 10, 30, 60);
    at(1, 14, 0, 90);
    at(2, 11, 0, 60);
    at(3, 15, 0, 30);
    at(4, 13, 0, 120);

    this.logger.log(`Seeded ${this.seeded.length} mock busy intervals`);
  }

  async getBusyIntervals(from: string, to: string): Promise<BusyInterval[]> {
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    const all = [...this.seeded, ...this.events.values()];

    return all.filter((b) => {
      const s = new Date(b.start).getTime();
      const e = new Date(b.end).getTime();
      return s < toMs && e > fromMs;
    });
  }

  async createEvent(input: CreateEventInput): Promise<CreatedEvent> {
    const id = `mock_${uuid()}`;
    this.events.set(id, { start: input.start, end: input.end });

    this.logger.log(
      `[MOCK] Created event ${id}: "${input.summary}" ${input.start} → invite to ${input.guestEmail}`,
    );

    return {
      id,
      htmlLink: `https://calendar.google.com/calendar/event?eid=${id}`,
    };
  }

  async updateEvent(eventId: string, input: CreateEventInput): Promise<CreatedEvent> {
    this.events.set(eventId, { start: input.start, end: input.end });
    this.logger.log(`[MOCK] Updated event ${eventId} → ${input.start} ~ ${input.end}`);
    return {
      id: eventId,
      htmlLink: `https://calendar.google.com/calendar/event?eid=${eventId}`,
    };
  }

  async deleteEvent(eventId: string): Promise<void> {
    this.events.delete(eventId);
    this.logger.log(`[MOCK] Deleted event ${eventId}`);
  }
}
