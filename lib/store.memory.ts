import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Challenge, Candidate } from '@/lib/types';
import { makeSeed, type SeedShape } from '@/lib/seed';
import type { Store } from '@/lib/store.contract';

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

type DbUser = { email: string; passwordHash: string };
type Db = {
  challenges: Challenge[];
  candidates: Candidate[];
  users: DbUser[];
};

// Serialize writes so concurrent requests don't clobber the file.
// NOTE: this dev/local store is intentionally read-through (every read hits the
// file) so it stays consistent across Next's separate server module graphs
// (route handlers vs server components). Production uses the Supabase store.
let writeChain: Promise<void> = Promise.resolve();

function normalize(seed: SeedShape): Db {
  return {
    challenges: seed.challenges,
    candidates: seed.candidates.map((c) => ({ ...c, email: c.email.toLowerCase() })),
    users: seed.users.map((u) => ({ ...u, email: u.email.toLowerCase() })),
  };
}

async function ensureFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    /* ignore */
  }
  try {
    await fs.access(DB_PATH);
  } catch {
    const seeded = normalize(makeSeed());
    await fs.writeFile(DB_PATH, JSON.stringify(seeded, null, 2), 'utf8');
  }
}

async function load(): Promise<Db> {
  await ensureFile();
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Db>;
    return {
      challenges: Array.isArray(parsed.challenges) ? parsed.challenges : [],
      candidates: Array.isArray(parsed.candidates)
        ? parsed.candidates.map((c) => ({ ...c, email: c.email.toLowerCase() }))
        : [],
      users: Array.isArray(parsed.users)
        ? parsed.users.map((u) => ({ ...u, email: u.email.toLowerCase() }))
        : [],
    };
  } catch {
    return normalize(makeSeed());
  }
}

async function persist(db: Db): Promise<void> {
  const next = writeChain.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  });
  // keep the chain alive even if a write rejects
  writeChain = next.catch(() => {});
  return next;
}

function lc(email: string): string {
  return (email || '').trim().toLowerCase();
}

export const memoryStore: Store = {
  async listChallenges(): Promise<Challenge[]> {
    const db = await load();
    return db.challenges.map((c) => ({ ...c, criteria: [...c.criteria] }));
  },

  async getChallenge(id: string): Promise<Challenge | null> {
    const db = await load();
    const c = db.challenges.find((x) => x.id === id);
    return c ? { ...c, criteria: [...c.criteria] } : null;
  },

  async createChallenge(input: {
    title: string;
    intro: string;
    criteria: string[];
  }): Promise<Challenge> {
    const db = await load();
    const challenge: Challenge = {
      id: randomUUID(),
      title: input.title,
      intro: input.intro,
      criteria: [...input.criteria],
    };
    db.challenges.push(challenge);
    await persist(db);
    return { ...challenge, criteria: [...challenge.criteria] };
  },

  async updateChallenge(
    id: string,
    patch: Partial<{ title: string; intro: string; criteria: string[] }>,
  ): Promise<Challenge | null> {
    const db = await load();
    const c = db.challenges.find((x) => x.id === id);
    if (!c) return null;
    if (patch.title !== undefined) c.title = patch.title;
    if (patch.intro !== undefined) c.intro = patch.intro;
    if (patch.criteria !== undefined) c.criteria = [...patch.criteria];
    await persist(db);
    return { ...c, criteria: [...c.criteria] };
  },

  async deleteChallenge(id: string): Promise<void> {
    const db = await load();
    db.challenges = db.challenges.filter((x) => x.id !== id);
    await persist(db);
  },

  async listCandidates(): Promise<Candidate[]> {
    const db = await load();
    return db.candidates.map((c) => ({ ...c }));
  },

  async getCandidate(email: string): Promise<Candidate | null> {
    const db = await load();
    const e = lc(email);
    const c = db.candidates.find((x) => x.email === e);
    return c ? { ...c } : null;
  },

  async addCandidate(email: string, challengeId: string | null): Promise<Candidate> {
    const db = await load();
    const e = lc(email);
    const existing = db.candidates.find((x) => x.email === e);
    if (existing) {
      existing.challengeId = challengeId;
      await persist(db);
      return { ...existing };
    }
    const candidate: Candidate = {
      email: e,
      challengeId,
      startedAt: null,
      repoUrl: null,
    };
    db.candidates.push(candidate);
    await persist(db);
    return { ...candidate };
  },

  async removeCandidate(email: string): Promise<void> {
    const db = await load();
    const e = lc(email);
    db.candidates = db.candidates.filter((x) => x.email !== e);
    await persist(db);
  },

  async assignChallenge(email: string, challengeId: string | null): Promise<void> {
    const db = await load();
    const e = lc(email);
    const c = db.candidates.find((x) => x.email === e);
    if (c) {
      c.challengeId = challengeId;
      await persist(db);
    }
  },

  async startChallenge(email: string): Promise<number> {
    const db = await load();
    const e = lc(email);
    const c = db.candidates.find((x) => x.email === e);
    if (!c) {
      // No candidate row: nothing to start. Return now as the effective time.
      return Date.now();
    }
    if (c.startedAt == null) {
      c.startedAt = Date.now();
      await persist(db);
    }
    return c.startedAt;
  },

  async setRepo(email: string, url: string): Promise<void> {
    const db = await load();
    const e = lc(email);
    const c = db.candidates.find((x) => x.email === e);
    if (c) {
      c.repoUrl = url;
      await persist(db);
    }
  },

  async getUser(email: string): Promise<{ email: string; passwordHash: string } | null> {
    const db = await load();
    const e = lc(email);
    const u = db.users.find((x) => x.email === e);
    return u ? { ...u } : null;
  },

  async createUser(email: string, passwordHash: string): Promise<void> {
    const db = await load();
    const e = lc(email);
    const existing = db.users.find((x) => x.email === e);
    if (existing) {
      existing.passwordHash = passwordHash;
    } else {
      db.users.push({ email: e, passwordHash });
    }
    await persist(db);
  },
};
