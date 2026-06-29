import { describe, expect, test } from 'bun:test';

import { resolveDiffsExtensionNavigation } from '../app/(diffshub)/(view)/_components/diffsExtensionNavigation';

const githubUrl = 'https://github.com/owner/repo/pull/123';

describe('resolveDiffsExtensionNavigation', () => {
  test('redirects enabled extension views to its target origin', () => {
    expect(
      resolveDiffsExtensionNavigation({
        currentOrigin: 'http://localhost:3692',
        currentPath: '/owner/repo/pull/123',
        extensionTimedOut: false,
        initialUrl: githubUrl,
        status: {
          enabled: true,
          targetOrigin: 'https://diffs.veraze.io',
        },
      })
    ).toBe('https://diffs.veraze.io/owner/repo/pull/123');
  });

  test('redirects disabled extension views back to GitHub', () => {
    expect(
      resolveDiffsExtensionNavigation({
        currentOrigin: 'https://diffs.veraze.io',
        currentPath: '/owner/repo/pull/123',
        extensionTimedOut: false,
        initialUrl: githubUrl,
        status: {
          enabled: false,
          targetOrigin: 'https://diffs.veraze.io',
        },
      })
    ).toBe(githubUrl);
  });

  test('redirects local views back to GitHub when the extension is missing', () => {
    expect(
      resolveDiffsExtensionNavigation({
        currentOrigin: 'http://localhost:3692',
        currentPath: '/owner/repo/pull/123',
        extensionTimedOut: true,
        initialUrl: githubUrl,
        status: null,
      })
    ).toBe(githubUrl);
  });

  test('keeps production usable when the extension is missing', () => {
    expect(
      resolveDiffsExtensionNavigation({
        currentOrigin: 'https://diffs.veraze.io',
        currentPath: '/owner/repo/pull/123',
        extensionTimedOut: true,
        initialUrl: githubUrl,
        status: null,
      })
    ).toBeNull();
  });
});
