import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { isAdmin, verifyPassword } from '@/lib/auth';
import { setSession } from '@/lib/session';
import { appBaseUrl, sendVerificationEmail } from '@/lib/email';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!EMAIL_RE.test(email) || !password) {
    return NextResponse.json({ error: 'bad-credentials' }, { status: 401 });
  }

  const user = await store.getUser(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'bad-credentials' }, { status: 401 });
  }

  // Email not yet confirmed: refuse the session and re-send the link best-effort.
  if (!user.verified) {
    if (user.verifyToken) {
      const base = appBaseUrl() || new URL(req.url).origin;
      await sendVerificationEmail(email, `${base}/api/auth/verify?token=${user.verifyToken}`);
    }
    return NextResponse.json({ error: 'unverified' }, { status: 403 });
  }

  await setSession(email);

  const candidate = await store.getCandidate(email);
  return NextResponse.json({
    ok: true,
    isAdmin: isAdmin(email),
    revealed: !!candidate?.startedAt,
  });
}
