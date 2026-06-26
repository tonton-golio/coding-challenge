import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { store } from '@/lib/store';

// POST (admin only): create a challenge. Body may be a blank/typed challenge;
// the Admin page typically creates a blank one and then edits it via PUT.
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

  const title = typeof b.title === 'string' ? b.title : '';
  const intro = typeof b.intro === 'string' ? b.intro : '';
  const criteria = Array.isArray(b.criteria)
    ? b.criteria.filter((c): c is string => typeof c === 'string')
    : [];

  const challenge = await store.createChallenge({ title, intro, criteria });
  return NextResponse.json({ challenge }, { status: 201 });
}
