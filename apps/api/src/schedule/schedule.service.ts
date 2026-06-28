import { Inject, Injectable } from '@nestjs/common';
import type { DaySchedule, ScheduleResponse, TimeSlot } from '@slot/shared';
import { CALENDAR_PROVIDER, CalendarProvider } from '../calendar/calendar-provider.interface';
import { scheduleConfig } from '../config/schedule.config';
import { getZonedParts, parseHhMm, zonedWallTimeToUtc } from '../common/time.util';

@Injectable()
export class ScheduleService {
  constructor(@Inject(CALENDAR_PROVIDER) private readonly calendar: CalendarProvider) {}

  /**
   * 주간 그리드를 그리는 데 필요한 원본 데이터를 반환한다.
   * (일자별 근무 시간대 + 기간 내 바쁜 시간) — 실제 빈 시간 계산/선택은 프론트가 한다.
   */
  async getSchedule(from: Date, to: Date): Promise<ScheduleResponse> {
    const cfg = scheduleConfig;
    const now = new Date();
    const windowEnd = new Date(now.getTime() + cfg.bookingWindowDays * 24 * 60 * 60_000);
    const rangeStart = new Date(Math.max(from.getTime(), now.getTime()));
    const rangeEnd = new Date(Math.min(to.getTime(), windowEnd.getTime()));

    const days: DaySchedule[] = [];

    if (rangeStart < rangeEnd) {
      // 호스트 타임존 기준으로 하루씩 순회하며 근무 시간대를 만든다.
      const startParts = getZonedParts(rangeStart, cfg.timezone);
      const cursor = new Date(
        zonedWallTimeToUtc(startParts.year, startParts.month, startParts.day, 12, 0, cfg.timezone),
      );

      while (cursor <= rangeEnd) {
        const day = getZonedParts(cursor, cfg.timezone);
        const windows = cfg.workingHours[day.weekday] ?? [];
        const working: TimeSlot[] = windows.map((w) => {
          const { hour: sh, minute: sm } = parseHhMm(w.start);
          const { hour: eh, minute: em } = parseHhMm(w.end);
          return {
            start: zonedWallTimeToUtc(
              day.year,
              day.month,
              day.day,
              sh,
              sm,
              cfg.timezone,
            ).toISOString(),
            end: zonedWallTimeToUtc(
              day.year,
              day.month,
              day.day,
              eh,
              em,
              cfg.timezone,
            ).toISOString(),
          };
        });

        const date = `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
        days.push({ date, weekday: day.weekday, working });

        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    const busy = await this.calendar.getBusyIntervals(
      rangeStart.toISOString(),
      rangeEnd.toISOString(),
    );

    return {
      hostName: cfg.hostName,
      timezone: cfg.timezone,
      minNoticeHours: cfg.minNoticeHours,
      slotMinutes: cfg.slotMinutes,
      days,
      busy,
    };
  }
}
