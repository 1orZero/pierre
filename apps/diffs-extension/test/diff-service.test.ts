import { describe, expect, test } from 'bun:test';

import { fetchGitHubDiff } from '../src/lib/diff-service';

describe('fetchGitHubDiff', () => {
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
});
