import fs from 'fs';
import path from 'path';
import storage, { dataDirectory, types } from './index';
import createDatabase from '../../utils/createDatabase';

/** One-off: copies every legacy content file into sqlite. Safe to re-run. Usage: node dist/lib/services/storage/backfill-cli.js */
async function main() {
  const entries = await Promise.all(types.map(async type => ({
    type,
    ids: await fs.promises.readdir(path.resolve(dataDirectory, type)).catch(() => []),
  })));
  const files = entries.flatMap(({ type, ids }) => ids.map(id => ({ type, id })));
  const results = await Promise.allSettled(files.map(({ id, type }) => storage.backfill(id, type)));
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
