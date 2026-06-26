import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isAdmin } from '@/lib/auth';
import type { SessionUser } from '@/lib/types';

const COOKIE_NAME = 'cc_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  // Fail closed in production: a missing/weak secret makes sessions forgeable.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set to a strong value (>= 16 chars) in production.');
  }
  return 'dev-insecure-session-secret-change-me';
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

function sign(payload: string): string {
  return base64url(createHmac('sha256', secret()).update(payload).digest());
}

/**
 * Build a signed cookie value: base64url(JSON.stringify({email})) + '.' + hmac.
 */
function encode(email: string): string {
  const payload = base64url(JSON.stringify({ email }));
  return `${payload}.${sign(payload)}`;
}

/**
 * Verify a signed cookie value and return the email, or null if invalid.
 */
function decode(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  const expected = sign(payload);
  // timing-safe compare of the two HMACs
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const json = JSON.parse(fromBase64url(payload).toString('utf8'));
    if (json && typeof json.email === 'string' && json.email) {
      return json.email.toLowerCase();
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Read the session email from the cookie, or null. Works in route handlers
 * and server components via next/headers cookies().
 */
export async function getSessionEmail(): Promise<string | null> {
  const store = await cookies();
  return decode(store.get(COOKIE_NAME)?.value);
}

/**
 * Set the session cookie for an email. httpOnly, sameSite lax, path '/',
 * secure in production, ~30 day maxAge.
 */
export async function setSession(email: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, encode(email.toLowerCase()), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
  });
}

/**
 * Clear the session cookie.
 */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });
}

/**
 * Resolve the current session user ({email, isAdmin}) or null.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const email = await getSessionEmail();
  if (!email) return null;
  return { email, isAdmin: isAdmin(email) };
}
