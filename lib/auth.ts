/**
 * Lightweight mock auth for Sign in / Register.
 * No real OAuth — Google/Apple/Email resolve locally so the flow is reviewable.
 */

import { initialProfile } from '../data/account';

export type AuthProvider = 'google' | 'apple' | 'email';

export type AuthUser = {
  email: string;
  name: string;
  provider: AuthProvider;
  /** False until optional setup (airport / payment / passengers) is finished or skipped. */
  setupComplete: boolean;
};

/** Known accounts — used to detect returning vs new users. */
const REGISTERED = new Map<string, { name: string; password?: string }>([
  [
    initialProfile.email.toLowerCase(),
    { name: initialProfile.name, password: 'altitude' },
  ],
]);

let session: AuthUser | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSession(): AuthUser | null {
  return session ? { ...session } : null;
}

export function isRegisteredEmail(email: string): boolean {
  return REGISTERED.has(email.trim().toLowerCase());
}

export function signOut() {
  session = null;
  notify();
}

function finish(
  email: string,
  name: string,
  provider: AuthProvider,
  isNew: boolean,
): AuthUser {
  const user: AuthUser = {
    email: email.trim().toLowerCase(),
    name,
    provider,
    setupComplete: !isNew,
  };
  session = user;
  notify();
  return user;
}

/** Social sign-in. New emails go through setup; known emails go home. */
export async function signInWithProvider(
  provider: 'google' | 'apple',
  /** Demo email used for this provider tap. */
  emailHint?: string,
): Promise<{ user: AuthUser; isNew: boolean }> {
  await delay(480);
  const email =
    emailHint?.trim().toLowerCase() ||
    (provider === 'google' ? 'ramesh.google@gmail.com' : 'ramesh.apple@icloud.com');
  const known = REGISTERED.get(email);
  if (known) {
    return { user: finish(email, known.name, provider, false), isNew: false };
  }
  // First social login for this email — treat as register
  const name = provider === 'google' ? 'Ramesh Mandal' : 'Ramesh Mandal';
  REGISTERED.set(email, { name });
  return { user: finish(email, name, provider, true), isNew: true };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  await delay(420);
  const key = email.trim().toLowerCase();
  if (!EMAIL_RE.test(key)) return { ok: false, error: 'Enter a valid email' };
  if (!password) return { ok: false, error: 'Enter your password' };

  const known = REGISTERED.get(key);
  if (!known) {
    return {
      ok: false,
      error: 'No account for this email. Register to get started.',
    };
  }
  if (known.password && known.password !== password) {
    return { ok: false, error: 'Incorrect password' };
  }
  return { ok: true, user: finish(key, known.name, 'email', false) };
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<
  | { ok: true; user: AuthUser; isNew: true }
  | { ok: false; error: string; alreadyRegistered?: boolean }
> {
  await delay(420);
  const key = email.trim().toLowerCase();
  const trimmedName = name.trim();
  if (trimmedName.split(/\s+/).length < 2) {
    return { ok: false, error: 'Enter your full name' };
  }
  if (!EMAIL_RE.test(key)) return { ok: false, error: 'Enter a valid email' };
  if (password.length < 6) {
    return { ok: false, error: 'Use at least 6 characters for your password' };
  }
  if (REGISTERED.has(key)) {
    return {
      ok: false,
      error: 'You already have an account. Sign in instead.',
      alreadyRegistered: true,
    };
  }
  REGISTERED.set(key, { name: trimmedName, password });
  return { ok: true, user: finish(key, trimmedName, 'email', true), isNew: true };
}

export function markSetupComplete() {
  if (!session) return;
  session = { ...session, setupComplete: true };
  notify();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
