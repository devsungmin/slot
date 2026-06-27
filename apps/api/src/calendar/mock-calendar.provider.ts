import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import type { BusyInterval } from '@slot/shared';
import { CalendarProvider, CreateEventInput, CreatedEvent } from './calendar-provider.interface';

/**
 * 메모리 기반 가짜 캘린더.
 * - 데모용 고정 바쁜 일정 몇 개를 "오늘 기준 상대 시각"으로 생성한다.
 * - createEvent로 만든 예약도 바쁜 시간에 더해져, 같은 슬롯을 두 번 못 잡게 한다.
 *
 * 실제 Google 연동 시 이 클래스를 GoogleCalendarProvider로 교체한다.
 */
@Injectable()
export class MockCalendarProvider implements CalendarProvider {
  private readonly logger = new Logger(MockCalendarProvider.name);

  /** 런타임 동안 누적되는 바쁜 시간 (시드 + 새 예약) */
  private readonly busy: BusyInterval[] = [];

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
      this.busy.push({ start: start.toISOString(), end: end.toISOString() });
    };

    // 평일 점심 전후로 회의가 군데군데 잡혀있는 상황을 흉내 낸다.
    at(1, 10, 30, 60); // 내일 오전 회의
    at(1, 14, 0, 90); // 내일 오후 회의
    at(2, 11, 0, 60); // 모레 오전
    at(3, 15, 0, 30); // 3일 뒤 오후
    at(4, 13, 0, 120); // 4일 뒤 오후 장시간

    this.logger.log(`Seeded ${this.busy.length} mock busy intervals`);
  }

  async getBusyIntervals(from: string, to: string): Promise<BusyInterval[]> {
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();

    // 요청 기간과 겹치는 구간만 반환한다.
    return this.busy.filter((b) => {
      const s = new Date(b.start).getTime();
      const e = new Date(b.end).getTime();
      return s < toMs && e > fromMs;
    });
  }

  async createEvent(input: CreateEventInput): Promise<CreatedEvent> {
    const id = `mock_${uuid()}`;

    // 새 예약을 바쁜 시간에 반영 → 중복 예약 방지.
    this.busy.push({ start: input.start, end: input.end });

    this.logger.log(
      `[MOCK] Created event ${id}: "${input.summary}" ${input.start} → invite to ${input.guestEmail}`,
    );

    return {
      id,
      htmlLink: `https://calendar.google.com/calendar/event?eid=${id}`,
    };
  }
}
