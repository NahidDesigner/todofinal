type Provider = 'sendgrid' | 'mailgun';

const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || '').toLowerCase() as Provider;
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || '';
const APP_BASE_URL = process.env.APP_BASE_URL || '';
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || '';

export async function sendInviteEmail(params: { to: string; displayName?: string; tempPassword: string }): Promise<{ ok: boolean; message?: string }>{
  if (!EMAIL_PROVIDER || !EMAIL_API_KEY || !EMAIL_FROM) {
    return { ok: false, message: 'Email not configured' };
  }
  const subject = 'You are invited to Smart TODO App';
  const bodyText = `Hello${params.displayName ? ' ' + params.displayName : ''},\n\n` +
    `You have been invited to Smart TODO App.\n` +
    `Temporary password: ${params.tempPassword}\n` +
    `Sign in at ${APP_BASE_URL || 'the app URL'}`;

  try {
    if (EMAIL_PROVIDER === 'sendgrid') {
      const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${EMAIL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: params.to }] }],
          from: { email: EMAIL_FROM },
          subject,
          content: [{ type: 'text/plain', value: bodyText }]
        })
      });
      if (!resp.ok) {
        const text = await resp.text();
        return { ok: false, message: `SendGrid error: ${text}` };
      }
      return { ok: true };
    }
    if (EMAIL_PROVIDER === 'mailgun') {
      if (!MAILGUN_DOMAIN) return { ok: false, message: 'MAILGUN_DOMAIN missing' };
      const form = new URLSearchParams();
      form.set('from', EMAIL_FROM);
      form.set('to', params.to);
      form.set('subject', subject);
      form.set('text', bodyText);
      const resp = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from('api:' + EMAIL_API_KEY).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: form.toString()
      });
      if (!resp.ok) {
        const text = await resp.text();
        return { ok: false, message: `Mailgun error: ${text}` };
      }
      return { ok: true };
    }
    return { ok: false, message: 'Unsupported provider' };
  } catch (err: any) {
    return { ok: false, message: err?.message || String(err) };
  }
}