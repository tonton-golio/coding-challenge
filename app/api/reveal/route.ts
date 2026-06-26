import { NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/session';
import { store } from '@/lib/store';

// POST /api/reveal — start the candidate's timer (idempotent).
// Requires a session email. Sets startedAt only if currently null and
// returns the effective startedAt (existing one if already started).
export async function POST() {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const startedAt = await store.startChallenge(email);
  return NextResponse.json({ startedAt });
}
