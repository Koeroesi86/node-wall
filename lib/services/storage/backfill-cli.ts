import fs from 'fs';
import path from 'path';
import storage, { dataDirectory, types } from './index';
import sessionService from '../session';
import dotenv from 'dotenv';
import createDatabase from '../../utils/createDatabase';
import getEnvPath from '../../utils/getEnvPath';

type SessionDetails = { userAgent?: string; remoteAddress?: string };

const list = (type: string) => fs.promises.readdir(path.resolve(dataDirectory, type)).catch(() => []);

const backfillSession = async (id: string) => {
  const details: SessionDetails = JSON.parse(await fs.promises.readFile(path.resolve(dataDirectory, 'session', id), 'utf8'));

  await sessionService.setDetails(id, details.userAgent, details.remoteAddress);
};

/**
 * One-off: copies legacy content files into sqlite (content into `contents`, session details into `users_session`).
 * Safe to re-run, never overwrites existing data. Run by deploy/pre-activate.sh from the release directory: node lib/services/storage/backfill-cli.js
 */
async function main() {
  dotenv.config({ path: getEnvPath() });

  const contentFiles = (await Promise.all(types.map(async type => (await list(type)).map(id => ({ type, id }))))).flat();
  const sessionFiles = (await list('session')).map(id => ({ type: 'session', id }));
  const files = [...contentFiles, ...sessionFiles];
  const results = await Promise.allSettled(files.map(({ id, type }) => (
    type === 'session' ? backfillSession(id) : storage.backfill(id, type)
  )));
  const failed = results.flatMap((result, index) => (result.status === 'rejected' ? [files[index]] : []));

  console.log(`backfilled ${files.length - failed.length}/${files.length} files`);
  failed.forEach(({ type, id }) => console.error(`failed: ${type}/${id}`));
  await (await createDatabase()).destroy();
  process.exitCode = failed.length > 0 ? 1 : 0;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
