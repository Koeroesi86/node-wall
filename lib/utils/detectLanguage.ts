import type { RequestHeaders } from '../types';

export const DEFAULT_LANGUAGE = 'en-GB';
export const SUPPORTED_LANGUAGES = ['en-GB', 'hu-HU'];

async function detectLanguage(headers: RequestHeaders) {
  const language = (headers['accept-language'] || '').slice(0, 5);

  return SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
}

export default detectLanguage;
