import { memoryStore } from '@/lib/store.memory';
import { supabaseStore } from '@/lib/store.supabase';
import type { Store } from '@/lib/store.contract';

export type { Store } from '@/lib/store.contract';

let resolved: Store | null = null;

// Choose the impl (and run the prod misconfig guard) on FIRST USE, not at import
// time. `next build` imports this module while collecting page data — but never
// calls the store — so deferring the check lets the build succeed before env vars
// are set, while still failing closed at runtime on a misconfigured deployment.
function resolveStore(): Store {
  if (resolved) return resolved;

  // Auto-select the supabase impl iff both env vars are present, else the
  // JSON-file dev store.
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

  resolved = useSupabase ? supabaseStore : memoryStore;
  return resolved;
}

// Lazy proxy: features `import { store }` and call methods as usual; the impl is
// resolved on the first method access (at runtime), never at build/import time.
export const store: Store = new Proxy({} as Store, {
  get(_target, prop: string | symbol) {
    const impl = resolveStore() as unknown as Record<string | symbol, unknown>;
    const value = impl[prop];
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(impl)
      : value;
  },
});
