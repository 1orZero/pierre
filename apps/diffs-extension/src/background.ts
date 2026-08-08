import { DIFFSHUB_ORIGIN, STORAGE_KEYS } from './lib/config';
import { fetchGitHubDiff, isGitHubDiffForPath } from './lib/diff-service';
import { buildDynamicRules, RULE_IDS } from './lib/rules';
import { getExtensionStorage, toggleEnabled } from './lib/storage';

const extensionStorage = getExtensionStorage();
const LEGACY_PAT_STORAGE_KEYS = [
  'diffs-extension.githubPat',
  'diffs-extension.githubPat.local',
  'diffs-extension.githubPat.prod',
] as const;

async function syncRules(): Promise<void> {
  const config = await extensionStorage.getConfig();
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: buildDynamicRules(config),
    removeRuleIds: RULE_IDS,
  });
  await updateBadge(config.enabled);
}

async function updateBadge(enabled: boolean): Promise<void> {
  await chrome.action.setBadgeText({ text: enabled ? '' : 'off' });
  if (!enabled) {
    await chrome.action.setBadgeBackgroundColor({ color: '#666666' });
  }
}

function isAllowedRequest(
  sender: chrome.runtime.MessageSender,
  sourceUrl: string
): boolean {
  try {
    const senderUrl = new URL(sender.url ?? '');
    return (
      senderUrl.origin === DIFFSHUB_ORIGIN &&
      isGitHubDiffForPath(sourceUrl, senderUrl.pathname)
    );
  } catch {
    return false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void syncRules();
  for (const key of LEGACY_PAT_STORAGE_KEYS) {
    void chrome.storage.local.remove(key);
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes[STORAGE_KEYS.config] != null) {
    void syncRules();
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-enabled') return;
  void toggleEnabled(extensionStorage).then(() => syncRules());
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const sourceUrl = (message as { sourceUrl?: unknown } | null)?.sourceUrl;
  if (
    message == null ||
    typeof message !== 'object' ||
    (message as { type?: unknown }).type !== 'fetchDiff' ||
    typeof sourceUrl !== 'string' ||
    !isAllowedRequest(sender, sourceUrl)
  ) {
    return undefined;
  }

  void (async () => {
    const result = await fetchGitHubDiff({
      fetch: fetch.bind(globalThis),
      sourceUrl,
    });
    console.info(
      '[Diffs Extension] fetchDiff result',
      JSON.stringify({ status: result.status })
    );
    sendResponse(result);
  })();
  return true;
});
