/** 호스트 타임존 기준으로 시간을 포맷하는 헬퍼들. */

/** "YYYY-MM-DD" 형태의 날짜 키 (해당 타임존 기준) */
export const dateKey = (iso: string, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

/** "6월 30일 (월)" 형태의 사람용 날짜 라벨 */
export const formatDateLabel = (iso: string, timeZone: string): string =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(iso));

/** "오후 2:30" 형태의 시각 라벨 */
export const formatTimeLabel = (iso: string, timeZone: string): string =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));

/** 슬롯 범위 라벨: "오후 2:30 – 오후 3:00" */
export const formatSlotRange = (start: string, end: string, timeZone: string): string =>
  `${formatTimeLabel(start, timeZone)} – ${formatTimeLabel(end, timeZone)}`;

/** 해당 타임존 기준 시(hour, 0-23)·분(minute) */
export const zonedHourMinute = (
  iso: string,
  timeZone: string,
): { hour: number; minute: number } => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  return { hour: get('hour'), minute: get('minute') };
};

/** 해당 타임존 기준 자정으로부터 경과 분 */
export const minutesSinceMidnight = (iso: string, timeZone: string): number => {
  const { hour, minute } = zonedHourMinute(iso, timeZone);
  return hour * 60 + minute;
};

/** 24시간제 "14:00" 라벨 (타임라인 눈금용) */
export const formatHourLabel = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;

/** 주어진 instant에서 타임존의 UTC 대비 오프셋(ms) */
const tzOffsetMs = (timeZone: string, date: Date): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
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

/** 타임존 벽시계(날짜키 + 자정 경과 분) → UTC instant(Date) */
export const wallTimeToInstant = (dateKey: string, minutes: number, timeZone: string): Date => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const utcGuess = Date.UTC(y, m - 1, d, hour, minute);
  return new Date(utcGuess - tzOffsetMs(timeZone, new Date(utcGuess)));
};

/** "월", "화" … 요일 한 글자 라벨 (로컬 달력 기준) */
export const weekdayShort = (dateKey: string): string => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
};

/** 날짜키의 "일(day)" 숫자 */
export const dayOfMonth = (dateKey: string): number => Number(dateKey.split('-')[2]);

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 날짜키에 n일 더한 날짜키 ("YYYY-MM-DD") */
export const addDaysToKey = (key: string, n: number): string => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
};

/** 날짜키의 요일 (0=일 ~ 6=토, 로컬 달력 기준) */
export const weekdayOfKey = (key: string): number => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};

/** 날짜키가 속한 주의 일요일 날짜키 */
export const startOfWeekKey = (key: string): string => addDaysToKey(key, -weekdayOfKey(key));

/** 두 날짜키 사이의 일수 차 (b - a) */
export const diffDaysKey = (a: string, b: string): number => {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
};

/** 자정 경과 분 → "오후 2:30" 라벨 */
export const formatMinuteLabel = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${hh}:${String(m).padStart(2, '0')}`;
};
