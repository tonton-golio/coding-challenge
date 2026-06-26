import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { store } from '@/lib/store';

type Ctx = { params: Promise<{ id: string }> };

// PUT (admin only): update a challenge's title / intro / criteria.
export async function PUT(req: Request, { params }: Ctx) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const patch: Partial<{ title: string; intro: string; criteria: string[] }> = {};
  if (typeof b.title === 'string') patch.title = b.title;
  if (typeof b.intro === 'string') patch.intro = b.intro;
  if (Array.isArray(b.criteria)) {
    patch.criteria = b.criteria.filter((c): c is string => typeof c === 'string');
  }

  const challenge = await store.updateChallenge(id, patch);
  if (!challenge) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }
  return NextResponse.json({ challenge });
}

// DELETE (admin only): remove a challenge.
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  await store.deleteChallenge(id);
  return NextResponse.json({ ok: true });
}
