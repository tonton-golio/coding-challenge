'use client';

import { useEffect, useState } from 'react';

// Circumference of the progress ring: 2 * pi * r, with r = 22 (matches the
// prototype's stroke-dasharray="138.2").
const RING_C = 138.2;

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const sec = t % 60;
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

function remaining(startedAt: number, total: number): number {
  return Math.max(0, total - Math.floor((Date.now() - startedAt) / 1000));
}

// Sticky live header (challenge title + countdown ring) and the "Time's up"
// note below it. Amber under 10:00, red under 2:00. Ticks every second off the
// wall clock so a refresh stays accurate. Owns both regions so the warn/crit/
// ended state stays in one reactive unit; the page renders it where the
// prototype places .live-head + .ended.
export default function Timer({
  startedAt,
  total,
  title,
}: {
  startedAt: number;
  total: number;
  title: string;
}) {
  // Start from `total` for a stable server/client first paint, then correct on
  // mount so SSR markup matches the initial client render.
  const [r, setR] = useState(total);

  useEffect(() => {
    setR(remaining(startedAt, total));
    const id = setInterval(() => {
      const next = remaining(startedAt, total);
      setR(next);
      if (next <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt, total]);

  const warn = r <= 600 && r > 120;
  const crit = r <= 120;
  const ended = r <= 0;

  const ringCls = 'ring' + (warn ? ' warn' : '') + (crit ? ' crit' : '');
  const clockCls = 'clock' + (warn ? ' warn' : '') + (crit ? ' crit' : '');
  const offset = (RING_C * (1 - r / total)).toFixed(2);

  return (
    <>
      <div className="live-head">
        <div className="who">
          <div className="k">Your challenge</div>
          <div className="v">{title}</div>
        </div>
        <div className="timer">
          <div className={ringCls}>
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle className="track" cx="26" cy="26" r="22" fill="none" strokeWidth="4" />
              <circle
                className="prog"
                cx="26"
                cy="26"
                r="22"
                fill="none"
                strokeWidth="4"
                strokeDasharray="138.2"
                strokeDashoffset={offset}
              />
            </svg>
          </div>
          <div className={clockCls}>
            <span className="t nums">{fmt(r)}</span>
            <span className="lab">remaining</span>
          </div>
        </div>
      </div>
      <p className={'ended' + (ended ? ' show' : '')}>
        <b>Time&rsquo;s up.</b> Your repository link needs to already be saved.
      </p>
    </>
  );
}
