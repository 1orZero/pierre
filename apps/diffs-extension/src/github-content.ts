import { SKIP_PARAM } from './lib/config';
import { decideGitHubRedirect } from './lib/github-redirect';
import { getExtensionStorage } from './lib/storage';

const SKIP_FLAG = 'diffs-extension.githubSkip';
const extensionStorage = getExtensionStorage();

let lastHref = location.href;

function extensionAlive(): boolean {
  try {
    return typeof chrome.runtime.sendMessage === 'function';
  } catch {
    return false;
  }
}

function escapeActive(): boolean {
  const url = new URL(location.href);
  if (url.searchParams.has(SKIP_PARAM)) {
    try {
      sessionStorage.setItem(SKIP_FLAG, '1');
    } catch {
      // The query marker still skips this navigation if sessionStorage is unavailable.
    }

    url.searchParams.delete(SKIP_PARAM);
    try {
      history.replaceState(history.state, '', url.toString());
      lastHref = location.href;
    } catch {
      // Keep the original URL if the browser rejects history replacement.
    }
    return true;
  }

  try {
    return sessionStorage.getItem(SKIP_FLAG) === '1';
  } catch {
    return false;
  }
}

function clearEscape(): void {
  try {
    sessionStorage.removeItem(SKIP_FLAG);
  } catch {
    // The next explicit toggle still redirects if sessionStorage is unavailable.
  }
}

function loadedViaBackForward(): boolean {
  try {
    const [navigation] = performance.getEntriesByType(
      'navigation'
    ) as PerformanceNavigationTiming[];
    return navigation?.type === 'back_forward';
  } catch {
    return false;
  }
}

async function redirectIfDiff(viaHistory: boolean): Promise<void> {
  if (!extensionAlive()) return;

  const isEscaped = escapeActive();
  let config;
  try {
    config = await extensionStorage.getConfig();
  } catch {
    return;
  }

  const target = decideGitHubRedirect({
    config,
    escapeActive: isEscaped,
    href: location.href,
    viaHistory,
  });
  if (target != null) {
    location.replace(target);
  }
}

function onPossibleNavigation(viaHistory: boolean): void {
  if (location.href === lastHref) return;
  lastHref = location.href;
  void redirectIfDiff(viaHistory);
}

chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName !== 'sync') return;
  clearEscape();
  void redirectIfDiff(false);
});

for (const eventName of ['turbo:load', 'turbo:render', 'pjax:end']) {
  window.addEventListener(eventName, () => onPossibleNavigation(false), true);
}

window.addEventListener('popstate', () => onPossibleNavigation(true), true);

new MutationObserver(() => onPossibleNavigation(false)).observe(document, {
  childList: true,
  subtree: true,
});

void redirectIfDiff(loadedViaBackForward());
