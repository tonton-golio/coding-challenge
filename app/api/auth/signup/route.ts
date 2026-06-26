import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { hashPassword, isAdmin } from '@/lib/auth';
import { setSession } from '@/lib/session';

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

  await store.createUser(email, hashPassword(password));
  await setSession(email);

  return NextResponse.json({
    ok: true,
    isAdmin: admin,
    revealed: !!candidate?.startedAt,
  });
}
