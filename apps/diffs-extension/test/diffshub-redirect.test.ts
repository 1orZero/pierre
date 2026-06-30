import { describe, expect, test } from 'bun:test';

import { decideDiffshubRedirect } from '../src/lib/diffshub-redirect';

describe('decideDiffshubRedirect', () => {
  test('returns Diffshub views to GitHub when disabled', () => {
    expect(
      decideDiffshubRedirect({
        config: { enabled: false, target: 'prod' },
        href: 'https://diffs.veraze.io/owner/repo/pull/123',
      })
    ).toBe('https://github.com/owner/repo/pull/123?diffs-extension-skip=1');
  });

  test('moves enabled Diffshub views to the configured target', () => {
    expect(
      decideDiffshubRedirect({
        config: { enabled: true, target: 'prod' },
        href: 'http://localhost:3692/owner/repo/pull/123',
      })
    ).toBe('https://diffs.veraze.io/owner/repo/pull/123');
  });

  test('does nothing when the current Diffshub origin already matches target', () => {
    expect(
      decideDiffshubRedirect({
        config: { enabled: true, target: 'prod' },
        href: 'https://diffs.veraze.io/owner/repo/pull/123',
      })
    ).toBeNull();
  });

  test('does not redirect custom domain viewer routes', () => {
    expect(
      decideDiffshubRedirect({
        config: { enabled: false, target: 'prod' },
        href: 'https://diffs.veraze.io/owner/repo/pull/123?domain=gitlab.com',
      })
    ).toBeNull();
  });
});
