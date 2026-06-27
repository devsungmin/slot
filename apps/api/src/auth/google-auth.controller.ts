import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { GOOGLE_SCOPES, createOAuthClient, readGoogleConfig } from '../calendar/google-oauth';

/**
 * 호스트가 1회 실행하는 Google 동의 플로우.
 *
 * 1. 브라우저에서 http://localhost:3001/api/auth/google 접속
 * 2. Google 로그인/동의
 * 3. 콜백 화면에 표시된 GOOGLE_REFRESH_TOKEN 을 apps/api/.env 에 붙여넣기
 * 4. CALENDAR_PROVIDER=google 로 재시작하면 실연동 완료
 */
@Controller('auth/google')
export class GoogleAuthController {
  private readonly logger = new Logger(GoogleAuthController.name);

  @Get()
  start(@Res() res: Response): void {
    const cfg = readGoogleConfig();
    if (!cfg.clientId || !cfg.clientSecret) {
      res
        .status(500)
        .send('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET 가 설정되지 않았습니다 (.env 확인).');
      return;
    }
    const url = createOAuthClient(cfg).generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // 항상 refresh_token 을 받기 위해
      scope: GOOGLE_SCOPES,
    });
    res.redirect(url);
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Res() res: Response): Promise<void> {
    if (!code) {
      res.status(400).send('인증 코드(code)가 없습니다.');
      return;
    }
    try {
      const cfg = readGoogleConfig();
      const { tokens } = await createOAuthClient(cfg).getToken(code);
      const refresh = tokens.refresh_token;

      if (!refresh) {
        res
          .type('html')
          .send(
            '<h2>refresh_token 을 받지 못했습니다.</h2><p>Google 계정의 앱 권한을 해제한 뒤 다시 시도하거나, prompt=consent 가 적용됐는지 확인하세요.</p>',
          );
        return;
      }

      this.logger.log('Google refresh token issued (콘솔/화면에서 .env로 복사하세요)');
      res.type('html').send(
        `<!doctype html><meta charset="utf-8" />
         <body style="font-family:system-ui;max-width:640px;margin:40px auto;line-height:1.6">
           <h2>✅ 연동 준비 완료</h2>
           <p>아래 값을 <code>apps/api/.env</code> 에 붙여넣고 <code>CALENDAR_PROVIDER=google</code> 로 서버를 재시작하세요.</p>
           <pre style="background:#f4f5fb;padding:16px;border-radius:8px;white-space:pre-wrap;word-break:break-all">GOOGLE_REFRESH_TOKEN=${refresh}</pre>
         </body>`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).send(`토큰 교환 실패: ${message}`);
    }
  }
}
