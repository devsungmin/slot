import { useMemo, useRef } from 'react';
import type { BusyInterval, DaySchedule } from '@slot/shared';
import { dayOfMonth, formatMinuteLabel, wallTimeToInstant, weekdayShort } from '../utils/datetime';

/** 드래그로 선택된 약속 구간 (날짜키 + 자정 경과 분) */
export interface GridSelection {
  dateKey: string;
  startMin: number;
  endMin: number;
}

interface WeekGridProps {
  days: DaySchedule[];
  busy: BusyInterval[];
  timezone: string;
  /** 드래그 스냅 단위 (분) */
  snapMin: number;
  minNoticeHours: number;
  todayKey: string;
  selection: GridSelection | null;
  onChange: (selection: GridSelection | null) => void;
}

/** 1분당 픽셀 (1시간 = 60px) */
const PX_PER_MIN = 1;
/** 하루(분) */
const DAY_MIN = 24 * 60;

interface Segment {
  a: number;
  b: number;
}

interface Block {
  top: number;
  height: number;
}

interface DayLayout {
  day: DaySchedule;
  midnight: number; // 그날 자정의 ms (호스트 타임존)
  working: Block[];
  busy: Block[];
  free: Segment[]; // 선택 가능한 빈 구간 (근무 − 바쁨 − 과거)
}

const subtract = (segments: Segment[], holes: Segment[]): Segment[] => {
  let result = segments.map((s) => ({ ...s }));
  for (const hole of holes) {
    const next: Segment[] = [];
    for (const seg of result) {
      if (hole.b <= seg.a || hole.a >= seg.b) {
        next.push(seg); // 겹치지 않음
        continue;
      }
      if (hole.a > seg.a) next.push({ a: seg.a, b: hole.a }); // 앞쪽 남는 부분
      if (hole.b < seg.b) next.push({ a: hole.b, b: seg.b }); // 뒤쪽 남는 부분
    }
    result = next;
  }
  return result.filter((s) => s.b - s.a > 0);
};

