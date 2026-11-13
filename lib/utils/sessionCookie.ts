import cookie from 'cookie';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Secure unless the site is explicitly served over plain http (local dev), where browsers like Safari drop Secure cookies. */
export const getSessionCookieFlags = () => `Path=/; ${process.env.SITE_PROTOCOL === 'http' ? '' : 'Secure; '}HttpOnly; SameSite=Lax`;

export const isSessionId = (value: unknown): value is string => typeof value === 'string' && UUID_PATTERN.test(value);

/** Parses the cookie header, dropping a `sessionId` that is not a UUID. */
export const parseCookies = (raw: string): Record<string, string | undefined> => {
  const { sessionId, ...rest } = cookie.parse(raw);
  return isSessionId(sessionId) ? { ...rest, sessionId } : rest;
};

export const buildSessionCookie = (value: string, expires: string) => `sessionId=${value}; Expires=${expires} GMT; ${getSessionCookieFlags()}`;
