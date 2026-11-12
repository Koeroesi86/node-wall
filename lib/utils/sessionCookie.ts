import cookie from 'cookie';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SESSION_COOKIE_FLAGS = 'Path=/; Secure; HttpOnly; SameSite=Lax';

export const isSessionId = (value: unknown): value is string => typeof value === 'string' && UUID_PATTERN.test(value);

/** Parses the cookie header, dropping a `sessionId` that is not a UUID. */
export const parseCookies = (raw: string): Record<string, string | undefined> => {
  const { sessionId, ...rest } = cookie.parse(raw);
  return isSessionId(sessionId) ? { ...rest, sessionId } : rest;
};

export const buildSessionCookie = (value: string, expires: string) => `sessionId=${value}; Expires=${expires} GMT; ${SESSION_COOKIE_FLAGS}`;
