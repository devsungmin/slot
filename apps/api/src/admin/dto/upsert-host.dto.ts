import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { WorkingWindow } from '@slot/shared';

/**
 * 호스트 생성/수정 요청.
 * workingHours 는 형태가 자유로워 class-validator 로 다 못 잡으므로
 * 컨트롤러에서 validateWorkingHours() 로 추가 검증한다.
 */
export class UpsertHostDto {
  @IsString()
  @Matches(/^[a-z0-9-]{1,30}$/, { message: 'slug 는 소문자/숫자/하이픈 1~30자여야 합니다.' })
  slug!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  hostName!: string;

  @IsEmail()
  hostEmail!: string;

  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  calendarId?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  slotMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  slotIntervalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  minNoticeHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  bookingWindowDays?: number;

  @IsOptional()
  @IsObject()
  workingHours?: Record<number, WorkingWindow[]>;
}
