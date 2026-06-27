import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import type { AvailabilityResponse } from '@slot/shared';
import { AvailabilityService } from './availability.service';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  /**
   * GET /api/availability?from=ISO&to=ISO&duration=30
   * from/to 미지정 시 오늘부터 7일을 기본값으로 사용한다.
   */
  @Get()
  async get(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('duration') duration?: string,
  ): Promise<AvailabilityResponse> {
    const now = new Date();
    const fromDate = from ? new Date(from) : now;
    const toDate = to ? new Date(to) : new Date(now.getTime() + 7 * 24 * 60 * 60_000);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('from/to는 유효한 ISO 8601 날짜여야 합니다.');
    }

    const durationMinutes = duration ? Number(duration) : undefined;
    if (
      durationMinutes !== undefined &&
      (!Number.isFinite(durationMinutes) || durationMinutes <= 0)
    ) {
      throw new BadRequestException('duration은 양의 정수(분)여야 합니다.');
    }

    return this.availability.getAvailability(fromDate, toDate, durationMinutes);
  }
}
