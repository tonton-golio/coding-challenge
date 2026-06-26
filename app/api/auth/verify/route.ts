import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { isAdmin } from '@/lib/auth';
import { setSession } from '@/lib/session';

// GET /api/auth/verify?token=...
// Confirms a candidate's email-verification token, signs them in, and redirects
// them onward. Invalid/expired tokens bounce to sign-in with an error flag.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';

  const email = token ? await store.verifyUserByToken(token) : null;
  if (!email) {
    return NextResponse.redirect(new URL('/signin?verify=failed', url.origin));
  }

  await setSession(email);

  const candidate = await store.getCandidate(email);
  const dest = isAdmin(email)
    ? '/admin'
    : candidate?.startedAt
      ? '/challenge'
      : '/dashboard';
  return NextResponse.redirect(new URL(`${dest}?verified=1`, url.origin));
}
