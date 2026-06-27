import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

/** Google 연동에 필요한 설정 (환경변수에서 읽는다) */
export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** 호스트가 1회 동의 후 발급받은 refresh token */
  refreshToken?: string;
  /** 대상 캘린더 ID (기본 'primary') */
  calendarId: string;
}

/** freebusy 조회 + 이벤트 생성/인비에 필요한 권한 */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

export const readGoogleConfig = (): GoogleConfig => ({
  clientId: process.env.GOOGLE_CLIENT_ID ?? '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3001/api/auth/google/callback',
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  calendarId: process.env.GOOGLE_CALENDAR_ID ?? 'primary',
});

export const createOAuthClient = (cfg: GoogleConfig): OAuth2Client =>
  new google.auth.OAuth2(cfg.clientId, cfg.clientSecret, cfg.redirectUri);
