import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import type { Booking } from '@slot/shared';
import { CALENDAR_PROVIDER, CalendarProvider } from '../calendar/calendar-provider.interface';
import { scheduleConfig } from '../config/schedule.config';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  /** 생성된 예약 보관 (데모용 인메모리) */
  private readonly bookings: Booking[] = [];

  constructor(@Inject(CALENDAR_PROVIDER) private readonly calendar: CalendarProvider) {}

  /** 슬롯을 예약하고 캘린더 이벤트(인비)를 생성한다. */
  async create(dto: CreateBookingDto): Promise<Booking> {
    const cfg = scheduleConfig;
    const start = new Date(dto.start);
    const end = new Date(dto.end);

    if (end <= start) {
      throw new ConflictException('종료 시각이 시작 시각보다 빠를 수 없습니다.');
    }
    if (start.getTime() < Date.now()) {
      throw new ConflictException('이미 지난 시간은 예약할 수 없습니다.');
    }

    // 선택한 슬롯이 아직 비어있는지 재확인 (동시 예약 방지).
    const busy = await this.calendar.getBusyIntervals(dto.start, dto.end);
    const taken = busy.some((b) => {
      const bs = new Date(b.start).getTime();
      const be = new Date(b.end).getTime();
      return start.getTime() < be && end.getTime() > bs;
    });
    if (taken) {
      throw new ConflictException('해당 시간은 이미 예약되었습니다. 다른 시간을 선택해주세요.');
    }

    // 방문자 정보를 이벤트 설명에 정리해 담는다.
    const description = [
      `이름: ${dto.guestName}`,
      dto.organization ? `소속: ${dto.organization}` : null,
      `이메일: ${dto.guestEmail}`,
      `연락처: ${dto.guestPhone}`,
    ]
      .filter(Boolean)
      .join('\n');

    const event = await this.calendar.createEvent({
      start: dto.start,
      end: dto.end,
      summary: `${cfg.hostName} ↔ ${dto.guestName}`,
      description,
      hostEmail: cfg.hostEmail,
      guestEmail: dto.guestEmail,
      guestName: dto.guestName,
      timezone: cfg.timezone,
    });

    const booking: Booking = {
      id: uuid(),
      start: dto.start,
      end: dto.end,
      guestName: dto.guestName,
      guestEmail: dto.guestEmail,
      guestPhone: dto.guestPhone,
      organization: dto.organization,
      calendarEventId: event.id,
      htmlLink: event.htmlLink,
      createdAt: new Date().toISOString(),
    };

    this.bookings.push(booking);
    this.logger.log(`Booking ${booking.id} created for ${dto.guestEmail} @ ${dto.start}`);

    return booking;
  }

  /** (디버그) 생성된 예약 목록 */
  findAll(): Booking[] {
    return this.bookings;
  }
}
