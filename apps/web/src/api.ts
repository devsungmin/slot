import type {
  AvailabilityResponse,
  Booking,
  CreateBookingRequest,
  HostSettings,
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
export const fetchSchedule = (
  from: Date,
  to: Date,
  host?: string | null,
): Promise<ScheduleResponse> => {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  if (host) params.set('host', host);
  return request<ScheduleResponse>(`/schedule?${params.toString()}`);
};

/** 슬롯 예약 (캘린더 이벤트 생성) */
export const createBooking = (payload: CreateBookingRequest): Promise<Booking> =>
  request<Booking>('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/** 예약 관리 토큰으로 단건 조회 */
export const fetchBooking = (token: string): Promise<Booking> =>
  request<Booking>(`/bookings/${encodeURIComponent(token)}`);

/** 예약 시간 변경 */
export const rescheduleBooking = (token: string, start: string, end: string): Promise<Booking> =>
  request<Booking>(`/bookings/${encodeURIComponent(token)}`, {
    method: 'PATCH',
    body: JSON.stringify({ start, end }),
  });

/** 예약 취소 */
export const cancelBooking = (token: string): Promise<Booking> =>
  request<Booking>(`/bookings/${encodeURIComponent(token)}`, {
    method: 'DELETE',
  });

// ── 호스트 관리 API (x-admin-token 필요) ──

const adminHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  'x-admin-token': token,
});

export const adminListHosts = (token: string): Promise<HostSettings[]> =>
  request<HostSettings[]>('/admin/hosts', { headers: adminHeaders(token) });

export const adminCreateHost = (token: string, host: HostSettings): Promise<HostSettings> =>
  request<HostSettings>('/admin/hosts', {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify(host),
  });

export const adminUpdateHost = (token: string, host: HostSettings): Promise<HostSettings> =>
  request<HostSettings>(`/admin/hosts/${encodeURIComponent(host.slug)}`, {
    method: 'PUT',
    headers: adminHeaders(token),
    body: JSON.stringify(host),
  });

export const adminDeleteHost = (token: string, slug: string): Promise<{ ok: boolean }> =>
  request<{ ok: boolean }>(`/admin/hosts/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  });
