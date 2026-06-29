import { describe, expect, test } from 'bun:test';

import { decideGitHubRedirect } from '../src/lib/github-redirect';

describe('decideGitHubRedirect', () => {
  test('redirects GitHub PR changes tabs to the configured target', () => {
    expect(
      decideGitHubRedirect({
        config: { enabled: true, target: 'prod' },
        escapeActive: false,
        href: 'https://github.com/exploratortech/chat-everywhere-v2/pull/882/changes',
        viaHistory: false,
      })
    ).toBe(
      'https://diffs.veraze.io/exploratortech/chat-everywhere-v2/pull/882'
    );
  });

  test('does not redirect when the extension is disabled', () => {
    expect(
      decideGitHubRedirect({
        config: { enabled: false, target: 'prod' },
        escapeActive: false,
        href: 'https://github.com/exploratortech/chat-everywhere-v2/pull/882/changes',
        viaHistory: false,
      })
    ).toBeNull();
  });

  test('does not redirect when the tab has escaped back to GitHub', () => {
    expect(
      decideGitHubRedirect({
        config: { enabled: true, target: 'prod' },
        escapeActive: true,
        href: 'https://github.com/exploratortech/chat-everywhere-v2/pull/882/changes',
        viaHistory: false,
      })
    ).toBeNull();
  });

  test('does not redirect browser history navigation', () => {
    expect(
      decideGitHubRedirect({
        config: { enabled: true, target: 'prod' },
        escapeActive: false,
        href: 'https://github.com/exploratortech/chat-everywhere-v2/pull/882/changes',
        viaHistory: true,
      })
    ).toBeNull();
  });
});
