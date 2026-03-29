import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: false,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP_USER / SMTP_PASS not set — invite emails will NOT be sent');
    }
  }

  async sendInvite(opts: {
    to: string;
    clubName: string;
    inviteUrl: string;
  }): Promise<void> {
    if (!this.transporter) return;

    const from = this.config.get<string>(
      'SMTP_FROM',
      `"Pikado" <${this.config.get('SMTP_USER')}>`,
    );

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Pozivnica — ${opts.clubName}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
          style="background:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:36px 40px;text-align:center;">
              <div style="font-size:40px;margin-bottom:8px;">🎯</div>
              <div style="color:#fff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Pikado</div>
              <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">Darts Platform</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="color:#94a3b8;font-size:14px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;">
                Pozivnica za klub
              </p>
              <h2 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0 0 20px 0;">
                ${opts.clubName}
              </h2>
              <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 28px 0;">
                Pozvani ste da se pridružite darts klubu <strong style="color:#f97316;">${opts.clubName}</strong>
                na Pikado platformi. Kliknite dugme ispod da prihvatite pozivnicu.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td align="center"
                    style="background:linear-gradient(135deg,#f97316,#ea580c);border-radius:10px;">
                    <a href="${opts.inviteUrl}"
                      style="display:inline-block;padding:14px 36px;color:#fff;font-size:15px;
                             font-weight:700;text-decoration:none;letter-spacing:0.3px;">
                      Prihvati Pozivnicu →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="color:#64748b;font-size:12px;text-align:center;margin:0 0 4px 0;">
                Ako dugme ne radi, otvorite ovaj link:
              </p>
              <p style="text-align:center;margin:0;">
                <a href="${opts.inviteUrl}"
                  style="color:#f97316;font-size:12px;word-break:break-all;">
                  ${opts.inviteUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #334155;padding:20px 40px;text-align:center;">
              <p style="color:#475569;font-size:12px;margin:0;">
                Pozivnica ističe za <strong style="color:#64748b;">48 sati</strong>.
                Ako niste očekivali ovu email poruku, možete je ignorisati.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from,
        to: opts.to,
        subject: `Pozivnica za klub "${opts.clubName}" — Pikado`,
        html,
      });
      this.logger.log(`Invite email sent to ${opts.to}`);
    } catch (err) {
      this.logger.error(`Failed to send invite email to ${opts.to}: ${err}`);
    }
  }
}
