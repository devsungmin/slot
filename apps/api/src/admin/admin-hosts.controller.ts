import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import type { HostSettings, WorkingWindow } from '@slot/shared';
import { getHost, listHosts, removeHost, upsertHost } from '../config/host-registry';
import { UpsertHostDto } from './dto/upsert-host.dto';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * 호스트 관리 API. ADMIN_TOKEN 환경변수와 x-admin-token 헤더가 일치해야 한다.
 * ADMIN_TOKEN 미설정 시 관리 API 전체가 비활성화된다.
 */
@Controller('admin/hosts')
export class AdminHostsController {
  private assertAdmin(token?: string): void {
    const expected = process.env.ADMIN_TOKEN;
    if (!expected) {
      throw new ForbiddenException('관리 API가 비활성화되어 있습니다 (ADMIN_TOKEN 미설정).');
    }
    if (token !== expected) {
      throw new UnauthorizedException('관리 토큰이 올바르지 않습니다.');
    }
  }

  /** DTO → 저장용 HostSettings (기존 값/기본값 채움) */
  private toHost(dto: UpsertHostDto, base?: HostSettings): HostSettings {
    const fallback = base ?? getHost(); // 새 호스트면 기본 호스트의 규칙을 물려받는다
    const workingHours = dto.workingHours ?? fallback.workingHours;
    this.validateWorkingHours(workingHours);
    this.validateTimezone(dto.timezone);

    return {
      slug: dto.slug,
      hostName: dto.hostName,
      hostEmail: dto.hostEmail,
      timezone: dto.timezone,
      calendarId: dto.calendarId ?? base?.calendarId ?? 'primary',
      slotMinutes: dto.slotMinutes ?? fallback.slotMinutes,
      slotIntervalMinutes: dto.slotIntervalMinutes ?? fallback.slotIntervalMinutes,
      minNoticeHours: dto.minNoticeHours ?? fallback.minNoticeHours,
      bookingWindowDays: dto.bookingWindowDays ?? fallback.bookingWindowDays,
      workingHours,
    };
  }

  private validateTimezone(tz: string): void {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz });
    } catch {
      throw new BadRequestException(`유효하지 않은 타임존입니다: ${tz}`);
    }
  }

  private validateWorkingHours(hours: Record<number, WorkingWindow[]>): void {
    for (const [day, windows] of Object.entries(hours)) {
      const weekday = Number(day);
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !Array.isArray(windows)) {
        throw new BadRequestException('workingHours 는 0(일)~6(토) 키의 배열이어야 합니다.');
      }
      for (const w of windows) {
        if (!HHMM.test(w?.start ?? '') || !HHMM.test(w?.end ?? '') || w.start >= w.end) {
          throw new BadRequestException(
            `근무 시간대가 올바르지 않습니다 (요일 ${weekday}): "HH:mm" 형식, 시작 < 종료`,
          );
        }
      }
    }
  }

  /** GET /api/admin/hosts — 전체 호스트 목록 */
  @Get()
  list(@Headers('x-admin-token') token?: string): HostSettings[] {
    this.assertAdmin(token);
    return listHosts();
  }

  /** POST /api/admin/hosts — 호스트 추가 */
  @Post()
  create(@Body() dto: UpsertHostDto, @Headers('x-admin-token') token?: string): HostSettings {
    this.assertAdmin(token);
    if (listHosts().some((h) => h.slug === dto.slug)) {
      throw new ConflictException(`이미 존재하는 slug 입니다: ${dto.slug}`);
    }
    return upsertHost(this.toHost(dto));
  }

  /** PUT /api/admin/hosts/:slug — 호스트 수정 (slug 변경 불가) */
  @Put(':slug')
  update(
    @Param('slug') slug: string,
    @Body() dto: UpsertHostDto,
    @Headers('x-admin-token') token?: string,
  ): HostSettings {
    this.assertAdmin(token);
    const existing = listHosts().find((h) => h.slug === slug);
    if (!existing) {
      throw new NotFoundException(`호스트를 찾을 수 없습니다: ${slug}`);
    }
    if (dto.slug !== slug) {
      throw new BadRequestException('slug 는 변경할 수 없습니다.');
    }
    return upsertHost(this.toHost(dto, existing));
  }

  /** DELETE /api/admin/hosts/:slug — 호스트 삭제 (기본 호스트 불가) */
  @Delete(':slug')
  remove(@Param('slug') slug: string, @Headers('x-admin-token') token?: string): { ok: boolean } {
    this.assertAdmin(token);
    try {
      if (!removeHost(slug)) {
        throw new NotFoundException(`호스트를 찾을 수 없습니다: ${slug}`);
      }
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new ConflictException(err instanceof Error ? err.message : String(err));
    }
    return { ok: true };
  }
}
