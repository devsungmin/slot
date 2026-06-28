import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { Booking } from '@slot/shared';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleDto } from './dto/reschedule.dto';

@Controller('bookings')
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  /** POST /api/bookings — 슬롯 예약 + 캘린더 이벤트 생성 */
  @Post()
  async create(@Body() dto: CreateBookingDto): Promise<Booking> {
    return this.booking.create(dto);
  }

  /** GET /api/bookings — (디버그) 생성된 예약 목록 */
  @Get()
  findAll(): Booking[] {
    return this.booking.findAll();
  }

  /** GET /api/bookings/:token — 예약 관리 토큰으로 단건 조회 */
  @Get(':token')
  getByToken(@Param('token') token: string): Booking {
    return this.booking.getByToken(token);
  }

  /** PATCH /api/bookings/:token — 시간 변경 */
  @Patch(':token')
  async reschedule(@Param('token') token: string, @Body() dto: RescheduleDto): Promise<Booking> {
    return this.booking.reschedule(token, dto.start, dto.end);
  }

  /** DELETE /api/bookings/:token — 예약 취소 */
  @Delete(':token')
  async cancel(@Param('token') token: string): Promise<Booking> {
    return this.booking.cancel(token);
  }
}
