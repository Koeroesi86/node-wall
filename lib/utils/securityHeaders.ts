export const contentSecurityPolicy = "script-src 'self'; object-src 'none'; base-uri 'self'";

export default {
  'Content-Security-Policy': contentSecurityPolicy,
  'X-Content-Type-Options': 'nosniff',
};
