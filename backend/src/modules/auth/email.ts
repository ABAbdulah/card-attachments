import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

/** Sends the sign-in code. Without an email provider (development) the code is logged instead. */
export async function sendLoginCode(email: string, code: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    logger.info(`Sign-in code for ${email}: ${code} (no RESEND_API_KEY, so it was not emailed)`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: email,
      subject: `${code} is your CardSweep code`,
      text: `Your CardSweep sign-in code is ${code}.\n\nIt expires in 10 minutes. If you did not ask for it, ignore this email.`,
    }),
  });

  if (!res.ok) {
    logger.error({ status: res.status }, 'Sign-in email failed');
    throw new Error(`Email provider returned ${res.status}`);
  }
}