export const WeekGrid = ({
  days,
  busy,
  timezone,
  snapMin,
  minNoticeHours,
  todayKey,
  selection,
  onChange,
}: WeekGridProps) => {
  // 표시 타임존 기준으로 각 날을 [자정, +24h) 창에 클립해 계산한다.
  // (다른 타임존에선 호스트 근무대가 자정을 넘겨 두 컬럼에 나뉘어 보일 수 있다.)
  const { layouts, gridStart, gridEnd } = useMemo(() => {
    const nowMs = Date.now();
    const clampDay = (a: number, b: number): Segment => ({
      a: Math.max(0, Math.min(DAY_MIN, a)),
      b: Math.max(0, Math.min(DAY_MIN, b)),
    });

    const perDay = days.map((day) => {
      const midnight = wallTimeToInstant(day.date, 0, timezone).getTime();
      const toMin = (iso: string) => (new Date(iso).getTime() - midnight) / 60_000;

      const working = day.working
        .map((w) => clampDay(toMin(w.start), toMin(w.end)))
        .filter((s) => s.b > s.a);
      const busySegs = busy
        .map((b) => clampDay(toMin(b.start), toMin(b.end)))
        .filter((s) => s.b > s.a);

      // 과거(지금 + 최소 공지) 차단
      const cutoff = (nowMs - midnight) / 60_000 + minNoticeHours * 60;
      const pastHole: Segment[] = cutoff > 0 ? [{ a: 0, b: Math.min(cutoff, DAY_MIN) }] : [];

      const free = subtract(working, [...busySegs, ...pastHole]).filter(
        (s) => s.b - s.a >= snapMin,
      );
      return { day, midnight, working, busySegs, free };
    });

    // 보이는 근무대를 감싸는 정시 범위 ([0,1440]로 제한)
    let min = DAY_MIN;
    let max = 0;
    for (const d of perDay) {
      for (const w of d.working) {
        min = Math.min(min, w.a);
        max = Math.max(max, w.b);
      }
    }
    if (min >= max) {
      min = 9 * 60;
      max = 18 * 60;
    }
    const gStart = Math.max(0, Math.floor(min / 60) * 60);
    const gEnd = Math.min(DAY_MIN, Math.ceil(max / 60) * 60);

    const toBlock = (s: Segment): Block => ({
      top: (s.a - gStart) * PX_PER_MIN,
      height: (s.b - s.a) * PX_PER_MIN,
    });

    const computed: DayLayout[] = perDay.map((d) => ({
      day: d.day,
      midnight: d.midnight,
      working: d.working.map(toBlock),
      busy: d.busySegs.map(toBlock),
      free: d.free,
    }));

    return { layouts: computed, gridStart: gStart, gridEnd: gEnd };
  }, [days, busy, timezone, snapMin, minNoticeHours]);

  const gridHeight = (gridEnd - gridStart) * PX_PER_MIN;

  const hours: number[] = [];
  for (let h = gridStart / 60; h <= gridEnd / 60; h += 1) hours.push(h);

  const snap = (min: number) => Math.round(min / snapMin) * snapMin;

  // 드래그 상태
  const drag = useRef<{ dateKey: string; seg: Segment; anchor: number } | null>(null);

  const minuteFromEvent = (el: HTMLElement, clientY: number): number => {
    const rect = el.getBoundingClientRect();
    const raw = gridStart + (clientY - rect.top) / PX_PER_MIN;
    return Math.min(gridEnd, Math.max(gridStart, raw));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, layout: DayLayout) => {
    const raw = minuteFromEvent(e.currentTarget, e.clientY);
    const seg = layout.free.find((s) => raw >= s.a && raw <= s.b);
    if (!seg) return; // 빈 시간이 아니면 무시

    const anchor = Math.min(Math.max(snap(raw), seg.a), seg.b);
    drag.current = { dateKey: layout.day.date, seg, anchor };
    e.currentTarget.setPointerCapture(e.pointerId);

    const end = Math.min(anchor + snapMin, seg.b);
    const start = Math.min(anchor, end - snapMin);
    onChange({ dateKey: layout.day.date, startMin: start, endMin: end });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const raw = minuteFromEvent(e.currentTarget, e.clientY);
    const cur = Math.min(Math.max(snap(raw), d.seg.a), d.seg.b);
    let lo = Math.min(d.anchor, cur);
    let hi = Math.max(d.anchor, cur);
    if (hi - lo < snapMin) {
      // 최소 1칸은 유지
      if (cur >= d.anchor) hi = Math.min(lo + snapMin, d.seg.b);
      else lo = Math.max(hi - snapMin, d.seg.a);
    }
    onChange({ dateKey: d.dateKey, startMin: lo, endMin: hi });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div className="week">
      <div className="week__head">
        <div className="week__gutter-head" />
        {days.map((d) => (
          <div key={d.date} className={`week__dayhead${d.date === todayKey ? ' is-today' : ''}`}>
            <span className="week__dow">{weekdayShort(d.date)}</span>
            <span className="week__dom">{dayOfMonth(d.date)}</span>
          </div>
        ))}
      </div>

      <div className="week__body">
        <div className="week__gutter" style={{ height: gridHeight }}>
          {hours.map((h) => (
            <span
              key={h}
              className="week__hourlabel"
              style={{ top: (h * 60 - gridStart) * PX_PER_MIN }}
            >
              {String(h).padStart(2, '0')}:00
            </span>
          ))}
        </div>

        <div className="week__grid" style={{ height: gridHeight }}>
          {layouts.map((layout) => {
            const sel = selection?.dateKey === layout.day.date ? selection : null;
            return (
              <div
                key={layout.day.date}
                className="week__col"
                style={{ backgroundSize: `100% ${60 * PX_PER_MIN}px` }}
                onPointerDown={(e) => onPointerDown(e, layout)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                {/* 근무 시간(선택 가능 영역) */}
                {layout.working.map((b, i) => (
                  <div
                    key={`w${i}`}
                    className="week__working"
                    style={{ top: b.top, height: b.height }}
                  />
                ))}

                {/* 바쁜 시간(선택 불가) */}
                {layout.busy.map((b, i) => (
                  <div
                    key={`b${i}`}
                    className="week__busy"
                    style={{ top: b.top, height: b.height }}
                  >
                    <span>예약 불가</span>
                  </div>
                ))}

                {/* 드래그 선택 */}
                {sel && (
                  <div
                    className="week__sel"
                    style={{
                      top: (sel.startMin - gridStart) * PX_PER_MIN,
                      height: (sel.endMin - sel.startMin) * PX_PER_MIN,
                    }}
                  >
                    {formatMinuteLabel(sel.startMin)} – {formatMinuteLabel(sel.endMin)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
