import { SKIP_PARAM, STORAGE_KEYS } from './lib/config';
import { decideDiffshubRedirect } from './lib/diffshub-redirect';
import {
  BRIDGE_TAG,
  type FetchDiffResponse,
  type FetchDiffStarted,
  isFetchDiffRequest,
} from './lib/messages';
import { getExtensionStorage } from './lib/storage';

const extensionStorage = getExtensionStorage();

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
        currentOrigin: location.origin,
        nextOrigin: new URL(target).origin,
      })
    );
    location.replace(target);
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
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
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'fetchDiff',
        sourceUrl: event.data.sourceUrl,
      });
      const result = response as {
        body?: unknown;
        status?: unknown;
        titleHtml?: unknown;
      };
      const title = decodeGitHubTitle(result.titleHtml);
      if (title != null) {
        document.title = `[Diffshub] ${title}`;
      }
      window.postMessage(
        {
          body: typeof result.body === 'string' ? result.body : '',
          id: event.data.id,
          status: typeof result.status === 'number' ? result.status : 500,
          tag: BRIDGE_TAG,
          type: 'fetchDiffResult',
        } satisfies FetchDiffResponse,
        window.location.origin
      );
      console.info(
        '[Diffs Extension] bridge result',
        JSON.stringify({
          status: typeof result.status === 'number' ? result.status : 500,
        })
      );
    } catch {
      console.info('[Diffs Extension] bridge failed');
      window.postMessage(
        {
          body: 'Diffs Extension failed to fetch this diff.',
          id: event.data.id,
          status: 502,
          tag: BRIDGE_TAG,
          type: 'fetchDiffResult',
        } satisfies FetchDiffResponse,
        window.location.origin
      );
    }
  })();
});

function decodeGitHubTitle(titleHtml: unknown): string | undefined {
  if (typeof titleHtml !== 'string') return undefined;
  const title = new DOMParser().parseFromString(
    `<title>${titleHtml}</title>`,
    'text/html'
  ).title;
  return title === '' ? undefined : title;
}

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
