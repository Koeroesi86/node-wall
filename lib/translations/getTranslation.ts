import fs from 'fs';
import path from 'path';

const parsePath = (alias: string, language: string) => path.resolve(__dirname, language, `${alias}.json`);

export default async (alias: string, language = 'en-GB') => {
  let currentFile = parsePath(alias, language);

  if (fs.existsSync(currentFile)) {
    return Promise.resolve(JSON.parse(fs.readFileSync(currentFile, 'utf8')));
  }

  currentFile = parsePath(alias, 'en-GB');
  if (language !== 'en-GB' && fs.existsSync(currentFile)) {
    return Promise.resolve(JSON.parse(fs.readFileSync(currentFile, 'utf8')));
  }

  return Promise.resolve({ value: '' });
};
