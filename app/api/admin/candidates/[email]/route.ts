import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { store } from '@/lib/store';

type Ctx = { params: Promise<{ email: string }> };

// PATCH (admin only) { challengeId }: assign (or clear) a candidate's challenge.
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { email: raw } = await params;
  const email = decodeURIComponent(raw).trim().toLowerCase();

  if (!(await store.getCandidate(email))) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const challengeId =
    typeof b.challengeId === 'string' && b.challengeId ? b.challengeId : null;

  await store.assignChallenge(email, challengeId);
  const candidate = await store.getCandidate(email);
  return NextResponse.json({ candidate });
}

// DELETE (admin only): remove a candidate from the invite list.
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { email: raw } = await params;
  const email = decodeURIComponent(raw).trim().toLowerCase();
  await store.removeCandidate(email);
  return NextResponse.json({ ok: true });
}
