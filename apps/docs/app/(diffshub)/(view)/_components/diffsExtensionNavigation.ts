'use client';

import { useEffect } from 'react';

const BRIDGE_TAG = 'diffs-extension';
const STATUS_TIMEOUT_MS = 500;
const GITHUB_ORIGIN = 'https://github.com';

interface ExtensionStatusMessage {
  enabled: boolean;
  id?: string;
  tag: typeof BRIDGE_TAG;
  targetOrigin: string;
  type: 'extensionStatus' | 'extensionStatusChanged';
}

export interface DiffsExtensionNavigationInput {
  currentOrigin: string;
  currentPath: string;
  extensionTimedOut: boolean;
  initialUrl: string;
  status: Pick<ExtensionStatusMessage, 'enabled' | 'targetOrigin'> | null;
}

export function resolveDiffsExtensionNavigation({
  currentOrigin,
  currentPath,
  extensionTimedOut,
  initialUrl,
  status,
}: DiffsExtensionNavigationInput): string | null {
  if (!initialUrl.startsWith(`${GITHUB_ORIGIN}/`)) return null;

  if (status != null) {
    if (!status.enabled) return initialUrl;
    return `${status.targetOrigin}${currentPath}`;
  }

  return extensionTimedOut && isLocalOrigin(currentOrigin) ? initialUrl : null;
}

export function useDiffsExtensionNavigation(initialUrl: string): void {
  useEffect(() => {
    const id = crypto.randomUUID();
    const currentPath = () =>
      `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const navigate = (
      status: Pick<ExtensionStatusMessage, 'enabled' | 'targetOrigin'> | null,
      extensionTimedOut = false
    ) => {
      const target = resolveDiffsExtensionNavigation({
        currentOrigin: window.location.origin,
        currentPath: currentPath(),
        extensionTimedOut,
        initialUrl,
        status,
      });
      if (target != null && target !== window.location.href) {
        window.location.replace(target);
      }
    };
    const timeout = window.setTimeout(
      () => navigate(null, true),
      STATUS_TIMEOUT_MS
    );
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || !isExtensionStatusMessage(event.data)) {
        return;
      }
      if (event.data.type === 'extensionStatus' && event.data.id !== id) {
        return;
      }
      window.clearTimeout(timeout);
      navigate(event.data);
    };

    window.addEventListener('message', onMessage);
    window.postMessage(
      { id, tag: BRIDGE_TAG, type: 'getStatus' },
      window.location.origin
    );
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
    };
  }, [initialUrl]);
}

function isExtensionStatusMessage(
  value: unknown
): value is ExtensionStatusMessage {
  if (value == null || typeof value !== 'object') return false;
  const message = value as Partial<ExtensionStatusMessage>;
  return (
    message.tag === BRIDGE_TAG &&
    (message.type === 'extensionStatus' ||
      message.type === 'extensionStatusChanged') &&
    typeof message.enabled === 'boolean' &&
    typeof message.targetOrigin === 'string'
  );
}

function isLocalOrigin(origin: string): boolean {
  return (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:')
  );
}
