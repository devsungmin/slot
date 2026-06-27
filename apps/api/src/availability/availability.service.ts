import { Inject, Injectable } from '@nestjs/common';
import type { AvailabilityResponse, BusyInterval, TimeSlot } from '@slot/shared';
import { CALENDAR_PROVIDER, CalendarProvider } from '../calendar/calendar-provider.interface';
import { scheduleConfig } from '../config/schedule.config';
import { getZonedParts, parseHhMm, zonedWallTimeToUtc } from '../common/time.util';

@Injectable()
export class AvailabilityService {
  constructor(@Inject(CALENDAR_PROVIDER) private readonly calendar: CalendarProvider) {}

  /**
   * [from, to) 기간에서 예약 가능한 슬롯을 계산한다.
   * = (요일별 근무 시간으로 만든 후보 슬롯) − (캘린더 바쁜 시간) − (최소 공지/예약 윈도우 밖)
   */
  async getAvailability(
    from: Date,
    to: Date,
    durationMinutes?: number,
  ): Promise<AvailabilityResponse> {
    const cfg = scheduleConfig;
    const slotMinutes = durationMinutes ?? cfg.slotMinutes;
    const now = new Date();

    // 예약 가능한 실질 범위로 좁힌다.
    const earliest = new Date(now.getTime() + cfg.minNoticeHours * 60 * 60_000);
    const windowEnd = new Date(now.getTime() + cfg.bookingWindowDays * 24 * 60 * 60_000);
    const rangeStart = new Date(Math.max(from.getTime(), earliest.getTime()));
    const rangeEnd = new Date(Math.min(to.getTime(), windowEnd.getTime()));

    if (rangeStart >= rangeEnd) {
      return { timezone: cfg.timezone, slotMinutes, slots: [] };
    }

    const busy = await this.calendar.getBusyIntervals(
      rangeStart.toISOString(),
      rangeEnd.toISOString(),
    );

    const candidates = this.generateCandidateSlots(rangeStart, rangeEnd, slotMinutes);
    const slots = candidates.filter(
      (slot) => !this.overlapsAny(slot, busy) && this.withinRange(slot, rangeStart, rangeEnd),
    );

    return { timezone: cfg.timezone, slotMinutes, slots };
  }

  /** 근무 시간 규칙으로 후보 슬롯을 생성한다 (바쁜 시간 미반영). */
  private generateCandidateSlots(
    rangeStart: Date,
    rangeEnd: Date,
    slotMinutes: number,
  ): TimeSlot[] {
    const cfg = scheduleConfig;
    const step = slotMinutes + cfg.slotIntervalMinutes;
    const slots: TimeSlot[] = [];

    // 호스트 타임존 기준으로 하루씩 순회한다.
    const startParts = getZonedParts(rangeStart, cfg.timezone);
    const cursor = new Date(
      zonedWallTimeToUtc(startParts.year, startParts.month, startParts.day, 12, 0, cfg.timezone),
    );

    while (cursor <= rangeEnd) {
      const day = getZonedParts(cursor, cfg.timezone);
      const windows = cfg.workingHours[day.weekday] ?? [];

      for (const window of windows) {
        const { hour: sh, minute: sm } = parseHhMm(window.start);
        const { hour: eh, minute: em } = parseHhMm(window.end);
        const windowStart = zonedWallTimeToUtc(day.year, day.month, day.day, sh, sm, cfg.timezone);
        const windowEnd = zonedWallTimeToUtc(day.year, day.month, day.day, eh, em, cfg.timezone);

        let slotStart = windowStart.getTime();
        while (slotStart + slotMinutes * 60_000 <= windowEnd.getTime()) {
          const slotEnd = slotStart + slotMinutes * 60_000;
          slots.push({
            start: new Date(slotStart).toISOString(),
            end: new Date(slotEnd).toISOString(),
          });
          slotStart += step * 60_000;
        }
      }

      // 다음 날 정오로 이동 (DST가 있어도 정오 기준이라 안전).
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return slots.sort((a, b) => a.start.localeCompare(b.start));
  }

  private overlapsAny(slot: TimeSlot, busy: BusyInterval[]): boolean {
    const s = new Date(slot.start).getTime();
    const e = new Date(slot.end).getTime();
    return busy.some((b) => {
      const bs = new Date(b.start).getTime();
      const be = new Date(b.end).getTime();
      return s < be && e > bs;
    });
  }

  private withinRange(slot: TimeSlot, rangeStart: Date, rangeEnd: Date): boolean {
    const s = new Date(slot.start).getTime();
    const e = new Date(slot.end).getTime();
    return s >= rangeStart.getTime() && e <= rangeEnd.getTime();
  }
}
