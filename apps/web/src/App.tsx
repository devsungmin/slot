import { useEffect, useMemo, useState } from 'react';
import type { Booking, DaySchedule, ScheduleResponse, TimeSlot } from '@slot/shared';
import {
  ApiRequestError,
  cancelBooking,
  createBooking,
  fetchBooking,
  fetchSchedule,
  rescheduleBooking,
} from './api';
import { WeekGrid, type GridSelection } from './components/WeekGrid';
import { DatePickerPopover } from './components/DatePickerPopover';
import { BookingForm, type BookingFormValues } from './components/BookingForm';
import { Confirmation } from './components/Confirmation';
import { ManageBooking } from './components/ManageBooking';
import {
  addDaysToKey,
  dateKey,
  diffDaysKey,
  formatDateLabel,
  formatMinuteLabel,
  startOfWeekKey,
  wallTimeToInstant,
  weekdayOfKey,
} from './utils/datetime';

const DURATION_MIN = 30;
const LOOKAHEAD_DAYS = 14;
/** 한 번에 선택 가능한 최대 일수 */
const MAX_SPAN_DAYS = 7;

type Step = 'select' | 'form' | 'confirmed';
interface DateRange {
  start: string;
  end: string;
}

const loadRange = () => {
  const from = new Date();
  const to = new Date(from.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60_000);
  return { from, to };
};

/** 기본 표시 범위: 첫 예약 가능일이 속한 주의 일→토 */
const defaultRangeFor = (days: DaySchedule[], timezone: string): DateRange => {
  const tKey = dateKey(new Date().toISOString(), timezone);
  const firstBookable = days.find((d) => d.working.length > 0)?.date ?? days[0]?.date ?? tKey;
  const start = startOfWeekKey(firstBookable);
  return { start, end: addDaysToKey(start, MAX_SPAN_DAYS - 1) };
};

