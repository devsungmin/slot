import { useState } from 'react';
import type { TimeSlot } from '@slot/shared';
import { formatDateLabel, formatSlotRange } from '../utils/datetime';

export interface BookingFormValues {
  guestName: string;
  organization?: string;
  guestEmail: string;
  guestPhone: string;
}

interface BookingFormProps {
  slot: TimeSlot;
  timezone: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (values: BookingFormValues) => void;
  onBack: () => void;
}

export const BookingForm = ({
  slot,
  timezone,
  submitting,
  error,
  onSubmit,
  onBack,
}: BookingFormProps) => {
  const [guestName, setGuestName] = useState('');
  const [organization, setOrganization] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      guestName: guestName.trim(),
      organization: organization.trim() || undefined,
      guestEmail: guestEmail.trim(),
      guestPhone: guestPhone.trim(),
    });
  };

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <div className="selected-summary">
        <span className="selected-summary__date">{formatDateLabel(slot.start, timezone)}</span>
        <span className="selected-summary__time">
          {formatSlotRange(slot.start, slot.end, timezone)}
        </span>
      </div>

      <label className="field">
        <span>
          이름 <em className="req">*</em>
        </span>
        <input
          type="text"
          required
          value={guestName}
          maxLength={100}
          placeholder="홍길동"
          onChange={(e) => setGuestName(e.target.value)}
        />
      </label>

      <label className="field">
        <span>소속 (선택)</span>
        <input
          type="text"
          value={organization}
          maxLength={100}
          placeholder="회사 / 팀"
          onChange={(e) => setOrganization(e.target.value)}
        />
      </label>

      <label className="field">
        <span>
          이메일 <em className="req">*</em>
        </span>
        <input
          type="email"
          required
          value={guestEmail}
          placeholder="you@example.com"
          onChange={(e) => setGuestEmail(e.target.value)}
        />
      </label>

      <label className="field">
        <span>
          연락처 <em className="req">*</em>
        </span>
        <input
          type="tel"
          required
          value={guestPhone}
          placeholder="010-1234-5678"
          onChange={(e) => setGuestPhone(e.target.value)}
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onBack} disabled={submitting}>
          뒤로
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? '예약 중…' : '예약 확정하기'}
        </button>
      </div>
    </form>
  );
};
