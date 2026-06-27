import { useEffect, useRef, useState } from 'react';
import { addDaysToKey, diffDaysKey } from '../utils/datetime';

interface DatePickerPopoverProps {
  /** 선택 가능한 최소/최대 날짜키 (이 범위 밖은 비활성) */
  selectableMin: string;
  selectableMax: string;
  /** 근무 시간이 있는 날짜 (점으로 강조) */
  workingDates: Set<string>;
  /** 현재 표시 중인 범위 (강조) */
  rangeStart: string;
  rangeEnd: string;
  /** 선택 가능한 최대 일수 */
  maxSpanDays: number;
  initialMonth: string; // "YYYY-MM"
  todayKey: string;
  onPick: (start: string, end: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n: number) => String(n).padStart(2, '0');

const shiftMonth = (month: string, delta: number): string => {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
};

interface Range {
  start: string;
  end: string;
}

export const DatePickerPopover = ({
  selectableMin,
  selectableMax,
  workingDates,
  rangeStart,
  rangeEnd,
  maxSpanDays,
  initialMonth,
  todayKey,
  onPick,
  onClose,
}: DatePickerPopoverProps) => {
  const [month, setMonth] = useState(initialMonth);
  const [draft, setDraft] = useState<Range>({ start: rangeStart, end: rangeEnd });
  const anchor = useRef<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 드래그 도중 팝오버 밖에서 손을 떼도 확정되도록 전역 pointerup 처리
  useEffect(() => {
    const onUp = () => {
      if (anchor.current !== null) {
        anchor.current = null;
        onPick(draft.start, draft.end);
      }
    };
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [draft, onPick]);

  const selectable = (key: string) => key >= selectableMin && key <= selectableMax;

  /** anchor↔other 로 범위를 만들되 최대 일수로 클램프 */
  const clampRange = (a: string, other: string): Range => {
    let start = a <= other ? a : other;
    let end = a <= other ? other : a;
    if (diffDaysKey(start, end) + 1 > maxSpanDays) {
      if (other >= a) end = addDaysToKey(a, maxSpanDays - 1);
      else start = addDaysToKey(a, -(maxSpanDays - 1));
    }
    return { start, end };
  };

  const startDrag = (key: string) => {
    if (!selectable(key)) return;
    anchor.current = key;
    setDraft({ start: key, end: key });
  };

  const extendDrag = (key: string) => {
    if (anchor.current === null || !selectable(key)) return;
    setDraft(clampRange(anchor.current, key));
  };

  const [year, monthNum] = month.split('-').map(Number);
  // 이전/다음 달 날짜까지 채운 6주(42칸) 그리드 → 월 경계를 넘는 드래그가 끊기지 않는다.
  const monthFirst = new Date(year, monthNum - 1, 1);
  const gridStart = new Date(year, monthNum - 1, 1 - monthFirst.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    return {
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      day: d.getDate(),
      inMonth: d.getMonth() === monthNum - 1,
    };
  });

  return (
    <>
      <div className="popover-backdrop" onClick={onClose} role="presentation" />
      <div className="datepicker" role="dialog" aria-label="날짜로 이동">
        <header className="datepicker__head">
          <button
            className="datepicker__nav"
            aria-label="이전 달"
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            ‹
          </button>
          <strong className="datepicker__title">
            {year}년 {monthNum}월
          </strong>
          <button
            className="datepicker__nav"
            aria-label="다음 달"
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            ›
          </button>
        </header>

        <div className="datepicker__weekdays">
          {WEEKDAYS.map((w) => (
            <span key={w} className="datepicker__weekday">
              {w}
            </span>
          ))}
        </div>

        <div className="datepicker__grid">
          {cells.map(({ key, day, inMonth }) => {
            const ok = selectable(key);
            const inRange = key >= draft.start && key <= draft.end;
            return (
              <button
                key={key}
                className={[
                  'datepicker__cell',
                  ok ? 'is-selectable' : 'is-disabled',
                  inMonth ? '' : 'is-out',
                  inRange ? 'is-range' : '',
                  key === draft.start ? 'is-range-start' : '',
                  key === draft.end ? 'is-range-end' : '',
                  todayKey === key ? 'is-today' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={!ok}
                onPointerDown={() => startDrag(key)}
                onPointerEnter={() => extendDrag(key)}
              >
                {day}
                {workingDates.has(key) && <span className="datepicker__dot" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <p className="datepicker__hint">하루는 클릭, 여러 날은 드래그 (최대 {maxSpanDays}일)</p>
      </div>
    </>
  );
};