export const App = () => {
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [range, setRange] = useState<DateRange | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selection, setSelection] = useState<GridSelection | null>(null);
  const [confirmedSlot, setConfirmedSlot] = useState<TimeSlot | null>(null);

  const [step, setStep] = useState<Step>('select');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  // ── 예약 관리(취소/변경) 모드 ──
  const [manageToken] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('manage'),
  );
  const [managed, setManaged] = useState<Booking | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageNotice, setManageNotice] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const refresh = () => {
    setLoading(true);
    const { from, to } = loadRange();
    return fetchSchedule(from, to)
      .then((data) => {
        setSchedule(data);
        setRange(defaultRangeFor(data.days, data.timezone));
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : '일정을 불러오지 못했어요.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    if (manageToken) {
      fetchBooking(manageToken)
        .then(setManaged)
        .catch((err: unknown) =>
          setManageError(err instanceof Error ? err.message : '예약을 찾을 수 없어요.'),
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timezone = schedule?.timezone ?? 'Asia/Seoul';
  const hostName = schedule?.hostName ?? 'Slot';
  const snapMin = schedule?.slotMinutes ?? DURATION_MIN;
  const todayKey = dateKey(new Date().toISOString(), timezone);
  const allDays = useMemo(() => schedule?.days ?? [], [schedule]);

  const dayMap = useMemo(() => {
    const map: Record<string, DaySchedule> = {};
    for (const d of allDays) map[d.date] = d;
    return map;
  }, [allDays]);

  const visibleDays = useMemo<DaySchedule[]>(() => {
    if (!range) return [];
    const count = diffDaysKey(range.start, range.end) + 1;
    return Array.from({ length: count }, (_, i) => {
      const key = addDaysToKey(range.start, i);
      return dayMap[key] ?? { date: key, weekday: weekdayOfKey(key), working: [] };
    });
  }, [range, dayMap]);

  const workingDates = useMemo(
    () => new Set(allDays.filter((d) => d.working.length > 0).map((d) => d.date)),
    [allDays],
  );
  const selectableMin = startOfWeekKey(todayKey);
  const selectableMax = allDays[allDays.length - 1]?.date ?? todayKey;
  const pickerMonth = (range?.start ?? todayKey).slice(0, 7);

  const rangeLabel = !range
    ? ''
    : range.start === range.end
      ? formatDateLabel(`${range.start}T12:00:00`, timezone)
      : `${formatDateLabel(`${range.start}T12:00:00`, timezone)} – ${formatDateLabel(
          `${range.end}T12:00:00`,
          timezone,
        )}`;

  const handlePickRange = (start: string, end: string) => {
    setRange({ start, end });
    setSelection(null);
    setPickerOpen(false);
  };

  const handleThisWeek = () => {
    setRange(defaultRangeFor(allDays, timezone));
    setSelection(null);
  };

  const selectionToSlot = (sel: GridSelection): TimeSlot => ({
    start: wallTimeToInstant(sel.dateKey, sel.startMin, timezone).toISOString(),
    end: wallTimeToInstant(sel.dateKey, sel.endMin, timezone).toISOString(),
  });

  const handleConfirmSelection = () => {
    if (!selection) return;
    setConfirmedSlot(selectionToSlot(selection));
    setSubmitError(null);
    setStep('form');
  };

  const handleSubmit = async (values: BookingFormValues) => {
    if (!confirmedSlot) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createBooking({
        start: confirmedSlot.start,
        end: confirmedSlot.end,
        ...values,
      });
      setBooking(result);
      setStep('confirmed');
    } catch (err: unknown) {
      setSubmitError(
        err instanceof ApiRequestError
          ? err.message
          : '예약 중 문제가 발생했어요. 다시 시도해주세요.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelection(null);
    setConfirmedSlot(null);
    setBooking(null);
    setSubmitError(null);
    setStep('select');
    refresh();
  };

  // ── 관리: 취소 / 변경 ──
  const handleCancel = async () => {
    if (!manageToken) return;
    setCancelling(true);
    setManageError(null);
    try {
      const updated = await cancelBooking(manageToken);
      setManaged(updated);
      setManageNotice('예약이 취소되었어요.');
    } catch (err: unknown) {
      setManageError(err instanceof ApiRequestError ? err.message : '취소에 실패했어요.');
    } finally {
      setCancelling(false);
    }
  };

  const handleRescheduleConfirm = async () => {
    if (!selection || !manageToken) return;
    const slot = selectionToSlot(selection);
    setSubmitting(true);
    setManageError(null);
    try {
      const updated = await rescheduleBooking(manageToken, slot.start, slot.end);
      setManaged(updated);
      setRescheduling(false);
      setSelection(null);
      setManageNotice('시간이 변경되었어요.');
      refresh();
    } catch (err: unknown) {
      setManageError(err instanceof ApiRequestError ? err.message : '시간 변경에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectionLabel = selection
    ? `${formatDateLabel(`${selection.dateKey}T12:00:00`, timezone)} · ${formatMinuteLabel(
        selection.startMin,
      )} – ${formatMinuteLabel(selection.endMin)}`
    : '';

  /** 신규 예약과 시간 변경이 공유하는 선택 그리드 */
  const renderScheduler = (confirmLabel: string, onConfirm: () => void, busy: boolean) => (
    <>
      <div className="weeknav">
        <div className="weeknav__center">
          <button
            className="weeknav__label"
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((v) => !v)}
          >
            📅 {rangeLabel} ▾
          </button>
          {pickerOpen && (
            <DatePickerPopover
              selectableMin={selectableMin}
              selectableMax={selectableMax}
              workingDates={workingDates}
              rangeStart={range?.start ?? todayKey}
              rangeEnd={range?.end ?? todayKey}
              maxSpanDays={MAX_SPAN_DAYS}
              initialMonth={pickerMonth}
              todayKey={todayKey}
              onPick={handlePickRange}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
        <button className="weeknav__btn" onClick={handleThisWeek}>
          이번 주
        </button>
      </div>

      <WeekGrid
        days={visibleDays}
        busy={schedule?.busy ?? []}
        timezone={timezone}
        snapMin={snapMin}
        minNoticeHours={schedule?.minNoticeHours ?? 0}
        todayKey={todayKey}
        selection={selection}
        onChange={setSelection}
      />

      <div className={`actionbar${selection ? ' is-active' : ''}`}>
        <span className="actionbar__label">
          {selection ? selectionLabel : '빈 시간을 드래그해 약속 시간을 선택하세요'}
        </span>
        <button className="btn-primary" disabled={!selection || busy} onClick={onConfirm}>
          {busy ? '처리 중…' : confirmLabel}
        </button>
      </div>
      {manageError && rescheduling && <p className="form-error">{manageError}</p>}
    </>
  );

  const renderManage = () => {
    if (manageError && !managed) return <p className="form-error">{manageError}</p>;
    if (!managed) return <p className="empty">예약을 불러오는 중…</p>;

    // 시간 변경 모드: 선택 그리드 재사용
    if (rescheduling && managed.status !== 'cancelled') {
      return (
        <>
          <h1 className="section-title">새로운 시간 선택</h1>
          {!loading && renderScheduler('이 시간으로 변경', handleRescheduleConfirm, submitting)}
          <button
            className="btn-ghost manage__back"
            onClick={() => {
              setRescheduling(false);
              setSelection(null);
            }}
          >
            취소하고 돌아가기
          </button>
        </>
      );
    }

    return (
      <>
        {manageNotice && <p className="notice">{manageNotice}</p>}
        <ManageBooking
          booking={managed}
          timezone={timezone}
          cancelling={cancelling}
          error={manageError}
          onReschedule={() => {
            setManageNotice(null);
            setRescheduling(true);
          }}
          onCancel={handleCancel}
        />
      </>
    );
  };

  return (
    <div className="page page--wide">
      <header className="brand">
        <div className="brand__logo">Slot</div>
        <p className="brand__tagline">
          {manageToken ? '예약 관리' : `${hostName}님과 약속 잡기 · 빈 시간을 드래그하세요`}
        </p>
      </header>

      <main className="card">
        {loading && <p className="empty">일정을 불러오는 중…</p>}
        {!loading && loadError && <p className="form-error">{loadError}</p>}

        {!loading && !loadError && manageToken && renderManage()}

        {!loading && !loadError && !manageToken && (
          <>
            {step === 'select' && renderScheduler('예약하기', handleConfirmSelection, false)}

            {step === 'form' && confirmedSlot && (
              <BookingForm
                slot={confirmedSlot}
                timezone={timezone}
                submitting={submitting}
                error={submitError}
                onSubmit={handleSubmit}
                onBack={() => setStep('select')}
              />
            )}

            {step === 'confirmed' && booking && (
              <Confirmation booking={booking} timezone={timezone} onReset={handleReset} />
            )}
          </>
        )}
      </main>

      <footer className="foot">Powered by Slot · 시간대 {timezone}</footer>
    </div>
  );
};
