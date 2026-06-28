interface TimezoneSelectProps {
  value: string;
  hostTz: string;
  onChange: (tz: string) => void;
}

/** 자주 쓰는 IANA 타임존 (호스트/방문자 타임존이 더해진다) */
const COMMON = [
  'Asia/Seoul',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'UTC',
];

/** "GMT+9" 형태의 현재 오프셋 라벨 */
const offsetLabel = (tz: string): string => {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName');
    return part?.value ?? '';
  } catch {
    return '';
  }
};

export const TimezoneSelect = ({ value, hostTz, onChange }: TimezoneSelectProps) => {
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // 내 타임존 → 호스트 타임존 → 공통, 중복 제거
  const zones = Array.from(new Set([localTz, hostTz, ...COMMON]));

  return (
    <label className="tzselect">
      <span className="tzselect__icon" aria-hidden="true">
        🌐
      </span>
      <select
        className="tzselect__field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="시간대 선택"
      >
        {zones.map((tz) => (
          <option key={tz} value={tz}>
            {tz.replace(/_/g, ' ')} ({offsetLabel(tz)}){tz === localTz ? ' · 내 시간대' : ''}
          </option>
        ))}
      </select>
    </label>
  );
};
