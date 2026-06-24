// ---------------------------------------------------------------------------
// Demo-mode credential store. Each user sets their OWN password on first login,
// persisted (lightly encoded) in localStorage. This is NOT real security — it
// only gates the local demo. In live mode, Supabase Auth replaces all of this.
// ---------------------------------------------------------------------------

const KEY = "mos:auth:v1";

type Store = Record<string, string>; // emailLower -> encoded password

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}") as Store;
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* private mode */
  }
}

function encode(pw: string): string {
  try {
    return btoa(unescape(encodeURIComponent(pw)));
  } catch {
    return pw;
  }
}

const norm = (email: string) => email.trim().toLowerCase();

/** True once this user has created a password. */
export function hasPassword(email: string): boolean {
  return Boolean(read()[norm(email)]);
}

export function setPassword(email: string, pw: string) {
  const store = read();
  store[norm(email)] = encode(pw);
  write(store);
}

export function verifyPassword(email: string, pw: string): boolean {
  const stored = read()[norm(email)];
  return Boolean(stored) && stored === encode(pw);
}
