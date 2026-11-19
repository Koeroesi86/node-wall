/**
 * Whether an `Origin` header names this site. A request without one is not from a browser page.
 * Over plain http (development) the port may differ, since the site is reached on the port of the dev
 * server while `SITE_DOMAIN` is the bare host name the server routes by.
 */
const isSameOrigin = (origin: string | undefined, protocol = process.env.SITE_PROTOCOL, domain = process.env.SITE_DOMAIN) => {
  if (origin === undefined || origin === `${protocol}://${domain}`) return true;
  if (protocol !== 'http') return false;

  try {
    const { protocol: originProtocol, hostname } = new URL(origin);

    return originProtocol === 'http:' && hostname === domain;
  } catch {
    return false;
  }
};

export default isSameOrigin;
