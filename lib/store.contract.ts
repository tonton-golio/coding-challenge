import type { Challenge, Candidate, StoredUser } from '@/lib/types';

/**
 * The storage contract shared by every store implementation.
 * Lives in its own module so the impls and the dispatcher can all reference it
 * without an import cycle.
 *
 * Features import `store` from `@/lib/store`; they never talk to an impl
 * directly and never need this interface.
 */
export interface Store {
  listChallenges(): Promise<Challenge[]>;
  getChallenge(id: string): Promise<Challenge | null>;
  createChallenge(input: { title: string; intro: string; criteria: string[] }): Promise<Challenge>;
  updateChallenge(
    id: string,
    patch: Partial<{ title: string; intro: string; criteria: string[] }>,
  ): Promise<Challenge | null>;
  deleteChallenge(id: string): Promise<void>;

  listCandidates(): Promise<Candidate[]>;
  getCandidate(email: string): Promise<Candidate | null>;
  addCandidate(email: string, challengeId: string | null): Promise<Candidate>;
  removeCandidate(email: string): Promise<void>;
  assignChallenge(email: string, challengeId: string | null): Promise<void>;
  startChallenge(email: string): Promise<number>;
  setRepo(email: string, url: string): Promise<void>;

  getUser(email: string): Promise<StoredUser | null>;
  createUser(
    email: string,
    passwordHash: string,
    opts?: { verified?: boolean; verifyToken?: string | null },
  ): Promise<void>;
  // Confirm an email-verification token: marks the user verified, clears the
  // token, and returns the verified email — or null if the token is unknown.
  verifyUserByToken(token: string): Promise<string | null>;
}
