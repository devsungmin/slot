import type { Booking } from '@slot/shared';
import { formatDateLabel, formatSlotRange } from '../utils/datetime';

interface ManageBookingProps {
  booking: Booking;
  timezone: string;
  cancelling: boolean;
  error: string | null;
  onReschedule: () => void;
  onCancel: () => void;
}

export const ManageBooking = ({
  booking,
  timezone,
  cancelling,
  error,
  onReschedule,
  onCancel,
}: ManageBookingProps) => {
  const cancelled = booking.status === 'cancelled';

  return (
    <div className="manage">
      <h1 className="section-title">예약 관리</h1>

      <div className={`manage__card${cancelled ? ' is-cancelled' : ''}`}>
        <div className="manage__row">
          <span>이름</span>
          <strong>{booking.guestName}</strong>
        </div>
        <div className="manage__row">
          <span>날짜</span>
          <strong>{formatDateLabel(booking.start, timezone)}</strong>
        </div>
        <div className="manage__row">
          <span>시간</span>
          <strong>{formatSlotRange(booking.start, booking.end, timezone)}</strong>
        </div>
        <div className="manage__row">
          <span>상태</span>
          <strong className={cancelled ? 'manage__status--cancelled' : 'manage__status--ok'}>
            {cancelled ? '취소됨' : '확정'}
          </strong>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {cancelled ? (
        <a className="btn-primary" href="/">
          새 예약 잡기
        </a>
      ) : (
        <div className="form-actions form-actions--center">
          <button className="btn-ghost btn-danger" onClick={onCancel} disabled={cancelling}>
            {cancelling ? '취소 중…' : '예약 취소'}
          </button>
          <button className="btn-primary" onClick={onReschedule} disabled={cancelling}>
            시간 변경
          </button>
        </div>
      )}
    </div>
  );
};
