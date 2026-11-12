/**
 * `img-src https:` is needed for link preview images, which point at third-party hosts.
 * The sha256 allows the one `<style>` the webcomponents polyfill injects (change it when upgrading `@webcomponents/webcomponentsjs`).
 * Google Fonts supplies the stylesheet (`style-src`) and the font files (`font-src`).
 */
export const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com 'sha256-rJJyMDPmHMZS0mPmL877gjjApxGMVa4522UDb4ctw7I='",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export default {
  'Content-Security-Policy': contentSecurityPolicy,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};
