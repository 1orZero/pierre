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
  test('returns the original GitHub page title with the diff', async () => {
    const requestedUrls: string[] = [];
    const title =
      'feat(import): add photo upload button to desktop import-grade landing by 1orZero · Pull Request #99 · exploratortech/DotDotGrow';

    const result = await fetchGitHubDiff({
      fetch: (url) => {
        const requestedUrl =
          url instanceof Request
            ? url.url
            : url instanceof URL
              ? url.href
              : url;
        requestedUrls.push(requestedUrl);
        return Promise.resolve(
          new Response(
            requestedUrl.endsWith('.diff')
              ? 'diff --git a/a b/a'
              : `<title>${title}</title>`
          )
        );
      },
      sourceUrl: 'https://github.com/exploratortech/DotDotGrow/pull/99',
    });

    expect(requestedUrls).toContain(
      'https://github.com/exploratortech/DotDotGrow/pull/99'
    );
    expect(result).toEqual({
      body: 'diff --git a/a b/a',
      status: 200,
      titleHtml: title,
    });
  });

  test('fetches github.com/{path}.diff with browser cookies and no PAT', async () => {
    let requestedUrl = '';
    let requestedInit: RequestInit | undefined;

    const result = await fetchGitHubDiff({
      fetch: (url, init) => {
        const urlString =
          url instanceof Request
            ? url.url
            : url instanceof URL
              ? url.href
              : url;
        if (!urlString.endsWith('.diff')) {
          return Promise.resolve(new Response('<title>Example PR</title>'));
        }
        requestedUrl = urlString;
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
    expect(result).toEqual({
      body: 'diff --git a/a b/a',
      status: 200,
      titleHtml: 'Example PR',
    });
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
