import type { Booking } from '@slot/shared';
import { formatDateLabel, formatSlotRange } from '../utils/datetime';

interface ConfirmationProps {
  booking: Booking;
  timezone: string;
  onReset: () => void;
}

export const Confirmation = ({ booking, timezone, onReset }: ConfirmationProps) => (
  <div className="confirmation">
    <div className="confirmation__check" aria-hidden="true">
      ✓
    </div>
    <h2>예약이 확정되었어요!</h2>
    <p className="confirmation__sub">{booking.guestEmail} 로 캘린더 초대(인비)를 보냈어요.</p>

    <div className="confirmation__card">
      <div className="confirmation__row">
        <span>날짜</span>
        <strong>{formatDateLabel(booking.start, timezone)}</strong>
      </div>
      <div className="confirmation__row">
        <span>시간</span>
        <strong>{formatSlotRange(booking.start, booking.end, timezone)}</strong>
      </div>
      {booking.organization && (
        <div className="confirmation__row">
          <span>소속</span>
          <strong>{booking.organization}</strong>
        </div>
      )}
      <div className="confirmation__row">
        <span>연락처</span>
        <strong>{booking.guestPhone}</strong>
      </div>
    </div>

    {booking.htmlLink && (
      <a className="btn-primary" href={booking.htmlLink} target="_blank" rel="noreferrer">
        캘린더에서 보기
      </a>
    )}
    <button className="btn-ghost" onClick={onReset}>
      다른 시간 예약하기
    </button>
  </div>
);
