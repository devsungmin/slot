import { Module } from '@nestjs/common';
import { CalendarModule } from '../calendar/calendar.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingRepository } from './booking.repository';

@Module({
  imports: [CalendarModule],
  controllers: [BookingController],
  providers: [BookingService, BookingRepository],
})
export class BookingModule {}
