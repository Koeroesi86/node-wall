import { beforeEach, expect, test, vi } from 'vitest';
import getTranslation from '../../translations/getTranslation';
import verifyLogin from './verifyLogin';

vi.mock('../../translations/getTranslation');

beforeEach(() => {
  vi.mocked(getTranslation).mockImplementation(async (alias, language) => ({ value: `${alias}|${language}|%ACTIVATION_URL%` }));
});

test('renders the code, urls and translations', async () => {
  const html = await verifyLogin({
    verifyUrl: 'https://x/verify',
    activateUrl: 'https://x/activate',
    title: 'Login',
    code: 'ABC123',
    language: 'hu-HU',
  });

  expect(html).toContain('<title>[Üzenőfal] Login</title>');
  expect(html).toContain('ABC123');
  expect(html).toContain('email.verify.intro|hu-HU|https://x/activate');
  expect(html).toContain('email.verify.alternative|hu-HU|%ACTIVATION_URL%');
  expect(html).toContain('<a target="_blank" href="https://x/verify">');
});

test('falls back to defaults', async () => {
  const html = await verifyLogin();

  expect(html).toContain('<title>Üzenőfal</title>');
  expect(getTranslation).toHaveBeenCalledWith('email.verify.intro', 'en-GB');
});
