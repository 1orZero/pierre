import { describe, expect, test } from 'bun:test';

import { fetchGitHubDiff, isGitHubDiffForPath } from '../src/lib/diff-service';

test('only allows the diff matching the current viewer path', () => {
  expect(
    isGitHubDiffForPath(
      'https://github.com/owner/repo/pull/123/files',
      '/owner/repo/pull/123'
    )
  ).toBe(true);
  expect(
    isGitHubDiffForPath(
      'https://github.com/owner/private/pull/456',
      '/owner/repo/pull/123'
    )
  ).toBe(false);
});

describe('fetchGitHubDiff', () => {
  test('fetches github.com/{path}.diff with browser cookies and no PAT', async () => {
    let requestedUrl = '';
    let requestedInit: RequestInit | undefined;

    const result = await fetchGitHubDiff({
      fetch: (url, init) => {
        requestedUrl =
          url instanceof Request
            ? url.url
            : url instanceof URL
              ? url.href
              : url;
        requestedInit = init;
        return Promise.resolve(new Response('diff --git a/a b/a'));
      },
      sourceUrl: 'https://github.com/owner/repo/pull/123/files',
    });

    expect(requestedUrl).toBe('https://github.com/owner/repo/pull/123.diff');
    expect(requestedInit).toMatchObject({
      cache: 'no-store',
      credentials: 'include',
      redirect: 'follow',
    });
    expect(new Headers(requestedInit?.headers).has('Authorization')).toBe(
      false
    );
    expect(result).toEqual({ body: 'diff --git a/a b/a', status: 200 });
  });

  test('rejects unsupported URLs before fetching', async () => {
    let fetchCount = 0;
    const result = await fetchGitHubDiff({
      fetch: () => {
        fetchCount += 1;
        return Promise.resolve(new Response());
      },
      sourceUrl: 'https://example.com/owner/repo/pull/123',
    });

    expect(fetchCount).toBe(0);
    expect(result).toEqual({
      body: 'Unsupported GitHub diff URL.',
      status: 400,
    });
  });

  test('treats an HTML login page as an unauthenticated response', async () => {
    const result = await fetchGitHubDiff({
      fetch: () => Promise.resolve(new Response('<!doctype html>Sign in')),
      sourceUrl: 'https://github.com/owner/private/pull/123',
    });

    expect(result).toEqual({
      body: 'Sign in to GitHub in this browser, then try again.',
      status: 401,
    });
  });

  test('returns a controlled error when GitHub is unreachable', async () => {
    const result = await fetchGitHubDiff({
      fetch: () => Promise.reject(new Error('network down')),
      sourceUrl: 'https://github.com/owner/repo/pull/123',
    });

    expect(result).toEqual({
      body: 'Failed to fetch GitHub diff.',
      status: 502,
    });
  });
});
