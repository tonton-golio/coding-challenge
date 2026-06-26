import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import type { Challenge, Candidate } from '@/lib/types';
import type { Store } from '@/lib/store.contract';

// Row shapes as stored in Supabase/Postgres.
type ChallengeRow = {
  id: string;
  title: string;
  intro: string;
  criteria: string[] | null;
};
type CandidateRow = {
  email: string;
  challenge_id: string | null;
  started_at: number | string | null;
  repo_url: string | null;
};
type UserRow = {
  email: string;
  password_hash: string;
};

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for the supabase store');
  }
  // Service-role client bypasses RLS — server-only, never expose this key to the browser.
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function lc(email: string): string {
  return (email || '').trim().toLowerCase();
}

function mapChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    title: row.title,
    intro: row.intro,
    criteria: Array.isArray(row.criteria) ? row.criteria : [],
  };
}

function mapCandidate(row: CandidateRow): Candidate {
  return {
    email: row.email,
    challengeId: row.challenge_id ?? null,
    startedAt: row.started_at == null ? null : Number(row.started_at),
    repoUrl: row.repo_url ?? null,
  };
}

export const supabaseStore: Store = {
  async listChallenges(): Promise<Challenge[]> {
    const { data, error } = await db().from('challenges').select('*');
    if (error) throw error;
    return (data as ChallengeRow[]).map(mapChallenge);
  },

  async getChallenge(id: string): Promise<Challenge | null> {
    const { data, error } = await db()
      .from('challenges')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapChallenge(data as ChallengeRow) : null;
  },

  async createChallenge(input: {
    title: string;
    intro: string;
    criteria: string[];
  }): Promise<Challenge> {
    const id = randomUUID();
    const { data, error } = await db()
      .from('challenges')
      .insert({ id, title: input.title, intro: input.intro, criteria: input.criteria })
      .select('*')
      .single();
    if (error) throw error;
    return mapChallenge(data as ChallengeRow);
  },

  async updateChallenge(
    id: string,
    patch: Partial<{ title: string; intro: string; criteria: string[] }>,
  ): Promise<Challenge | null> {
    const update: Record<string, unknown> = {};
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.intro !== undefined) update.intro = patch.intro;
    if (patch.criteria !== undefined) update.criteria = patch.criteria;
    if (Object.keys(update).length === 0) {
      return this.getChallenge(id);
    }
    const { data, error } = await db()
      .from('challenges')
      .update(update)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data ? mapChallenge(data as ChallengeRow) : null;
  },

  async deleteChallenge(id: string): Promise<void> {
    const { error } = await db().from('challenges').delete().eq('id', id);
    if (error) throw error;
  },

  async listCandidates(): Promise<Candidate[]> {
    const { data, error } = await db().from('candidates').select('*');
    if (error) throw error;
    return (data as CandidateRow[]).map(mapCandidate);
  },

  async getCandidate(email: string): Promise<Candidate | null> {
    const { data, error } = await db()
      .from('candidates')
      .select('*')
      .eq('email', lc(email))
      .maybeSingle();
    if (error) throw error;
    return data ? mapCandidate(data as CandidateRow) : null;
  },

  async addCandidate(email: string, challengeId: string | null): Promise<Candidate> {
    const e = lc(email);
    const { data, error } = await db()
      .from('candidates')
      .upsert(
        { email: e, challenge_id: challengeId },
        { onConflict: 'email', ignoreDuplicates: false },
      )
      .select('*')
      .single();
    if (error) throw error;
    return mapCandidate(data as CandidateRow);
  },

  async removeCandidate(email: string): Promise<void> {
    const { error } = await db().from('candidates').delete().eq('email', lc(email));
    if (error) throw error;
  },

  async assignChallenge(email: string, challengeId: string | null): Promise<void> {
    const { error } = await db()
      .from('candidates')
      .update({ challenge_id: challengeId })
      .eq('email', lc(email));
    if (error) throw error;
  },

  async startChallenge(email: string): Promise<number> {
    const e = lc(email);
    const existing = await this.getCandidate(e);
    if (existing && existing.startedAt != null) {
      return existing.startedAt;
    }
    const now = Date.now();
    // Only set started_at if currently null (compare-and-set).
    const { data, error } = await db()
      .from('candidates')
      .update({ started_at: now })
      .eq('email', e)
      .is('started_at', null)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (data) return Number((data as CandidateRow).started_at) || now;
    // Lost the race or no row: re-read the effective value.
    const after = await this.getCandidate(e);
    return after?.startedAt ?? now;
  },

  async setRepo(email: string, url: string): Promise<void> {
    const { error } = await db()
      .from('candidates')
      .update({ repo_url: url })
      .eq('email', lc(email));
    if (error) throw error;
  },

  async getUser(email: string): Promise<{ email: string; passwordHash: string } | null> {
    const { data, error } = await db()
      .from('users')
      .select('*')
      .eq('email', lc(email))
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as UserRow;
    return { email: row.email, passwordHash: row.password_hash };
  },

  async createUser(email: string, passwordHash: string): Promise<void> {
    const { error } = await db()
      .from('users')
      .upsert(
        { email: lc(email), password_hash: passwordHash },
        { onConflict: 'email', ignoreDuplicates: false },
      );
    if (error) throw error;
  },
};
