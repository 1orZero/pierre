import { describe, expect, test } from 'bun:test';

import { fetchGitHubDiff, fetchGitHubPullTitle } from '../src/lib/diff-service';

describe('fetchGitHubDiff', () => {
  test('fetches the PR title with the stored PAT', async () => {
    let requestedUrl = '';
    let requestedHeaders = new Headers();

    const title = await fetchGitHubPullTitle({
      fetch: (url, init) => {
        requestedUrl =
          url instanceof Request
            ? url.url
            : url instanceof URL
              ? url.href
              : url;
        requestedHeaders = new Headers(init?.headers);
        return Promise.resolve(Response.json({ title: 'Fix 中文 title ✨' }));
      },
      sourceUrl: 'https://github.com/owner/repo/pull/123',
      token: 'github_pat_saved',
    });

    expect(requestedUrl).toBe(
      'https://api.github.com/repos/owner/repo/pulls/123'
    );
    expect(requestedHeaders.get('Accept')).toBe('application/vnd.github+json');
    expect(requestedHeaders.get('Authorization')).toBe(
      'Bearer github_pat_saved'
    );
    expect(title).toBe('Fix 中文 title ✨');
  });

  test('uses the GitHub diff API with the stored PAT', async () => {
    let requestedUrl = '';
    let requestedAuthorization = '';

    const response = await fetchGitHubDiff({
      fetch: (url, init) => {
        requestedUrl =
          url instanceof Request
            ? url.url
            : url instanceof URL
              ? url.href
              : url;
        requestedAuthorization =
          new Headers(init?.headers).get('Authorization') ?? '';
        return Promise.resolve(
          new Response('diff --git a/a b/a', {
            headers: { 'Content-Type': 'application/vnd.github.v3.diff' },
            status: 200,
          })
        );
      },
      sourceUrl: 'https://github.com/owner/repo/pull/123',
      token: 'github_pat_saved',
    });

    expect(requestedUrl).toBe(
      'https://api.github.com/repos/owner/repo/pulls/123'
    );
    expect(requestedAuthorization).toBe('Bearer github_pat_saved');
    expect(response).toEqual({
      body: 'diff --git a/a b/a',
      ok: true,
      status: 200,
    });
  });

  test('returns a 502 result when GitHub fetch fails', async () => {
    const response = await fetchGitHubDiff({
      fetch: () => Promise.reject(new Error('network down')),
      sourceUrl: 'https://github.com/owner/repo/pull/123',
      token: 'github_pat_saved',
    });

    expect(response).toEqual({
      body: 'Failed to fetch GitHub diff.',
      ok: false,
      status: 502,
    });
  });

  test('returns a 502 result when the GitHub response body cannot be read', async () => {
    const response = await fetchGitHubDiff({
      fetch: () =>
        Promise.resolve(
          new Response(
            new ReadableStream({
              start(controller) {
                controller.error(new Error('body stream failed'));
              },
            })
          )
        ),
      sourceUrl: 'https://github.com/owner/repo/pull/123',
      token: 'github_pat_saved',
    });

    expect(response).toEqual({
      body: 'Failed to read GitHub diff.',
      ok: false,
      status: 502,
    });
  });

  const TOO_LARGE_BODY = JSON.stringify({
    message:
      'Sorry, the diff exceeded the maximum number of files (300). Consider using a smaller diff.',
    errors: [{ code: 'too_large' }],
  });

  test('falls back to the web diff endpoint when the API returns 406', async () => {
    const requestedUrls: string[] = [];
    const requestedInits: (RequestInit | undefined)[] = [];
    const webDiffBody = 'diff --git a/big b/big';

    const response = await fetchGitHubDiff({
      fetch: (url, init) => {
        requestedUrls.push(
          url instanceof Request ? url.url : url instanceof URL ? url.href : url
        );
        requestedInits.push(init);
        if (requestedUrls.length === 1) {
          return Promise.resolve(new Response(TOO_LARGE_BODY, { status: 406 }));
        }
        return Promise.resolve(new Response(webDiffBody, { status: 200 }));
      },
      sourceUrl: 'https://github.com/owner/repo/pull/123',
      token: 'github_pat_saved',
    });

    expect(requestedUrls).toEqual([
      'https://api.github.com/repos/owner/repo/pulls/123',
      'https://github.com/owner/repo/pull/123.diff',
    ]);
    expect(requestedInits[1]?.credentials).toBe('include');
    expect(new Headers(requestedInits[1]?.headers).get('Authorization')).toBe(
      null
    );
    expect(response).toEqual({
      body: webDiffBody,
      ok: true,
      status: 200,
    });
  });

  test('preserves the 406 result when the web fallback returns HTML', async () => {
    let fetchCount = 0;

    const response = await fetchGitHubDiff({
      fetch: () => {
        fetchCount += 1;
        if (fetchCount === 1) {
          return Promise.resolve(new Response(TOO_LARGE_BODY, { status: 406 }));
        }
        return Promise.resolve(
          new Response('<!DOCTYPE html><html><body>Sign in</body></html>', {
            status: 200,
          })
        );
      },
      sourceUrl: 'https://github.com/owner/repo/pull/123',
      token: 'github_pat_saved',
    });

    expect(fetchCount).toBe(2);
    expect(response).toEqual({
      body: TOO_LARGE_BODY,
      ok: false,
      status: 406,
    });
  });

  test('preserves the 406 result when the web fallback fetch rejects', async () => {
    let fetchCount = 0;

    const response = await fetchGitHubDiff({
      fetch: () => {
        fetchCount += 1;
        if (fetchCount === 1) {
          return Promise.resolve(new Response(TOO_LARGE_BODY, { status: 406 }));
        }
        return Promise.reject(new Error('network down'));
      },
      sourceUrl: 'https://github.com/owner/repo/pull/123',
      token: 'github_pat_saved',
    });

    expect(fetchCount).toBe(2);
    expect(response).toEqual({
      body: TOO_LARGE_BODY,
      ok: false,
      status: 406,
    });
  });

  test('does not fall back for non-406 API errors', async () => {
    let fetchCount = 0;

    const response = await fetchGitHubDiff({
      fetch: () => {
        fetchCount += 1;
        return Promise.resolve(new Response('Not Found', { status: 404 }));
      },
      sourceUrl: 'https://github.com/owner/repo/pull/123',
      token: 'github_pat_saved',
    });

    expect(fetchCount).toBe(1);
    expect(response).toEqual({
      body: 'Not Found',
      ok: false,
      status: 404,
    });
  });
});
