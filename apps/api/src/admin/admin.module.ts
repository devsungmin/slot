import { Module } from '@nestjs/common';
import { AdminHostsController } from './admin-hosts.controller';

@Module({
  controllers: [AdminHostsController],
})
export class AdminModule {}
