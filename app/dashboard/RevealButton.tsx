'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Reveals the challenge: POSTs /api/reveal to start (or recover) the timer,
// then navigates to the live challenge page.
export default function RevealButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reveal() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/reveal', { method: 'POST' });
      if (!res.ok) {
        setBusy(false);
        return;
      }
      router.push('/challenge');
    } catch {
      setBusy(false);
    }
  }

  return (
    <button className="btn primary block" onClick={reveal} disabled={busy}>
      Reveal challenge &amp; start timer
    </button>
  );
}
