import { afterEach, describe, expect, test } from 'bun:test';
import { NextRequest } from 'next/server';

import { GET } from '../app/api/diff/route';
import {
  decodePullRequestTitle,
  PULL_REQUEST_TITLE_HEADER,
} from '../lib/pullRequestTitleHeader';

describe('diff route PR title', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('adds the PR title to a successful diff response', async () => {
    globalThis.fetch = ((input) => {
      const url = new URL(
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input
      );
      if (url.hostname === 'api.github.com') {
        return Promise.resolve(Response.json({ title: 'Fix 中文 title ✨' }));
      }
      return Promise.resolve(
        new Response('diff --git a/a b/a', {
          headers: { 'Content-Type': 'text/plain' },
        })
      );
    }) as typeof fetch;

    const response = await GET(
      new NextRequest('http://localhost/api/diff?path=/owner/repo/pull/123')
    );

    expect(response.ok).toBe(true);
    expect(
      decodePullRequestTitle(response.headers.get(PULL_REQUEST_TITLE_HEADER))
    ).toBe('Fix 中文 title ✨');
    expect(await response.text()).toBe('diff --git a/a b/a');
  });
});
