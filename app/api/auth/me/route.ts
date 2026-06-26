import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getSessionUser } from '@/lib/session';

// GET — current session user ({email, isAdmin}) plus their candidate state, or null.
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(null);
  }

  // Candidate record may not exist for admins.
  const candidate = await store.getCandidate(user.email);

  return NextResponse.json({
    ...user,
    candidate: candidate ?? null,
  });
}
