import type { RequestHeaders } from '../types';
async function detectLanguage(headers: RequestHeaders) {
  const acceptLanguage = headers['accept-language'];

  if (acceptLanguage) {
    return acceptLanguage.slice(0, 5);
  }

  return 'en-GB';
}

export default detectLanguage;
