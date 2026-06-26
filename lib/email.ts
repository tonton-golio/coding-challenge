// Transactional email via Resend (https://resend.com).
//
// We call Resend's REST API directly with fetch instead of pulling in the SDK —
// the call is trivial and it keeps the public repo dependency-free.
//
// When RESEND_API_KEY is unset the app runs in "log mode": nothing is sent and
// the message (including any action link) is logged server-side. That keeps
// local development working with zero external services. In a real deployment
// the key is required (see app/api/auth/signup/route.ts, which fails closed on
// Vercel when email isn't configured).

type SendResult = { sent: boolean; error?: string };

function fromAddress(): string {
  // Override with EMAIL_FROM, e.g. "Simply.tv Hiring <hiring@simply.tv>".
  // Resend's onboarding sender works out of the box for testing but can only
  // deliver to the account owner's own verified address.
  return process.env.EMAIL_FROM || 'Simply.tv Hiring <onboarding@resend.dev>';
}

function replyToAddress(): string {
  // Optional Reply-To, e.g. the hiring manager's real inbox, so candidate
  // replies don't bounce off the no-mailbox sending address.
  return (process.env.EMAIL_REPLY_TO || '').trim();
}

/**
 * Public base URL used to build absolute links in emails. Prefers APP_URL, then
 * Vercel's production URL. Returns '' when neither is set (callers fall back to
 * the incoming request's origin).
 */
export function appBaseUrl(): string {
  const explicit = process.env.APP_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : '';
  return (explicit || vercel || '').replace(/\/+$/, '');
}

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

async function send(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:log-mode] to=${to} subject=${JSON.stringify(subject)}\n${text}`);
    return { sent: false };
  }
  try {
    const payload: Record<string, unknown> = { from: fromAddress(), to, subject, html, text };
    const replyTo = replyToAddress();
    if (replyTo) payload.reply_to = replyTo;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(`[email] Resend send failed (${res.status}): ${detail}`);
      return { sent: false, error: `resend-${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error('[email] Resend send error:', e);
    return { sent: false, error: 'network' };
  }
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.55">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <h2 style="font-weight:600;font-size:20px;margin:0 0 16px">${title}</h2>
    ${bodyHtml}
    <p style="color:#999;font-size:12px;margin-top:36px">simply.tv coding challenge</p>
  </div></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${href}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600">${label}</a></p>
  <p style="font-size:12px;color:#999">Or paste this link into your browser:<br><span style="word-break:break-all">${href}</span></p>`;
}

/** Verify-your-email message sent to a candidate after they sign up. */
export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<SendResult> {
  const html = layout(
    'Verify your email',
    `<p>Confirm this address to activate your coding-challenge account.</p>${button(verifyUrl, 'Verify email')}`,
  );
  const text = `Verify your email to activate your coding-challenge account:\n${verifyUrl}`;
  return send(to, 'Verify your email — simply.tv coding challenge', html, text);
}

/** Invitation sent to a candidate when an admin adds them. */
export async function sendInviteEmail(to: string, signupUrl: string): Promise<SendResult> {
  const html = layout(
    "You're invited",
    `<p>You've been invited to a take-home coding challenge. Create your account using this email address to get started.</p>${button(
      signupUrl,
      'Create your account',
    )}<p style="font-size:13px;color:#555">When you're ready you'll reveal your challenge and have 90 minutes to submit a public GitHub repository link.</p>`,
  );
  const text = `You've been invited to a take-home coding challenge. Create your account:\n${signupUrl}`;
  return send(to, "You're invited — simply.tv coding challenge", html, text);
}
