import fs from 'fs';
import path from 'path';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../utils/detectLanguage';

const ALIAS_PATTERN = /^[\w.-]+$/;
const emptyTranslation = { value: '' };

const parsePath = (alias: string, language: string) => path.resolve(__dirname, language, `${alias}.json`);

export default async (alias: string, language = DEFAULT_LANGUAGE) => {
  if (!ALIAS_PATTERN.test(alias)) {
    return emptyTranslation;
  }

  const safeLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  const file = [parsePath(alias, safeLanguage), parsePath(alias, DEFAULT_LANGUAGE)].find((candidate) => fs.existsSync(candidate));

  return file ? JSON.parse(fs.readFileSync(file, 'utf8')) : emptyTranslation;
};
