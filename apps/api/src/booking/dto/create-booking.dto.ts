import {
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import type { CreateBookingRequest } from '@slot/shared';

export class CreateBookingDto implements CreateBookingRequest {
  @IsOptional()
  @IsString()
  hostSlug?: string;

  @IsISO8601()
  start!: string;

  @IsISO8601()
  end!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  guestName!: string;

  @IsEmail()
  guestEmail!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9+\-\s()]{7,20}$/, { message: '연락처 형식이 올바르지 않습니다.' })
  guestPhone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  organization?: string;
}
