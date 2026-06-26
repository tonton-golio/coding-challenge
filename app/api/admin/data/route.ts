import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { store } from '@/lib/store';

// GET (admin only): everything the Admin page needs in one shot.
export async function GET() {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const [challenges, candidates] = await Promise.all([
    store.listChallenges(),
    store.listCandidates(),
  ]);
  return NextResponse.json({ challenges, candidates });
}
