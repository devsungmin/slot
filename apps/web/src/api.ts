import type {
  AvailabilityResponse,
  Booking,
  CreateBookingRequest,
  ScheduleResponse,
} from '@slot/shared';

/** API 호출 실패 시 메시지를 담아 던지는 에러 */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.message
      ? Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message
      : `요청 실패 (${res.status})`;
    throw new ApiRequestError(message, res.status);
  }

  return res.json() as Promise<T>;
};

/** 기간 내 예약 가능한 슬롯 조회 */
export const fetchAvailability = (
  from: Date,
  to: Date,
  durationMinutes?: number,
): Promise<AvailabilityResponse> => {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  if (durationMinutes) {
    params.set('duration', String(durationMinutes));
  }
  return request<AvailabilityResponse>(`/availability?${params.toString()}`);
};

/** 주간 그리드용 일정 데이터(근무 시간 + 바쁜 시간) 조회 */
export const fetchSchedule = (from: Date, to: Date): Promise<ScheduleResponse> => {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  return request<ScheduleResponse>(`/schedule?${params.toString()}`);
};

/** 슬롯 예약 (캘린더 이벤트 생성) */
export const createBooking = (payload: CreateBookingRequest): Promise<Booking> =>
  request<Booking>('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
