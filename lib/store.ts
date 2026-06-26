import { memoryStore } from '@/lib/store.memory';
import { supabaseStore } from '@/lib/store.supabase';
import type { Store } from '@/lib/store.contract';

export type { Store } from '@/lib/store.contract';

// Auto-select the supabase impl iff both env vars are present, else the
// JSON-file dev store. Both impls do their I/O lazily (supabase builds its
// client on first call, memory touches the filesystem on first call), so
// importing both here is side-effect-free until the store is actually used.
const useSupabase = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Fail closed on Vercel: the JSON dev store writes to an ephemeral, per-invocation
// filesystem there, so it must never back a real deployment. (Local dev / `next
// start` without VERCEL may use it.)
if (!useSupabase && process.env.VERCEL) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production — the local JSON store is not durable on Vercel.',
  );
}

export const store: Store = useSupabase ? supabaseStore : memoryStore;
