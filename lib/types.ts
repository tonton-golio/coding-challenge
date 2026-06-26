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
