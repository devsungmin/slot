import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import type { ScheduleResponse } from '@slot/shared';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  /**
   * GET /api/schedule?from=ISO&to=ISO
   * from/to 미지정 시 오늘부터 14일을 기본값으로 사용한다.
   */
  @Get()
  async get(@Query('from') from?: string, @Query('to') to?: string): Promise<ScheduleResponse> {
    const now = new Date();
    const fromDate = from ? new Date(from) : now;
    const toDate = to ? new Date(to) : new Date(now.getTime() + 14 * 24 * 60 * 60_000);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('from/to는 유효한 ISO 8601 날짜여야 합니다.');
    }

    return this.schedule.getSchedule(fromDate, toDate);
  }
}
