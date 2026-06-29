'use client';

import { useEffect, useState } from 'react';

export const GITHUB_PAT_STORAGE_KEY = 'diffshub.githubPat';

export interface GitHubViewer {
  login: string;
  avatarUrl: string;
}

type GitHubPatListener = () => void;

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
  const token = getStoredGitHubPat();
  const headers = new Headers(init.headers);
  if (token != null && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
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
