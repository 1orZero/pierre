'use client';

interface ExtensionDiffResponse {
  body: string;
  id: string;
  status: number;
  tag: typeof DIFFS_EXTENSION_BRIDGE_TAG;
  type: 'fetchDiffResult';
}

interface ExtensionDiffStarted {
  id: string;
  tag: typeof DIFFS_EXTENSION_BRIDGE_TAG;
  type: 'fetchDiffStarted';
}

const DIFFS_EXTENSION_BRIDGE_TAG = 'diffs-extension-v2';
const DIFFS_EXTENSION_ACK_TIMEOUT_MS = 250;
const EXTENSION_REQUIRED_MESSAGE =
  'Diffs Extension is required to load GitHub diffs.';

export function fetchGitHubDiffThroughExtension(
  sourceUrl: string,
  signal?: AbortSignal
): Promise<Response> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error(EXTENSION_REQUIRED_MESSAGE));
  }
  if (signal?.aborted === true) {
    return Promise.reject(new Error('Request aborted.'));
  }

  return new Promise<Response>((resolve, reject) => {
    const id = crypto.randomUUID();
    const cleanup = () => {
      window.clearTimeout(ackTimeout);
      window.removeEventListener('message', onMessage);
      signal?.removeEventListener('abort', abort);
    };
    const abort = () => {
      cleanup();
      reject(new Error('Request aborted.'));
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (isExtensionDiffStarted(event.data, id)) {
        window.clearTimeout(ackTimeout);
        return;
      }
      if (!isExtensionDiffResponse(event.data, id)) return;

      cleanup();
      resolve(
        new Response(event.data.body, {
          headers: { 'Content-Type': 'text/plain' },
          status: normalizeResponseStatus(event.data.status),
        })
      );
    };
    const ackTimeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(EXTENSION_REQUIRED_MESSAGE));
    }, DIFFS_EXTENSION_ACK_TIMEOUT_MS);

    window.addEventListener('message', onMessage);
    signal?.addEventListener('abort', abort, { once: true });
    window.postMessage(
      {
        id,
        sourceUrl,
        tag: DIFFS_EXTENSION_BRIDGE_TAG,
        type: 'fetchDiff',
      },
      window.location.origin
    );
  });
}

function normalizeResponseStatus(status: number): number {
  return Number.isInteger(status) &&
    status >= 200 &&
    status <= 599 &&
    status !== 204 &&
    status !== 205 &&
    status !== 304
    ? status
    : 500;
}

function isExtensionDiffStarted(
  value: unknown,
  id: string
): value is ExtensionDiffStarted {
  if (value == null || typeof value !== 'object') return false;
  const message = value as Partial<ExtensionDiffStarted>;
  return (
    message.tag === DIFFS_EXTENSION_BRIDGE_TAG &&
    message.type === 'fetchDiffStarted' &&
    message.id === id
  );
}

function isExtensionDiffResponse(
  value: unknown,
  id: string
): value is ExtensionDiffResponse {
  if (value == null || typeof value !== 'object') return false;
  const message = value as Partial<ExtensionDiffResponse>;
  return (
    message.tag === DIFFS_EXTENSION_BRIDGE_TAG &&
    message.type === 'fetchDiffResult' &&
    message.id === id &&
    typeof message.body === 'string' &&
    typeof message.status === 'number'
  );
}
