import { Module } from '@nestjs/common';
import { AvailabilityModule } from './availability/availability.module';
import { BookingModule } from './booking/booking.module';
import { ScheduleModule } from './schedule/schedule.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [AvailabilityModule, BookingModule, ScheduleModule, AuthModule, AdminModule],
})
export class AppModule {}
