import { useEffect, useState } from 'react';
import type { HostSettings, WorkingWindow } from '@slot/shared';
import {
  ApiRequestError,
  adminCreateHost,
  adminDeleteHost,
  adminListHosts,
  adminUpdateHost,
} from '../api';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const TOKEN_KEY = 'slot-admin-token';

/** [{start,end},…] → "10:00-12:00, 13:00-18:00" */
const windowsToText = (windows: WorkingWindow[]): string =>
  windows.map((w) => `${w.start}-${w.end}`).join(', ');

/** "10:00-12:00, 13:00-18:00" → [{start,end},…] (빈 문자열 = 휴무) */
const textToWindows = (text: string): WorkingWindow[] =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [start, end] = part.split('-').map((s) => s.trim());
      return { start, end };
    });

/** 새 호스트 폼 초기값 */
const emptyHost = (): HostSettings => ({
  slug: '',
  hostName: '',
  hostEmail: '',
  timezone: 'Asia/Seoul',
  calendarId: 'primary',
  slotMinutes: 30,
  slotIntervalMinutes: 0,
  minNoticeHours: 2,
  bookingWindowDays: 14,
  workingHours: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
});

interface EditorState {
  host: HostSettings;
  /** 요일별 근무시간 텍스트 (입력 중 상태) */
  hoursText: Record<number, string>;
  isNew: boolean;
}

const toEditor = (host: HostSettings, isNew: boolean): EditorState => ({
  host: { ...host },
  hoursText: Object.fromEntries(
    Array.from({ length: 7 }, (_, d) => [d, windowsToText(host.workingHours[d] ?? [])]),
  ) as Record<number, string>,
  isNew,
});

export const AdminPage = () => {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? '');
  const [authed, setAuthed] = useState(false);
  const [hosts, setHosts] = useState<HostSettings[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (tok: string) => {
    setBusy(true);
    setError(null);
    try {
      const list = await adminListHosts(tok);
      setHosts(list);
      setAuthed(true);
      sessionStorage.setItem(TOKEN_KEY, tok);
    } catch (err: unknown) {
      setAuthed(false);
      setError(err instanceof ApiRequestError ? err.message : '호스트 목록을 불러오지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  // 저장된 토큰이 있으면 자동 로그인 시도
  useEffect(() => {
    if (token) void load(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!editor) return;
    setBusy(true);
    setError(null);
    try {
      const payload: HostSettings = {
        ...editor.host,
        workingHours: Object.fromEntries(
          Array.from({ length: 7 }, (_, d) => [d, textToWindows(editor.hoursText[d] ?? '')]),
        ) as Record<number, WorkingWindow[]>,
      };
      const saved = editor.isNew
        ? await adminCreateHost(token, payload)
        : await adminUpdateHost(token, payload);
      setNotice(`"${saved.hostName}" 저장 완료 · 예약 링크: /?host=${saved.slug}`);
      setEditor(null);
      await load(token);
    } catch (err: unknown) {
      setError(err instanceof ApiRequestError ? err.message : '저장에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!window.confirm(`호스트 "${slug}" 를 삭제할까요?`)) return;
    setBusy(true);
    setError(null);
    try {
      await adminDeleteHost(token, slug);
      setNotice(`"${slug}" 삭제 완료`);
      await load(token);
    } catch (err: unknown) {
      setError(err instanceof ApiRequestError ? err.message : '삭제에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  const patchHost = (patch: Partial<HostSettings>) =>
    setEditor((e) => (e ? { ...e, host: { ...e.host, ...patch } } : e));

  // ── 토큰 입력 화면 ──
  if (!authed) {
    return (
      <form
        className="admin-login"
        onSubmit={(e) => {
          e.preventDefault();
          void load(token);
        }}
      >
        <h1 className="section-title">호스트 관리</h1>
        <label className="field">
          <span>관리 토큰 (ADMIN_TOKEN)</span>
          <input
            type="password"
            required
            value={token}
            placeholder="서버 환경변수 ADMIN_TOKEN 값"
            onChange={(e) => setToken(e.target.value)}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={busy || !token}>
          {busy ? '확인 중…' : '들어가기'}
        </button>
      </form>
    );
  }

  // ── 편집 폼 ──
  if (editor) {
    const { host, isNew } = editor;
    return (
      <div className="admin">
        <h1 className="section-title">{isNew ? '새 호스트' : `호스트 수정 — ${host.slug}`}</h1>

        <div className="admin-form">
          <label className="field">
            <span>slug (URL 식별자)</span>
            <input
              type="text"
              value={host.slug}
              disabled={!isNew}
              placeholder="bob"
              onChange={(e) => patchHost({ slug: e.target.value })}
            />
          </label>
          <label className="field">
            <span>이름</span>
            <input
              type="text"
              value={host.hostName}
              onChange={(e) => patchHost({ hostName: e.target.value })}
            />
          </label>
          <label className="field">
            <span>이메일</span>
            <input
              type="email"
              value={host.hostEmail}
              onChange={(e) => patchHost({ hostEmail: e.target.value })}
            />
          </label>
          <label className="field">
            <span>타임존 (IANA)</span>
            <input
              type="text"
              value={host.timezone}
              placeholder="Asia/Seoul"
              onChange={(e) => patchHost({ timezone: e.target.value })}
            />
          </label>
          <label className="field">
            <span>캘린더 ID</span>
            <input
              type="text"
              value={host.calendarId}
              placeholder="primary 또는 캘린더 주소"
              onChange={(e) => patchHost({ calendarId: e.target.value })}
            />
          </label>

          <fieldset className="admin-hours">
            <legend>요일별 근무 시간 (비우면 휴무 · 예: 10:00-12:00, 13:00-18:00)</legend>
            {WEEKDAYS.map((label, d) => (
              <label key={d} className="admin-hours__row">
                <span>{label}</span>
                <input
                  type="text"
                  value={editor.hoursText[d] ?? ''}
                  placeholder="휴무"
                  onChange={(e) =>
                    setEditor((prev) =>
                      prev
                        ? { ...prev, hoursText: { ...prev.hoursText, [d]: e.target.value } }
                        : prev,
                    )
                  }
                />
              </label>
            ))}
          </fieldset>
        </div>

        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button className="btn-ghost" onClick={() => setEditor(null)} disabled={busy}>
            취소
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={busy}>
            {busy ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    );
  }

  // ── 목록 화면 ──
  return (
    <div className="admin">
      <div className="admin-head">
        <h1 className="section-title">호스트 관리</h1>
        <button className="btn-primary" onClick={() => setEditor(toEditor(emptyHost(), true))}>
          + 새 호스트
        </button>
      </div>

      {notice && <p className="notice">{notice}</p>}
      {error && <p className="form-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>slug</th>
            <th>이름</th>
            <th>타임존</th>
            <th>캘린더</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {hosts.map((h, i) => (
            <tr key={h.slug}>
              <td>
                <a href={`/?host=${h.slug}`} target="_blank" rel="noreferrer">
                  {h.slug}
                </a>
                {i === 0 && <span className="admin-badge">기본</span>}
              </td>
              <td>{h.hostName}</td>
              <td>{h.timezone}</td>
              <td className="admin-table__cal">{h.calendarId}</td>
              <td className="admin-table__actions">
                <button className="btn-ghost" onClick={() => setEditor(toEditor(h, false))}>
                  수정
                </button>
                {i !== 0 && (
                  <button className="btn-ghost btn-danger" onClick={() => handleDelete(h.slug)}>
                    삭제
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
