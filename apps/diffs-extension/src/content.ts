import {
  type ExtensionTarget,
  SKIP_PARAM,
  STORAGE_KEYS,
  TARGET_ORIGINS,
} from './lib/config';
import { decideDiffshubRedirect } from './lib/diffshub-redirect';
import {
  BRIDGE_TAG,
  type FetchDiffResponse,
  type FetchDiffStarted,
  type FetchDiffUnavailable,
  isFetchDiffRequest,
} from './lib/messages';
import { getExtensionStorage } from './lib/storage';

const extensionStorage = getExtensionStorage();
let hasToken: boolean | undefined;

function getCurrentTarget(): ExtensionTarget {
  return location.origin === TARGET_ORIGINS.local ? 'local' : 'prod';
}

async function syncPatState(): Promise<void> {
  const target = getCurrentTarget();
  hasToken = (await extensionStorage.getToken(target)) !== '';
  console.info(
    '[Diffs Extension] PAT state',
    JSON.stringify({ hasToken, origin: location.origin, target })
  );
}

void syncPatState();

async function redirectForConfig(): Promise<void> {
  const config = await extensionStorage.getConfig();
  const target = decideDiffshubRedirect({
    config,
    href: location.href,
  });
  if (target != null && target !== location.href) {
    console.info(
      '[Diffs Extension] redirecting Diffshub target',
      JSON.stringify({
        configuredTarget: config.target,
        currentOrigin: location.origin,
        nextOrigin: new URL(target).origin,
      })
    );
    location.replace(target);
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName === 'local' &&
    (changes[STORAGE_KEYS.token] != null ||
      changes[STORAGE_KEYS.tokenProd] != null ||
      changes[STORAGE_KEYS.tokenLocal] != null)
  ) {
    void syncPatState();
  }
  if (areaName === 'sync' && changes[STORAGE_KEYS.config] != null) {
    void redirectForConfig();
  }
});

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!isFetchDiffRequest(event.data)) return;

  window.postMessage(
    {
      id: event.data.id,
      tag: BRIDGE_TAG,
      type: 'fetchDiffStarted',
    } satisfies FetchDiffStarted,
    window.location.origin
  );

  void (async () => {
    if (hasToken === undefined) {
      await syncPatState();
    }

    console.info(
      '[Diffs Extension] bridge request',
      JSON.stringify({
        hasToken,
        sourceUrl: event.data.sourceUrl,
        target: getCurrentTarget(),
      })
    );

    if (hasToken !== true) {
      console.info(
        '[Diffs Extension] bridge unavailable',
        JSON.stringify({ target: getCurrentTarget() })
      );
      window.postMessage(
        {
          id: event.data.id,
          tag: BRIDGE_TAG,
          type: 'fetchDiffUnavailable',
        } satisfies FetchDiffUnavailable,
        window.location.origin
      );
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'fetchDiff',
        sourceUrl: event.data.sourceUrl,
      });
      const result = response as Pick<
        FetchDiffResponse,
        'body' | 'ok' | 'status'
      >;
      window.postMessage(
        {
          body: typeof result.body === 'string' ? result.body : '',
          id: event.data.id,
          ok: result.ok === true,
          status: typeof result.status === 'number' ? result.status : 500,
          tag: BRIDGE_TAG,
          type: 'fetchDiffResult',
        } satisfies FetchDiffResponse,
        window.location.origin
      );
      console.info(
        '[Diffs Extension] bridge result',
        JSON.stringify({
          ok: result.ok === true,
          status: typeof result.status === 'number' ? result.status : 500,
          target: getCurrentTarget(),
        })
      );
    } catch {
      console.info(
        '[Diffs Extension] bridge failed',
        JSON.stringify({ target: getCurrentTarget() })
      );
      window.postMessage(
        {
          body: 'Diffs Extension failed to fetch this diff.',
          id: event.data.id,
          ok: false,
          status: 502,
          tag: BRIDGE_TAG,
          type: 'fetchDiffResult',
        } satisfies FetchDiffResponse,
        window.location.origin
      );
    }
  })();
});

function addSkipParam(href: string): string {
  try {
    const url = new URL(href);
    url.searchParams.set(SKIP_PARAM, '1');
    return url.href;
  } catch {
    return href;
  }
}

function markClickedGitHubLink(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const anchor = target.closest<HTMLAnchorElement>(
    'a[href^="https://github.com/"]'
  );
  if (anchor == null) return;

  anchor.href = addSkipParam(anchor.href);
}

window.addEventListener('click', markClickedGitHubLink, true);
window.addEventListener('auxclick', markClickedGitHubLink, true);
void redirectForConfig();
