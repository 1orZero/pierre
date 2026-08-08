import { describe, expect, test } from 'bun:test';

import { decideDiffshubRedirect } from '../src/lib/diffshub-redirect';

describe('decideDiffshubRedirect', () => {
  test('returns Diffshub views to GitHub when disabled', () => {
    expect(
      decideDiffshubRedirect({
        config: { enabled: false },
        href: 'https://diffs.veraze.io/owner/repo/pull/123',
      })
    ).toBe('https://github.com/owner/repo/pull/123?diffs-extension-skip=1');
  });

  test('does nothing while enabled', () => {
    expect(
      decideDiffshubRedirect({
        config: { enabled: true },
        href: 'https://diffs.veraze.io/owner/repo/pull/123',
      })
    ).toBeNull();
  });

  test('ignores the removed alternate-domain query', () => {
    expect(
      decideDiffshubRedirect({
        config: { enabled: false },
        href: 'https://diffs.veraze.io/owner/repo/pull/123?domain=gitlab.com',
      })
    ).toBe('https://github.com/owner/repo/pull/123?diffs-extension-skip=1');
  });
});
