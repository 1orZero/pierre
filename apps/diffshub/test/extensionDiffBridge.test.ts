import { afterEach, describe, expect, test } from 'bun:test';

import { fetchGitHubDiffThroughExtension } from '../components/extensionDiffBridge';

interface BridgeRequest {
  id: string;
  sourceUrl: string;
}

interface FakeWindowSetup {
  postedMessages: BridgeRequest[];
  runAckTimeout(): void;
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window');
});

describe('fetchGitHubDiffThroughExtension', () => {
  test('returns the diff from the extension bridge', async () => {
    const setup = installFakeWindow(true);

    const response = await fetchGitHubDiffThroughExtension(
      'https://github.com/owner/repo/pull/123'
    );

    expect(setup.postedMessages).toEqual([
      {
        id: expect.any(String),
        sourceUrl: 'https://github.com/owner/repo/pull/123',
      },
    ]);
    expect(await response.text()).toBe('diff --git a/a b/a');
  });

  test('fails instead of calling a server fallback when the extension is missing', async () => {
    const setup = installFakeWindow(false);
    const response = fetchGitHubDiffThroughExtension(
      'https://github.com/owner/repo/pull/123'
    );

    setup.runAckTimeout();

    let rejection: unknown;
    try {
      await response;
    } catch (error) {
      rejection = error;
    }
    expect(rejection).toEqual(
      new Error('Diffs Extension is required to load GitHub diffs.')
    );
  });
});

function installFakeWindow(respond: boolean): FakeWindowSetup {
  const listeners = new Set<(event: MessageEvent) => void>();
  const postedMessages: BridgeRequest[] = [];
  const timeoutCallbacks: Array<() => void> = [];
  const fakeWindow = {
    addEventListener(type: string, listener: (event: MessageEvent) => void) {
      if (type === 'message') listeners.add(listener);
    },
    clearTimeout() {},
    location: { origin: 'https://diffs.veraze.io' },
    postMessage(message: unknown) {
      if (typeof message !== 'object' || message == null) return;
      const request = message as BridgeRequest;
      postedMessages.push({ id: request.id, sourceUrl: request.sourceUrl });
      if (!respond) return;

      for (const listener of listeners) {
        listener({
          data: {
            body: 'diff --git a/a b/a',
            id: request.id,
            status: 200,
            tag: 'diffs-extension-v2',
            type: 'fetchDiffResult',
          },
          source: fakeWindow,
        } as unknown as MessageEvent);
      }
    },
    removeEventListener(type: string, listener: (event: MessageEvent) => void) {
      if (type === 'message') listeners.delete(listener);
    },
    setTimeout(callback: () => void) {
      timeoutCallbacks.push(callback);
      return timeoutCallbacks.length;
    },
  };
  Reflect.set(globalThis, 'window', fakeWindow);

  return {
    postedMessages,
    runAckTimeout() {
      timeoutCallbacks[0]?.();
    },
  };
}
