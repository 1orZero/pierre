'use client';

import { useEffect, useState } from 'react';

export const GITHUB_PAT_STORAGE_KEY = 'diffshub.githubPat';

export interface GitHubViewer {
  login: string;
  avatarUrl: string;
}

type GitHubPatListener = () => void;
interface ExtensionDiffResponse {
  body: string;
  id: string;
  ok: boolean;
  status: number;
  tag: typeof DIFFS_EXTENSION_BRIDGE_TAG;
  type: 'fetchDiffResult';
}
interface ExtensionDiffStarted {
  id: string;
  tag: typeof DIFFS_EXTENSION_BRIDGE_TAG;
  type: 'fetchDiffStarted';
}
interface ExtensionDiffUnavailable {
  id: string;
  tag: typeof DIFFS_EXTENSION_BRIDGE_TAG;
  type: 'fetchDiffUnavailable';
}

const DIFFS_EXTENSION_BRIDGE_TAG = 'diffs-extension';
const DIFFS_EXTENSION_ACK_TIMEOUT_MS = 250;
const DIFFS_EXTENSION_FETCH_TIMEOUT_MS = 60_000;
let cachedToken: string | null | undefined;
let isStorageListenerBound = false;
const tokenListeners = new Set<GitHubPatListener>();
let viewerPromise: Promise<GitHubViewer | null> | undefined;
let viewerValue: GitHubViewer | null | undefined;
let viewerToken: string | null | undefined;

function normalizeGitHubPat(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed == null || trimmed === '' ? null : trimmed;
}

function readStoredGitHubPat(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return normalizeGitHubPat(
    window.localStorage.getItem(GITHUB_PAT_STORAGE_KEY)
  );
}

function resetViewerCache(): void {
  viewerPromise = undefined;
  viewerValue = undefined;
  viewerToken = undefined;
}

function setCachedToken(token: string | null): void {
  if (cachedToken === token) {
    return;
  }
  cachedToken = token;
  resetViewerCache();
  for (const listener of tokenListeners) {
    listener();
  }
}

function ensureStorageListener(): void {
  if (typeof window === 'undefined' || isStorageListenerBound) {
    return;
  }
  isStorageListenerBound = true;
  window.addEventListener('storage', (event) => {
    if (event.key === GITHUB_PAT_STORAGE_KEY) {
      setCachedToken(normalizeGitHubPat(event.newValue));
    }
  });
}

export function getStoredGitHubPat(): string | null {
  cachedToken ??= readStoredGitHubPat();
  return cachedToken;
}

export function getHydrationSafeGitHubPatSnapshot(): string | null {
  return cachedToken ?? null;
}

export function setStoredGitHubPat(token: string): void {
  const nextToken = normalizeGitHubPat(token);
  if (typeof window !== 'undefined') {
    if (nextToken == null) {
      window.localStorage.removeItem(GITHUB_PAT_STORAGE_KEY);
    } else {
      window.localStorage.setItem(GITHUB_PAT_STORAGE_KEY, nextToken);
    }
  }
  setCachedToken(nextToken);
}

export function clearStoredGitHubPat(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(GITHUB_PAT_STORAGE_KEY);
  }
  setCachedToken(null);
}

export function subscribeGitHubPat(listener: GitHubPatListener): () => void {
  ensureStorageListener();
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
}

export function useGitHubPat(): string | null {
  const [token, setToken] = useState(getHydrationSafeGitHubPatSnapshot);
  useEffect(() => {
    const unsubscribe = subscribeGitHubPat(() => {
      setToken(getHydrationSafeGitHubPatSnapshot());
    });
    setCachedToken(readStoredGitHubPat());
    return unsubscribe;
  }, []);
  return token;
}

export function githubFetch(
  input: Parameters<typeof fetch>[0],
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.delete('Authorization');
  const extensionFetch = fetchDiffThroughExtension(input, {
    ...init,
    headers,
  });
  if (extensionFetch != null) return extensionFetch;
  return fetch(input, { ...init, headers });
}

function getExtensionDiffSourceUrl(
  input: Parameters<typeof fetch>[0]
): string | null {
  if (typeof window === 'undefined' || typeof input !== 'string') {
    return null;
  }

  let url: URL;
  try {
    url = new URL(input, window.location.origin);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin || url.pathname !== '/api/diff') {
    return null;
  }

  const sourceURL = url.searchParams.get('url');
  if (sourceURL != null && sourceURL.startsWith('https://github.com/')) {
    return sourceURL;
  }

  const domain = url.searchParams.get('domain');
  if (domain != null && domain !== '' && domain !== 'github.com') {
    return null;
  }

  const path = url.searchParams.get('path');
  if (path == null || !path.startsWith('/')) {
    return null;
  }

  return `https://github.com${path}`;
}

