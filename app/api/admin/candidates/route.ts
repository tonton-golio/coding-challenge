import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { store } from '@/lib/store';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// POST (admin only) { email }: invite a candidate (no challenge assigned yet).
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const email = (typeof b.email === 'string' ? b.email : '').trim().toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid-email' }, { status: 400 });
  }
  if (await store.getCandidate(email)) {
    return NextResponse.json({ error: 'exists' }, { status: 409 });
  }

  const candidate = await store.addCandidate(email, null);
  return NextResponse.json({ candidate }, { status: 201 });
}
