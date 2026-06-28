import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import type { Booking } from '@slot/shared';
import { CALENDAR_PROVIDER, CalendarProvider } from '../calendar/calendar-provider.interface';
import { getHost } from '../config/schedule.config';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingRepository } from './booking.repository';

interface Interval {
  start: string;
  end: string;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @Inject(CALENDAR_PROVIDER) private readonly calendar: CalendarProvider,
    private readonly repo: BookingRepository,
  ) {}

  /** 슬롯을 예약하고 캘린더 이벤트(인비)를 생성한다. */
  async create(dto: CreateBookingDto): Promise<Booking> {
    const cfg = getHost(dto.hostSlug);
    this.assertValidRange(dto.start, dto.end);
    await this.assertSlotFree(cfg.calendarId, dto.start, dto.end);

    const event = await this.calendar.createEvent({
      calendarId: cfg.calendarId,
      start: dto.start,
      end: dto.end,
      summary: `${cfg.hostName} ↔ ${dto.guestName}`,
      description: this.describe(dto),
      hostEmail: cfg.hostEmail,
      guestEmail: dto.guestEmail,
      guestName: dto.guestName,
      timezone: cfg.timezone,
    });

    const booking: Booking = {
      id: uuid(),
      hostSlug: cfg.slug,
      calendarId: cfg.calendarId,
      start: dto.start,
      end: dto.end,
      guestName: dto.guestName,
      guestEmail: dto.guestEmail,
      guestPhone: dto.guestPhone,
      organization: dto.organization,
      calendarEventId: event.id,
      htmlLink: event.htmlLink,
      status: 'confirmed',
      cancelToken: uuid(),
      createdAt: new Date().toISOString(),
    };

    this.repo.create(booking);
    this.logger.log(`Booking ${booking.id} created for ${dto.guestEmail} @ ${dto.start}`);
    return booking;
  }

  /** 예약 관리 토큰으로 조회 */
  getByToken(token: string): Booking {
    const booking = this.repo.findByToken(token);
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    return booking;
  }

  /** 예약 취소 → 캘린더 이벤트 삭제 (참석자에게 취소 메일) */
  async cancel(token: string): Promise<Booking> {
    const booking = this.getByToken(token);
    if (booking.status === 'cancelled') {
      return booking; // 이미 취소됨 (멱등)
    }
    await this.calendar.deleteEvent(booking.calendarId, booking.calendarEventId);
    const updated = this.repo.update(booking.id, { status: 'cancelled' });
    this.logger.log(`Booking ${booking.id} cancelled`);
    return updated ?? { ...booking, status: 'cancelled' };
  }

  /** 예약 시간 변경 → 캘린더 이벤트 업데이트 */
  async reschedule(token: string, start: string, end: string): Promise<Booking> {
    const booking = this.getByToken(token);
    if (booking.status === 'cancelled') {
      throw new ConflictException('취소된 예약은 변경할 수 없습니다.');
    }
    this.assertValidRange(start, end);
    // 자기 자신의 현재 시간은 충돌에서 제외
    await this.assertSlotFree(booking.calendarId, start, end, {
      start: booking.start,
      end: booking.end,
    });

    const cfg = getHost(booking.hostSlug);
    const event = await this.calendar.updateEvent(booking.calendarId, booking.calendarEventId, {
      calendarId: booking.calendarId,
      start,
      end,
      summary: `${cfg.hostName} ↔ ${booking.guestName}`,
      description: this.describe(booking),
      hostEmail: cfg.hostEmail,
      guestEmail: booking.guestEmail,
      guestName: booking.guestName,
      timezone: cfg.timezone,
    });

    const updated = this.repo.update(booking.id, {
      start,
      end,
      htmlLink: event.htmlLink ?? booking.htmlLink,
    });
    this.logger.log(`Booking ${booking.id} rescheduled → ${start}`);
    return updated ?? booking;
  }

  /** (디버그) 생성된 예약 목록 */
  findAll(): Booking[] {
    return this.repo.findAll();
  }

  // ── helpers ──

  private assertValidRange(start: string, end: string): void {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (e <= s) {
      throw new ConflictException('종료 시각이 시작 시각보다 빠를 수 없습니다.');
    }
    if (s < Date.now()) {
      throw new ConflictException('이미 지난 시간은 예약할 수 없습니다.');
    }
  }

  /** 해당 캘린더의 구간이 비어있는지 확인 (ignore 구간은 충돌에서 제외) */
  private async assertSlotFree(
    calendarId: string,
    start: string,
    end: string,
    ignore?: Interval,
  ): Promise<void> {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const busy = await this.calendar.getBusyIntervals(calendarId, start, end);
    const taken = busy.some((b) => {
      if (ignore && b.start === ignore.start && b.end === ignore.end) return false;
      const bs = new Date(b.start).getTime();
      const be = new Date(b.end).getTime();
      return s < be && e > bs;
    });
    if (taken) {
      throw new ConflictException('해당 시간은 이미 예약되었습니다. 다른 시간을 선택해주세요.');
    }
  }

  private describe(info: {
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    organization?: string;
  }): string {
    return [
      `이름: ${info.guestName}`,
      info.organization ? `소속: ${info.organization}` : null,
      `이메일: ${info.guestEmail}`,
      `연락처: ${info.guestPhone}`,
    ]
      .filter(Boolean)
      .join('\n');
  }
}
