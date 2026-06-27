import { Module } from '@nestjs/common';
import { CalendarModule } from '../calendar/calendar.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
  imports: [CalendarModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
