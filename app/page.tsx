import Image from 'next/image';
import Link from 'next/link';

// Landing — server/static. Renders one screen, always active.
export default function HomePage() {
  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="simply.tv coding challenge — home">
          <Image
            className="logo"
            src="/simply-tv.avif"
            alt="simply.tv"
            width={61}
            height={26}
            priority
          />
          <span className="ctx">coding&nbsp;challenge</span>
        </a>
        <div className="topbar-right">
          <Link className="btn muted" href="/signin">
            Sign in
          </Link>
          <Link className="btn primary" href="/signup">
            Sign up
          </Link>
        </div>
      </header>

      <main className="stage">
        <section className="screen active" data-screen="landing">
          <p className="eyebrow">90 minutes · one attempt</p>
          <h1 className="display">Build something real, against the clock.</h1>
          <p className="lede">
            The simply.tv engineering challenge. Sign up with the email address you were
            invited with, reveal your task when you&rsquo;re ready, and ship within ninety
            minutes.
          </p>
          <div className="topbar-right" style={{ gap: '12px' }}>
            <Link className="btn primary" style={{ padding: '12px 20px' }} href="/signup">
              Create account
            </Link>
            <Link className="btn muted" href="/signin">
              I have an account
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
