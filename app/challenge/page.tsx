import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { store } from '@/lib/store';
import { TOTAL_SECONDS } from '@/lib/constants';
import Timer from './Timer';
import RepoSubmit from './RepoSubmit';
import SignOutButton from '../SignOutButton';

// The live challenge. Reveal-gated: only reachable once startedAt is set, and
// the brief is only ever loaded/rendered here.
export default async function ChallengePage() {
  const user = await getSessionUser();
  if (!user) redirect('/signin');

  const candidate = await store.getCandidate(user.email);
  if (!candidate || !candidate.startedAt) redirect('/dashboard');

  const challenge = candidate.challengeId
    ? await store.getChallenge(candidate.challengeId)
    : null;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="simply.tv coding challenge — home">
          <img className="logo" src="/simply-tv.avif" alt="simply.tv" width={61} height={26} />
          <span className="ctx">coding&nbsp;challenge</span>
        </a>
        <div className="topbar-right">
          <div className="acct" style={{ display: 'inline-flex' }}>
            <span className="dot" aria-hidden="true"></span>
            <b>{user.email}</b>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="stage">
        {!challenge ? (
          <section className="screen active" data-screen="live">
            <p className="eyebrow">You&rsquo;re in</p>
            <h2 className="title">No challenge assigned yet</h2>
            <p className="lede">
              No challenge assigned yet &mdash; contact the hiring team.
            </p>
          </section>
        ) : (
          <section className="screen active" data-screen="live">
            <Timer
              startedAt={candidate.startedAt}
              total={TOTAL_SECONDS}
              title={challenge.title}
            />

            <div className="brief">
              <h3>{challenge.title}</h3>
              <p>{challenge.intro}</p>
              <h3>What we&rsquo;re looking for</h3>
              <ul>
                {challenge.criteria.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
              <h3>Submit</h3>
              <ul>
                <li>Push to a public GitHub repository.</li>
                <li>Paste the link below before the timer hits zero.</li>
              </ul>

              <RepoSubmit initialUrl={candidate.repoUrl} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
