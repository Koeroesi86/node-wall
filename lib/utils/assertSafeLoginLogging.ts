// LOG_LOGIN_CODE writes working login links to the log, so it must never run on a public https site.
export default (env: { LOG_LOGIN_CODE?: string; SITE_PROTOCOL?: string }) => {
  if (env.LOG_LOGIN_CODE === 'true' && env.SITE_PROTOCOL === 'https') {
    throw new Error('LOG_LOGIN_CODE=true is not allowed when SITE_PROTOCOL=https.');
  }
};
