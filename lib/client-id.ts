const ID_KEY = 'bn.clientId';
const SESSION_KEY_PREFIX = 'bn.session.';

export function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function saveHostInfo(code: string, id: string, name: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${SESSION_KEY_PREFIX}${code}`, JSON.stringify({ id, name, host: true }));
}

export function saveJoinerInfo(code: string, id: string, name: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${SESSION_KEY_PREFIX}${code}`, JSON.stringify({ id, name, host: false }));
}

export function getSessionInfo(
  code: string,
): { id: string; name: string; host: boolean } | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(`${SESSION_KEY_PREFIX}${code}`);
  if (!v) return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}
