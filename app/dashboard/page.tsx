import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { store } from '@/lib/store';
import RevealButton from './RevealButton';
import SignOutButton from '../SignOutButton';

// Candidate landing once signed in, before the challenge is revealed.
// Admins are bounced to /admin; an already-started candidate goes straight
// to their live challenge. The brief itself is never shown here.
export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/signin');
  if (user.isAdmin) redirect('/admin');

  const candidate = await store.getCandidate(user.email);
  if (candidate?.startedAt) redirect('/challenge');

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
        <section className="screen active" data-screen="dashboard">
          <p className="eyebrow">You&rsquo;re in</p>
          <h2 className="title">Ready when you are.</h2>
          <p className="lede">
            Revealing starts a 90-minute timer and records your start time. There&rsquo;s no
            pause and no second reveal.
          </p>
          <div className="card">
            <p className="section-label">How you&rsquo;ll submit</p>
            <ol className="steps" style={{ marginTop: '8px' }}>
              <li>
                <span className="n">1</span>
                <span className="tx">
                  Create a <b>public</b> GitHub repository
                </span>
              </li>
              <li>
                <span className="n">2</span>
                <span className="tx">Push your code to it</span>
              </li>
              <li>
                <span className="n">3</span>
                <span className="tx">
                  Paste the repository link on the challenge page
                  <small>Before the timer hits zero.</small>
                </span>
              </li>
            </ol>
            <p className="note">The timer starts the moment you reveal, and can&rsquo;t be paused.</p>
            <RevealButton />
          </div>
        </section>
      </main>
    </div>
  );
}
