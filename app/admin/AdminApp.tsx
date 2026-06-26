'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TOTAL_SECONDS } from '@/lib/constants';
import type { Candidate, Challenge } from '@/lib/types';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtClock(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

type StatusInfo = {
  cls: '' | 'live' | 'warn' | 'done' | 'idle';
  label: string;
};

// Compute a candidate's status client-side from startedAt + repoUrl + now.
function statusOf(c: Candidate, now: number): StatusInfo {
  if (c.repoUrl) return { cls: 'done', label: 'Submitted' };
  if (c.startedAt == null) return { cls: 'idle', label: 'Invited' };
  const remaining = Math.max(
    0,
    TOTAL_SECONDS - Math.floor((now - c.startedAt) / 1000),
  );
  if (remaining <= 0) return { cls: 'warn', label: 'Time up · no submission' };
  return {
    cls: remaining <= 600 ? 'warn' : 'live',
    label: `In progress · ${fmt(remaining)}`,
  };
}

export default function AdminApp() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Load everything on mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/data');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: { challenges: Challenge[]; candidates: Candidate[] } =
          await res.json();
        if (!alive) return;
        setChallenges(data.challenges ?? []);
        setCandidates(data.candidates ?? []);
      } catch {
        if (alive) setLoadError('Could not load admin data.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Tick so In-progress timers stay live.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <section className="screen wide active" data-screen="admin">
        <p className="lede">Loading…</p>
      </section>
    );
  }

  return (
    <section className="screen wide active" data-screen="admin">
      <p className="eyebrow">Admin</p>
      <h2 className="title">Candidates &amp; challenges</h2>
      <p className="lede">
        Create and edit challenges, invite candidates by email, and assign each
        person a challenge. They get whichever challenge is set for them when they
        reveal. Challenge text lives in the database, never in the repository.
      </p>

      {loadError && (
        <p className="ended show" style={{ marginBottom: 16 }}>
          {loadError}
        </p>
      )}

      <ChallengesCard challenges={challenges} setChallenges={setChallenges} />

      <CandidatesCard
        candidates={candidates}
        setCandidates={setCandidates}
        challenges={challenges}
        now={now}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Challenges editor                                                  */
/* ------------------------------------------------------------------ */

function ChallengesCard({
  challenges,
  setChallenges,
}: {
  challenges: Challenge[];
  setChallenges: React.Dispatch<React.SetStateAction<Challenge[]>>;
}) {
  const [adding, setAdding] = useState(false);

  const addChallenge = useCallback(async () => {
    setAdding(true);
    try {
      const res = await fetch('/api/admin/challenges', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: '', intro: '', criteria: [] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { challenge } = (await res.json()) as { challenge: Challenge };
      setChallenges((prev) => [...prev, challenge]);
    } catch {
      // surfaced per-row on save; keep the add control resilient
    } finally {
      setAdding(false);
    }
  }, [setChallenges]);

  return (
    <div className="card">
      <p className="section-label">Challenges</p>
      <p className="section-sub">
        Edit a challenge and Save to persist it. Candidates only ever see the
        challenge assigned to them, and only after they reveal.
      </p>

      {challenges.length === 0 && (
        <p className="section-sub" style={{ marginBottom: 0 }}>
          No challenges yet. Add one to get started.
        </p>
      )}

      <div>
        {challenges.map((ch) => (
          <ChallengeEditor
            key={ch.id}
            challenge={ch}
            setChallenges={setChallenges}
          />
        ))}
      </div>

      <div className="inp-row" style={{ marginTop: 16 }}>
        <button
          className="btn"
          type="button"
          onClick={addChallenge}
          disabled={adding}
        >
          {adding ? 'Adding…' : 'Add challenge'}
        </button>
      </div>
    </div>
  );
}

function ChallengeEditor({
  challenge,
  setChallenges,
}: {
  challenge: Challenge;
  setChallenges: React.Dispatch<React.SetStateAction<Challenge[]>>;
}) {
  const [title, setTitle] = useState(challenge.title);
  const [intro, setIntro] = useState(challenge.intro);
  const [criteriaText, setCriteriaText] = useState(
    challenge.criteria.join('\n'),
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Keep the editor in sync if the underlying challenge identity changes.
  useEffect(() => {
    setTitle(challenge.title);
    setIntro(challenge.intro);
    setCriteriaText(challenge.criteria.join('\n'));
  }, [challenge.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async () => {
    setSaving(true);
    setMsg(null);
    setErr(null);
    const criteria = criteriaText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    try {
      const res = await fetch(
        `/api/admin/challenges/${encodeURIComponent(challenge.id)}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title, intro, criteria }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { challenge: updated } = (await res.json()) as {
        challenge: Challenge;
      };
      setChallenges((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      setMsg('Saved');
    } catch {
      setErr('Could not save.');
    } finally {
      setSaving(false);
    }
  }, [challenge.id, title, intro, criteriaText, setChallenges]);

  const remove = useCallback(async () => {
    setDeleting(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/challenges/${encodeURIComponent(challenge.id)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setChallenges((prev) => prev.filter((c) => c.id !== challenge.id));
    } catch {
      setErr('Could not delete.');
      setDeleting(false);
    }
  }, [challenge.id, setChallenges]);

  return (
    <div
      className="chal-ref"
      style={{ paddingTop: 16, paddingBottom: 16, borderBottomColor: 'var(--line)' }}
    >
      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor={`title-${challenge.id}`}>Title</label>
        <input
          id={`title-${challenge.id}`}
          type="text"
          value={title}
          placeholder="Challenge title"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor={`intro-${challenge.id}`}>Intro</label>
        <textarea
          id={`intro-${challenge.id}`}
          rows={3}
          value={intro}
          placeholder="One or two sentences describing the task."
          onChange={(e) => setIntro(e.target.value)}
        />
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor={`criteria-${challenge.id}`}>
          What we&rsquo;re looking for (one per line)
        </label>
        <textarea
          id={`criteria-${challenge.id}`}
          rows={5}
          value={criteriaText}
          placeholder={'One criterion per line.'}
          onChange={(e) => setCriteriaText(e.target.value)}
        />
      </div>

      <div className="inp-row" style={{ alignItems: 'center' }}>
        <button
          className="btn primary"
          type="button"
          onClick={save}
          disabled={saving || deleting}
          style={{ flex: '0 0 auto' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          className="btn muted"
          type="button"
          onClick={remove}
          disabled={saving || deleting}
          style={{ flex: '0 0 auto' }}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
        {msg && (
          <span className="sent-ok" style={{ flex: '0 0 auto' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {msg}
          </span>
        )}
        {err && (
          <span className="inline-err show" style={{ flex: '0 0 auto' }}>
            {err}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Candidates                                                         */
/* ------------------------------------------------------------------ */

function CandidatesCard({
  candidates,
  setCandidates,
  challenges,
  now,
}: {
  candidates: Candidate[];
  setCandidates: React.Dispatch<React.SetStateAction<Candidate[]>>;
  challenges: Challenge[];
  now: number;
}) {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const existing = useMemo(
    () => new Set(candidates.map((c) => c.email.toLowerCase())),
    [candidates],
  );

  const invite = useCallback(async () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setErr('Enter a valid email address.');
      return;
    }
    if (existing.has(value)) {
      setErr('That candidate is already invited.');
      return;
    }
    setErr(null);
    setInviting(true);
    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: value }),
      });
      if (res.status === 409) {
        setErr('That candidate is already invited.');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { candidate } = (await res.json()) as { candidate: Candidate };
      setCandidates((prev) => [...prev, candidate]);
      setEmail('');
    } catch {
      setErr('Could not invite that candidate.');
    } finally {
      setInviting(false);
    }
  }, [email, existing, setCandidates]);

  const assign = useCallback(
    async (candidateEmail: string, challengeId: string | null) => {
      // optimistic
      setCandidates((prev) =>
        prev.map((c) =>
          c.email.toLowerCase() === candidateEmail.toLowerCase()
            ? { ...c, challengeId }
            : c,
        ),
      );
      try {
        const res = await fetch(
          `/api/admin/candidates/${encodeURIComponent(candidateEmail)}`,
          {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ challengeId }),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { candidate } = (await res.json()) as { candidate: Candidate };
        setCandidates((prev) =>
          prev.map((c) =>
            c.email.toLowerCase() === candidate.email.toLowerCase()
              ? candidate
              : c,
          ),
        );
      } catch {
        // best-effort: re-fetch to reconcile on failure
      }
    },
    [setCandidates],
  );

  const remove = useCallback(
    async (candidateEmail: string) => {
      const prev = candidates;
      setCandidates((cs) =>
        cs.filter(
          (c) => c.email.toLowerCase() !== candidateEmail.toLowerCase(),
        ),
      );
      try {
        const res = await fetch(
          `/api/admin/candidates/${encodeURIComponent(candidateEmail)}`,
          { method: 'DELETE' },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch {
        setCandidates(prev); // restore on failure
      }
    },
    [candidates, setCandidates],
  );

  return (
    <div className="card">
      <p className="section-label">Candidates</p>
      <p className="section-sub">
        Only invited emails can create an account. Each person gets the challenge
        you assign.
      </p>

      <div className={`inp-row${err ? ' err' : ''}`}>
        <input
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="candidate@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (err) setErr(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              invite();
            }
          }}
        />
        <button
          className="btn primary"
          type="button"
          onClick={invite}
          disabled={inviting}
        >
          {inviting ? 'Inviting…' : 'Invite'}
        </button>
      </div>
      <p className={`inline-err${err ? ' show' : ''}`}>{err}</p>

      <div className="tbl-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Candidate email</th>
              <th>Assigned challenge</th>
              <th>Status</th>
              <th>Started</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={5} className="mono-dim">
                  No candidates invited yet.
                </td>
              </tr>
            ) : (
              candidates.map((c) => {
                const status = statusOf(c, now);
                return (
                  <tr key={c.email}>
                    <td className="email">{c.email}</td>
                    <td>
                      <select
                        className="csel"
                        value={c.challengeId ?? ''}
                        aria-label={`Challenge for ${c.email}`}
                        onChange={(e) =>
                          assign(c.email, e.target.value || null)
                        }
                      >
                        <option value="">Unassigned</option>
                        {challenges.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {ch.title || '(untitled)'}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`stat ${status.cls}`}>{status.label}</span>
                      {c.repoUrl && (
                        <a
                          className="admin-link"
                          href={c.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {c.repoUrl.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </td>
                    <td className="mono-dim nums">
                      {c.startedAt != null ? fmtClock(c.startedAt) : '—'}
                    </td>
                    <td className="col-rm">
                      <button
                        className="rm"
                        type="button"
                        aria-label={`Remove ${c.email}`}
                        onClick={() => remove(c.email)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
