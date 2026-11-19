import fs from 'fs';
import path from 'path';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../utils/detectLanguage';

const cache = new Map<string, Record<string, string>>();

const readLanguage = (language: string): Record<string, string> => {
  const directory = path.resolve(__dirname, language);

  return !fs.existsSync(directory)
    ? {}
    : Object.fromEntries(fs.readdirSync(directory)
      .filter(file => file.endsWith('.json') && !file.startsWith('email.'))
      .map(file => [file.slice(0, -'.json'.length), JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')).value]));
};

/** Every translation the pages show, of a language over the default one; the emails are not part of it. */
export default (language = DEFAULT_LANGUAGE): Record<string, string> => {
  const safeLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;

  if (!cache.has(safeLanguage)) {
    cache.set(safeLanguage, { ...readLanguage(DEFAULT_LANGUAGE), ...readLanguage(safeLanguage) });
  }

  return cache.get(safeLanguage) as Record<string, string>;
};
