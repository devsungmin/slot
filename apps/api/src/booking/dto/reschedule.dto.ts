import { IsISO8601 } from 'class-validator';
import type { RescheduleRequest } from '@slot/shared';

export class RescheduleDto implements RescheduleRequest {
  @IsISO8601()
  start!: string;

  @IsISO8601()
  end!: string;
}
