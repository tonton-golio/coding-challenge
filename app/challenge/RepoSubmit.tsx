'use client';

import { useState } from 'react';

const REPO_RE = /^https?:\/\/\S+\.\S+$/i;

// Repository submission row. Mirrors the prototype: a saved state (✓ + link +
// Update) once a URL exists, otherwise the input + Submit. Same client-side
// URL validation the API enforces.
export default function RepoSubmit({ initialUrl }: { initialUrl: string | null }) {
  const [savedUrl, setSavedUrl] = useState<string | null>(initialUrl);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialUrl ?? '');
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const showSaved = savedUrl && !editing;

  async function submit() {
    if (busy) return;
    const v = value.trim();
    if (!REPO_RE.test(v)) {
      setErr(true);
      return;
    }
    setErr(false);
    setBusy(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: v }),
      });
      if (!res.ok) {
        setErr(true);
        setBusy(false);
        return;
      }
      setSavedUrl(v);
      setValue(v);
      setEditing(false);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  function startEdit() {
    setValue(savedUrl ?? '');
    setEditing(true);
    setErr(false);
  }

  return (
    <div className="submit-block">
      <label className="rl-label" htmlFor="repoUrl">
        Your repository link
      </label>

      {showSaved ? (
        <div className="repo-saved">
          <span className="sent-ok">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6 9 17l-5-5" />
            </svg>{' '}
            Saved to your record
          </span>
          <a
            className="saved-link"
            href={savedUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {savedUrl}
          </a>
          <button className="btn muted edit-btn" onClick={startEdit}>
            Update
          </button>
        </div>
      ) : (
        <>
          <div className={'inp-row' + (err ? ' err' : '')}>
            <input
              id="repoUrl"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://github.com/you/your-repo"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (err) setErr(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <button className="btn primary" onClick={submit} disabled={busy}>
              Submit
            </button>
          </div>
          <p className={'inline-err' + (err ? ' show' : '')}>
            Enter a valid repository URL (starts with https://).
          </p>
        </>
      )}
    </div>
  );
}
