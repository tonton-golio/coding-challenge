import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { store } from '@/lib/store';
import { hashPassword, isAdmin } from '@/lib/auth';
import { setSession } from '@/lib/session';
import { appBaseUrl, emailConfigured, sendVerificationEmail } from '@/lib/email';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  let body: { email?: unknown; password?: unknown; setupToken?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid-email' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'weak-password' }, { status: 400 });
  }

  const admin = isAdmin(email);
  const candidate = await store.getCandidate(email);

  // Authorization to create an account:
  // - admins must present the ADMIN_SETUP_TOKEN, so nobody can self-register as
  //   an admin just by knowing a (guessable) admin email.
  // - everyone else must be an invited candidate.
  // Both failures return the same generic response to avoid invite/account enumeration.
  if (admin) {
    const setupToken = typeof body.setupToken === 'string' ? body.setupToken : '';
    const expected = process.env.ADMIN_SETUP_TOKEN || '';
    if (expected.length < 8 || setupToken !== expected) {
      return NextResponse.json({ error: 'cannot-signup' }, { status: 403 });
    }
  } else if (!candidate) {
    return NextResponse.json({ error: 'cannot-signup' }, { status: 403 });
  }

  // Already has an account.
  if (await store.getUser(email)) {
    return NextResponse.json({ error: 'exists' }, { status: 409 });
  }

  // Admins are created already-verified: the ADMIN_SETUP_TOKEN is proof of
  // authority and it avoids an email-delivery dependency for the first admin.
  if (admin) {
    await store.createUser(email, hashPassword(password), { verified: true });
    await setSession(email);
    return NextResponse.json({ ok: true, isAdmin: true, revealed: false });
  }

  // Candidates must confirm ownership of their invited email before they get a
  // session. This both verifies the address and closes the impersonation gap:
  // knowing an invited email is no longer enough to register as that candidate.
  const token = randomBytes(32).toString('hex');
  await store.createUser(email, hashPassword(password), { verified: false, verifyToken: token });

  const base = appBaseUrl() || new URL(req.url).origin;
  const verifyUrl = `${base}/api/auth/verify?token=${token}`;

  if (emailConfigured()) {
    await sendVerificationEmail(email, verifyUrl);
    return NextResponse.json({ ok: true, pending: true });
  }

  // No email provider configured. On a real deployment (Vercel) we fail closed
  // rather than leak the verification link in the API response. Locally we
  // return it so the flow is completable with zero external services.
  if (process.env.VERCEL) {
    return NextResponse.json({ error: 'email-not-configured' }, { status: 500 });
  }
  console.log(`[signup] email not configured — verify link for ${email}: ${verifyUrl}`);
  return NextResponse.json({ ok: true, pending: true, devVerifyUrl: verifyUrl });
}
