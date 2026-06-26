import type { Challenge, Candidate } from '@/lib/types';

// SCRUB: This repository is PUBLIC. Never put real challenge briefs, candidate
// emails, or users here. The only seeded challenge is a clearly-fake placeholder.
// Real challenges and candidates are created in the Admin page and stored in the
// database — never in this repository.

export type SeedShape = {
  challenges: Challenge[];
  candidates: Candidate[];
  users: { email: string; passwordHash: string }[];
};

export const seedChallenges: Challenge[] = [
  {
    id: 'example',
    title: 'Example challenge (edit or delete me in Admin)',
    intro:
      'Placeholder. Real challenges are created in the Admin page and stored in the database — never in this repository.',
    criteria: [
      'Edit these in the Admin page.',
      'Challenges live in the database, not in GitHub.',
    ],
  },
];

// Zero candidates, zero users — seeded empty on purpose (SCRUB).
export const seedCandidates: Candidate[] = [];
export const seedUsers: { email: string; passwordHash: string }[] = [];

export function makeSeed(): SeedShape {
  return {
    challenges: JSON.parse(JSON.stringify(seedChallenges)),
    candidates: JSON.parse(JSON.stringify(seedCandidates)),
    users: JSON.parse(JSON.stringify(seedUsers)),
  };
}
