'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Admins paste the ADMIN_SETUP_TOKEN into a field (kept out of the URL/logs).
  const [setupToken, setSetupToken] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, setupToken }),
      });

      if (res.status === 403) {
        setError(
          "We couldn't create an account for that email. Use your invite link, or sign in if you already have an account.",
        );
        return;
      }
      if (res.status === 409) {
        setError('An account already exists — sign in.');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError((data && data.error) || 'Something went wrong. Try again.');
        return;
      }

      const data = await res.json();
      if (data.isAdmin) router.push('/admin');
      else if (data.revealed) router.push('/challenge');
      else router.push('/dashboard');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

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
        </div>
      </header>

      <main className="stage">
        <section className="screen active" data-screen="signup">
          <p className="eyebrow">Create account</p>
          <h2 className="title">Sign up with your invited email</h2>
          <p className="lede">
            Use the email address you were invited with &mdash; no code needed. Only invited
            emails can create an account.
          </p>
          <form className="card" onSubmit={handleSubmit} noValidate>
            <div className={`field${error ? ' err' : ''}`}>
              <label htmlFor="su-email">Email</label>
              <input
                id="su-email"
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                required
              />
              <span className="err-msg">{error}</span>
            </div>
            <div className="field">
              <label htmlFor="su-pass">Password</label>
              <input
                id="su-pass"
                type="password"
                placeholder="at least 8 characters"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="field">
              {showAdmin ? (
                <>
                  <label htmlFor="su-setup">Admin setup token</label>
                  <input
                    id="su-setup"
                    type="password"
                    placeholder="paste ADMIN_SETUP_TOKEN"
                    autoComplete="off"
                    value={setupToken}
                    onChange={(e) => setSetupToken(e.target.value)}
                  />
                  <span className="hint">Only needed to create an admin account.</span>
                </>
              ) : (
                <button
                  type="button"
                  className="btn muted"
                  style={{ alignSelf: 'flex-start', padding: 0, border: 'none', fontSize: '.72rem' }}
                  onClick={() => setShowAdmin(true)}
                >
                  Setting up an admin account?
                </button>
              )}
            </div>
            <div className="form-foot">
              <button className="btn primary block" type="submit" disabled={submitting}>
                {submitting ? 'Creating account…' : 'Create account'}
              </button>
              <p className="switch-line">
                Already registered? <Link href="/signin">Sign in</Link>
              </p>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
