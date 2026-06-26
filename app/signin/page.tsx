'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 401) {
        setError('Incorrect email or password.');
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
          <Link className="btn primary" href="/signup">
            Sign up
          </Link>
        </div>
      </header>

      <main className="stage">
        <section className="screen active" data-screen="signin">
          <p className="eyebrow">Welcome back</p>
          <h2 className="title">Sign in</h2>
          <p className="lede">
            If your timer is running, it kept running &mdash; signing back in drops you straight
            into your live challenge.
          </p>
          <form className="card" onSubmit={handleSubmit} noValidate>
            <div className={`field${error ? ' err' : ''}`}>
              <label htmlFor="si-email">Email</label>
              <input
                id="si-email"
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
            </div>
            <div className={`field${error ? ' err' : ''}`}>
              <label htmlFor="si-pass">Password</label>
              <input
                id="si-pass"
                type="password"
                placeholder="your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                required
              />
              <span className="err-msg">{error}</span>
            </div>
            <div className="form-foot">
              <button className="btn primary block" type="submit" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
              <p className="switch-line">
                No account yet? <Link href="/signup">Create one</Link>
              </p>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
