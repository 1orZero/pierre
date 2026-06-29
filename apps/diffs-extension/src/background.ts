import { STORAGE_KEYS } from './lib/config';
import { fetchGitHubDiff } from './lib/diff-service';
import { buildDynamicRules, RULE_IDS } from './lib/rules';
import { getExtensionStorage, toggleEnabled } from './lib/storage';

const extensionStorage = getExtensionStorage();

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

chrome.runtime.onInstalled.addListener(() => {
  void syncRules();
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    message == null ||
    typeof message !== 'object' ||
    (message as { type?: unknown }).type !== 'fetchDiff' ||
    typeof (message as { sourceUrl?: unknown }).sourceUrl !== 'string'
  ) {
    return undefined;
  }

  void (async () => {
    const token = await extensionStorage.getToken();
    const result = await fetchGitHubDiff({
      fetch: fetch.bind(globalThis),
      sourceUrl: (message as { sourceUrl: string }).sourceUrl,
      token,
    });
    sendResponse(result);
  })();
  return true;
});
