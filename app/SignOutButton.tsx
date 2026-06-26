'use client';

// Small client control used in the authenticated top bars.
export default function SignOutButton() {
  async function signOut() {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } finally {
      window.location.href = '/';
    }
  }
  return (
    <button
      type="button"
      className="btn muted"
      style={{ padding: '5px 0', border: 'none' }}
      onClick={signOut}
    >
      Sign out
    </button>
  );
}
