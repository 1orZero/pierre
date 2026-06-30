import { type ExtensionTarget, TARGET_ORIGINS } from './lib/config';
import { getExtensionStorage } from './lib/storage';

const extensionStorage = getExtensionStorage();

const enabledInput = document.getElementById('enabled') as HTMLInputElement;
const targetSelect = document.getElementById('target') as HTMLSelectElement;
const prodTokenInput = document.getElementById(
  'prod-token'
) as HTMLInputElement;
const prodTokenDisplay = document.getElementById(
  'prod-token-display'
) as HTMLElement;
const prodSaveButton = document.getElementById(
  'prod-save'
) as HTMLButtonElement;
const prodClearButton = document.getElementById(
  'prod-clear'
) as HTMLButtonElement;
const localTokenInput = document.getElementById(
  'local-token'
) as HTMLInputElement;
const localTokenDisplay = document.getElementById(
  'local-token-display'
) as HTMLElement;
const localSaveButton = document.getElementById(
  'local-save'
) as HTMLButtonElement;
const localClearButton = document.getElementById(
  'local-clear'
) as HTMLButtonElement;
const shortcutButton = document.getElementById('shortcut') as HTMLButtonElement;
const statusText = document.getElementById('status') as HTMLElement;
const shortcutStatusText = document.getElementById(
  'shortcut-status'
) as HTMLElement;

function setStatus(message: string): void {
  statusText.textContent = message;
}

function renderToken(display: HTMLElement, token: string): void {
  display.textContent = token === '' ? 'Not saved' : token;
}

async function load(): Promise<void> {
  const config = await extensionStorage.getConfig();
  const prodToken = await extensionStorage.getToken('prod');
  const localToken = await extensionStorage.getToken('local');
  const commands = await chrome.commands.getAll();
  const toggleCommand = commands.find(
    (command) => command.name === 'toggle-enabled'
  );
  enabledInput.checked = config.enabled;
  targetSelect.value = config.target;
  prodTokenInput.value = '';
  localTokenInput.value = '';
  renderToken(prodTokenDisplay, prodToken);
  renderToken(localTokenDisplay, localToken);
  setStatus(
    `${config.target === 'prod' ? 'Production' : 'Local'} target: ${
      TARGET_ORIGINS[config.target]
    }`
  );
  shortcutStatusText.textContent = toggleCommand?.shortcut
    ? `Shortcut: ${toggleCommand.shortcut}`
    : 'Shortcut not set.';
}

enabledInput.addEventListener('change', () => {
  void (async () => {
    const config = await extensionStorage.getConfig();
    await extensionStorage.setConfig({
      ...config,
      enabled: enabledInput.checked,
    });
    setStatus(
      enabledInput.checked ? 'Redirect enabled.' : 'Redirect disabled.'
    );
  })();
});

targetSelect.addEventListener('change', () => {
  void (async () => {
    const target = targetSelect.value === 'local' ? 'local' : 'prod';
    const config = await extensionStorage.getConfig();
    await extensionStorage.setConfig({
      ...config,
      target: target satisfies ExtensionTarget,
    });
    setStatus(`Target: ${TARGET_ORIGINS[target]}`);
  })();
});

prodSaveButton.addEventListener('click', () => {
  void (async () => {
    await extensionStorage.setToken('prod', prodTokenInput.value);
    prodTokenInput.value = '';
    renderToken(prodTokenDisplay, await extensionStorage.getToken('prod'));
    setStatus('Production PAT saved locally in the extension.');
  })();
});

prodClearButton.addEventListener('click', () => {
  void (async () => {
    await extensionStorage.clearToken('prod');
    prodTokenInput.value = '';
    renderToken(prodTokenDisplay, await extensionStorage.getToken('prod'));
    setStatus('Production PAT cleared.');
  })();
});

localSaveButton.addEventListener('click', () => {
  void (async () => {
    await extensionStorage.setToken('local', localTokenInput.value);
    localTokenInput.value = '';
    renderToken(localTokenDisplay, await extensionStorage.getToken('local'));
    setStatus('Dev PAT saved locally in the extension.');
  })();
});

localClearButton.addEventListener('click', () => {
  void (async () => {
    await extensionStorage.clearToken('local');
    localTokenInput.value = '';
    renderToken(localTokenDisplay, await extensionStorage.getToken('local'));
    setStatus('Dev PAT cleared.');
  })();
});

shortcutButton.addEventListener('click', () => {
  void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

void load();