function fetchDiffThroughExtension(
  input: Parameters<typeof fetch>[0],
  init: RequestInit
): Promise<Response> | null {
  if (
    typeof window === 'undefined' ||
    (init.method != null && init.method.toUpperCase() !== 'GET') ||
    init.signal?.aborted === true
  ) {
    return null;
  }

  const sourceUrl = getExtensionDiffSourceUrl(input);
  if (sourceUrl == null) {
    return null;
  }

  console.info(
    '[DiffsHub] trying extension diff bridge',
    JSON.stringify({ sourceUrl })
  );

  return new Promise<Response>((resolve, reject) => {
    const id = crypto.randomUUID();
    const ackTimeout = window.setTimeout(() => {
      cleanup();
      console.info('[DiffsHub] extension bridge did not ack');
      resolve(fetch(input, init));
    }, DIFFS_EXTENSION_ACK_TIMEOUT_MS);
    const timeout = window.setTimeout(() => {
      cleanup();
      console.info('[DiffsHub] extension bridge timed out');
      reject(new Error('Diffs Extension did not respond.'));
    }, DIFFS_EXTENSION_FETCH_TIMEOUT_MS);

    const abort = () => {
      cleanup();
      console.info('[DiffsHub] extension bridge aborted');
      reject(new Error('Request aborted.'));
    };

    const cleanup = () => {
      window.clearTimeout(ackTimeout);
      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      init.signal?.removeEventListener('abort', abort);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) {
        return;
      }

      if (isExtensionDiffUnavailable(event.data, id)) {
        cleanup();
        console.info('[DiffsHub] extension bridge unavailable');
        resolve(fetch(input, init));
        return;
      }

      if (isExtensionDiffStarted(event.data, id)) {
        console.info('[DiffsHub] extension bridge acked');
        window.clearTimeout(ackTimeout);
        return;
      }

      if (!isExtensionDiffResponse(event.data, id)) {
        return;
      }

      cleanup();
      console.info(
        '[DiffsHub] extension bridge result',
        JSON.stringify({ ok: event.data.ok, status: event.data.status })
      );
      resolve(
        new Response(event.data.body, {
          headers: { 'Content-Type': 'text/plain' },
          status: normalizeExtensionResponseStatus(event.data.status),
        })
      );
    };

    window.addEventListener('message', onMessage);
    init.signal?.addEventListener('abort', abort, { once: true });
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

function normalizeExtensionResponseStatus(status: number): number {
  return Number.isInteger(status) && status >= 200 && status <= 599
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

function isExtensionDiffUnavailable(
  value: unknown,
  id: string
): value is ExtensionDiffUnavailable {
  if (value == null || typeof value !== 'object') return false;
  const message = value as Partial<ExtensionDiffUnavailable>;
  return (
    message.tag === DIFFS_EXTENSION_BRIDGE_TAG &&
    message.type === 'fetchDiffUnavailable' &&
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
    typeof message.ok === 'boolean' &&
    typeof message.status === 'number'
  );
}

function loadViewer(token: string): Promise<GitHubViewer | null> {
  if (viewerToken !== token) {
    viewerToken = token;
    viewerPromise = undefined;
    viewerValue = undefined;
  }
  if (viewerPromise != null) {
    return viewerPromise;
  }
  viewerPromise = (async () => {
    try {
      const response = await githubFetch('/api/me', { cache: 'no-store' });
      if (!response.ok) {
        viewerValue = null;
        return null;
      }
      const json = (await response.json()) as Partial<GitHubViewer>;
      if (
        typeof json.login !== 'string' ||
        typeof json.avatarUrl !== 'string'
      ) {
        viewerValue = null;
        return null;
      }
      const viewer: GitHubViewer = {
        login: json.login,
        avatarUrl: json.avatarUrl,
      };
      viewerValue = viewer;
      return viewer;
    } catch {
      viewerPromise = undefined;
      viewerValue = undefined;
      return null;
    }
  })();
  return viewerPromise;
}

// Returns the authenticated GitHub viewer once /api/me resolves, null when no
// PAT is configured / verification failed, or undefined while checking.
export function useGitHubViewer(): GitHubViewer | null | undefined {
  const token = useGitHubPat();
  const [viewer, setViewer] = useState<GitHubViewer | null | undefined>(() =>
    token != null && viewerToken === token ? viewerValue : undefined
  );
  useEffect(() => {
    if (token == null) {
      viewerToken = null;
      viewerValue = null;
      viewerPromise = undefined;
      setViewer(null);
      return;
    }
    if (viewerToken === token && viewerValue !== undefined) {
      setViewer(viewerValue);
      return;
    }
    setViewer(undefined);
    let cancelled = false;
    void loadViewer(token).then((result) => {
      if (!cancelled) {
        setViewer(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);
  return viewer;
}
