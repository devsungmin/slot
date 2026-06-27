/**
 * 타임존 유틸. 외부 라이브러리 없이 Intl만으로 IANA 타임존 ↔ UTC 변환을 처리한다.
 * (한국은 DST가 없어 안전하며, 일반 로직도 DST 전이 시점만 아니면 정확하다.)
 */

/** 주어진 instant에서 해당 타임존의 UTC 대비 오프셋(ms)을 구한다. */
const getTimezoneOffsetMs = (timeZone: string, date: Date): number => {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? '0');

  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - date.getTime();
};

/** 특정 타임존의 벽시계 시각(연/월/일/시/분)을 UTC instant(Date)로 변환한다. */
export const zonedWallTimeToUtc = (
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date => {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = getTimezoneOffsetMs(timeZone, new Date(utcGuess));
  return new Date(utcGuess - offset);
};

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  /** 0=일요일 ~ 6=토요일 */
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** instant를 해당 타임존의 벽시계 구성요소로 분해한다. */
export const getZonedParts = (date: Date, timeZone: string): ZonedParts => {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
  };
};

/** "HH:mm" 문자열을 분으로 환산 (예: "09:30" → 570). */
export const parseHhMm = (value: string): { hour: number; minute: number } => {
  const [hour, minute] = value.split(':').map(Number);
  return { hour, minute };
};
