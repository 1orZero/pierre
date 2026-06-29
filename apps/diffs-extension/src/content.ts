import { SKIP_PARAM, STORAGE_KEYS } from './lib/config';
import {
  BRIDGE_TAG,
  type FetchDiffResponse,
  type FetchDiffStarted,
  type FetchDiffUnavailable,
  isFetchDiffRequest,
} from './lib/messages';

let hasToken: boolean | undefined;

async function syncPatState(): Promise<void> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.token);
  const token = data[STORAGE_KEYS.token];
  hasToken = typeof token === 'string' && token.trim() !== '';
}

void syncPatState();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STORAGE_KEYS.token] != null) {
    void syncPatState();
  }
});

window.addEventListener('message', (event) => {
  if (event.source !== window || !isFetchDiffRequest(event.data)) return;

  void (async () => {
    if (hasToken === undefined) {
      await syncPatState();
    }

    if (hasToken !== true) {
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

    window.postMessage(
      {
        id: event.data.id,
        tag: BRIDGE_TAG,
        type: 'fetchDiffStarted',
      } satisfies FetchDiffStarted,
      window.location.origin
    );

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
    } catch {
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
