import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import type { Booking } from '@slot/shared';

/**
 * 예약 영속화 저장소 (가벼운 JSON 파일).
 *
 * 무거운 DB 대신 파일 한 개로 예약을 보관한다.
 * - Google 캘린더가 일정의 source of truth 이므로, 여기서는
 *   "예약 토큰 → 캘린더 이벤트 매핑 + 방문자 정보"만 보관하면 충분하다.
 * - 경로는 DATA_DIR 환경변수로 바꿀 수 있다 (기본: <cwd>/data/bookings.json).
 */
@Injectable()
export class BookingRepository {
  private readonly logger = new Logger(BookingRepository.name);
  // 실행 위치(cwd)와 무관하게 apps/api/data 에 저장 (dist/booking → ../../data)
  private readonly file = resolve(
    process.env.DATA_DIR ?? resolve(__dirname, '..', '..', 'data'),
    'bookings.json',
  );
  private bookings: Booking[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (existsSync(this.file)) {
        this.bookings = JSON.parse(readFileSync(this.file, 'utf-8')) as Booking[];
        this.logger.log(`Loaded ${this.bookings.length} bookings from ${this.file}`);
      }
    } catch (err) {
      this.logger.error(`예약 파일 로드 실패 (${this.file}): ${String(err)}`);
      this.bookings = [];
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(this.bookings, null, 2), 'utf-8');
  }

  create(booking: Booking): Booking {
    this.bookings.push(booking);
    this.persist();
    return booking;
  }

  findAll(): Booking[] {
    return this.bookings;
  }

  findByToken(token: string): Booking | undefined {
    return this.bookings.find((b) => b.cancelToken === token);
  }

  /** 부분 업데이트 후 저장. 대상이 없으면 null. */
  update(id: string, patch: Partial<Booking>): Booking | null {
    const idx = this.bookings.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    this.bookings[idx] = { ...this.bookings[idx], ...patch };
    this.persist();
    return this.bookings[idx];
  }
}
