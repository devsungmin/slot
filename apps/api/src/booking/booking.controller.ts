import { Body, Controller, Get, Post } from '@nestjs/common';
import type { Booking } from '@slot/shared';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';

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
}
