import { NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/session';
import { store } from '@/lib/store';
import { TOTAL_SECONDS } from '@/lib/constants';

// Same validation the client uses, kept as the server-side source of truth.
const REPO_RE = /^https?:\/\/\S+\.\S+$/i;

// POST /api/submit { url } — save the candidate's repository link.
// Requires a session email; validates the URL before persisting.
export async function POST(req: Request) {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let url = '';
  try {
    const body = await req.json();
    url = typeof body?.url === 'string' ? body.url.trim() : '';
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  if (!REPO_RE.test(url)) {
    return NextResponse.json({ error: 'invalid-url' }, { status: 400 });
  }

  // Server-side reveal-gating + deadline: a link can only be saved once the
  // challenge has been revealed and while time remains.
  const candidate = await store.getCandidate(email);
  if (!candidate || candidate.startedAt == null) {
    return NextResponse.json({ error: 'not-started' }, { status: 403 });
  }
  if (Date.now() - candidate.startedAt > TOTAL_SECONDS * 1000) {
    return NextResponse.json({ error: 'time-up' }, { status: 403 });
  }

  await store.setRepo(email, url);
  return NextResponse.json({ ok: true });
}
