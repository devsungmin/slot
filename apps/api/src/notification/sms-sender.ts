import { Logger } from '@nestjs/common';

/** SMS 발송 추상화 (Mock ↔ Twilio) */
export interface SmsSender {
  send(to: string, body: string): Promise<void>;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  from: string;
  /** "010-…" 같은 로컬 번호를 E.164 로 바꿀 때 쓸 국가코드 (기본 +82) */
  defaultCountryCode: string;
}

export const readTwilioConfig = (): TwilioConfig => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
  authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
  from: process.env.TWILIO_FROM ?? '',
  defaultCountryCode: process.env.SMS_DEFAULT_COUNTRY_CODE ?? '+82',
});

/** "010-1234-5678" → "+821012345678" (이미 +로 시작하면 그대로) */
export const toE164 = (phone: string, countryCode: string): string => {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  return digits.startsWith('0') ? `${countryCode}${digits.slice(1)}` : `${countryCode}${digits}`;
};

/** 기본값. 실제 발송 대신 콘솔에 기록한다. */
export class MockSmsSender implements SmsSender {
  private readonly logger = new Logger(MockSmsSender.name);

  async send(to: string, body: string): Promise<void> {
    this.logger.log(`[SMS:mock] → ${to} | ${body.split('\n')[0]}`);
  }
}

/**
 * Twilio REST API 발송. NOTIFY_SMS_PROVIDER=twilio + TWILIO_* 환경변수로 활성화.
 * SDK 없이 fetch 로 호출한다 (POST /2010-04-01/Accounts/{sid}/Messages.json).
 */
export class TwilioSmsSender implements SmsSender {
  private readonly logger = new Logger(TwilioSmsSender.name);

  constructor(private readonly cfg: TwilioConfig) {
    if (!cfg.accountSid || !cfg.authToken || !cfg.from) {
      throw new Error(
        'Twilio SMS 에 TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM 이 필요합니다.',
      );
    }
    this.logger.log('TwilioSmsSender active');
  }

  async send(to: string, body: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.cfg.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.cfg.accountSid}:${this.cfg.authToken}`).toString('base64');
    const params = new URLSearchParams({
      To: toE164(to, this.cfg.defaultCountryCode),
      From: this.cfg.from,
      Body: body,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Twilio 발송 실패 (${res.status}): ${detail.slice(0, 200)}`);
    }
    this.logger.log(`[SMS:twilio] sent → ${to}`);
  }
}
