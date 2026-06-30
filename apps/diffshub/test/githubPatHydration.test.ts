import { afterEach, describe, expect, test } from 'bun:test';

import * as githubViewer from '../components/githubViewer';

describe('GitHub PAT hydration', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    githubViewer.clearStoredGitHubPat();
    globalThis.fetch = originalFetch;
    Reflect.deleteProperty(globalThis, 'window');
  });

  test('starts from a server-safe snapshot even when localStorage has a PAT', () => {
    const storage = new Map<string, string>([
      ['diffshub.githubPat', 'github_pat_saved'],
    ]);
    Reflect.set(globalThis, 'window', {
      localStorage: createLocalStorage(storage),
    });

    expect(typeof githubViewer.getHydrationSafeGitHubPatSnapshot).toBe(
      'function'
    );
    expect(githubViewer.getHydrationSafeGitHubPatSnapshot()).toBeNull();
  });

  test('does not attach a stored website PAT to requests', async () => {
    const storage = new Map<string, string>([
      ['diffshub.githubPat', 'github_pat_saved'],
    ]);
    Reflect.set(globalThis, 'window', {
      localStorage: createLocalStorage(storage),
    });

    let requestInit: RequestInit | undefined;
    globalThis.fetch = ((_input, init) => {
      requestInit = init;
      return Promise.resolve(new Response('{}'));
    }) as typeof fetch;

    await githubViewer.githubFetch('/api/me');

    expect(new Headers(requestInit?.headers).has('Authorization')).toBe(false);
  });

  test('strips caller-provided Authorization headers from website requests', async () => {
    let requestInit: RequestInit | undefined;
    globalThis.fetch = ((_input, init) => {
      requestInit = init;
      return Promise.resolve(new Response('{}'));
    }) as typeof fetch;

    await githubViewer.githubFetch('/api/me', {
      headers: { Authorization: 'Bearer github_pat_direct' },
    });

    expect(new Headers(requestInit?.headers).has('Authorization')).toBe(false);
  });

  test('tries the extension diff bridge even when a website PAT exists', async () => {
    const storage = new Map<string, string>([
      ['diffshub.githubPat', 'github_pat_saved'],
    ]);
    const postedMessages: unknown[] = [];
    const timeouts: Array<() => void> = [];
    Reflect.set(globalThis, 'window', {
      addEventListener() {},
      clearTimeout() {},
      localStorage: createLocalStorage(storage),
      location: { origin: 'https://diffs.veraze.io' },
      postMessage(message: unknown) {
        postedMessages.push(message);
      },
      removeEventListener() {},
      setTimeout(callback: () => void) {
        timeouts.push(callback);
        return timeouts.length;
      },
    });

    let requestInit: RequestInit | undefined;
    globalThis.fetch = ((_input, init) => {
      requestInit = init;
      return Promise.resolve(new Response('fallback diff'));
    }) as typeof fetch;

    const responsePromise = githubViewer.githubFetch(
      '/api/diff?path=/owner/repo/pull/1'
    );

    expect(postedMessages).toHaveLength(1);
    timeouts[0]?.();
    const response = await responsePromise;

    expect(await response.text()).toBe('fallback diff');
    expect(new Headers(requestInit?.headers).has('Authorization')).toBe(false);
  });
});

function createLocalStorage(storage: Map<string, string>) {
  return {
    getItem(key: string): string | null {
      return storage.get(key) ?? null;
    },
    removeItem(key: string): void {
      storage.delete(key);
    },
    setItem(key: string, value: string): void {
      storage.set(key, value);
    },
  };
}
