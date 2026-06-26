export type Challenge = {
  id: string;
  title: string;
  intro: string;
  criteria: string[];
};

export type Candidate = {
  email: string;
  challengeId: string | null;
  startedAt: number | null;
  repoUrl: string | null;
};

export type SessionUser = {
  email: string;
  isAdmin: boolean;
};

export type StoredUser = {
  email: string;
  passwordHash: string;
  // Candidates must confirm ownership of their invited email before they get a
  // session. Admins are created already-verified (the ADMIN_SETUP_TOKEN is proof).
  verified: boolean;
  // One-shot email-verification token; cleared once the email is confirmed.
  verifyToken: string | null;
};
