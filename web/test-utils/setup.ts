import { vi } from 'vitest';

// The real Tribute needs layout and the document; the editor tests that care mock it themselves.
vi.mock('tributejs', () => ({
  default: class {
    attach() {}
    detach() {}
  },
}));
