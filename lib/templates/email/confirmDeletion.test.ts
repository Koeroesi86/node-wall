import { beforeEach, expect, test, vi } from 'vitest';
import getTranslation from '../../translations/getTranslation';
import confirmDeletion from './confirmDeletion';

vi.mock('../../translations/getTranslation');

beforeEach(() => {
  vi.mocked(getTranslation).mockImplementation(async (alias, language) => ({ value: `${alias}|${language}` }));
});

test('renders the code and the translated intro', async () => {
  const html = await confirmDeletion({ title: 'Delete', code: 'ABC123', language: 'hu-HU' });

  expect(html).toContain('<title>[Üzenőfal] Delete</title>');
  expect(html).toContain('ABC123');
  expect(html).toContain('email.delete.intro|hu-HU');
});

test('falls back to defaults', async () => {
  await confirmDeletion();

  expect(getTranslation).toHaveBeenCalledWith('email.delete.intro', 'en-GB');
});
