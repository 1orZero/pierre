import { type ExtensionTarget, TARGET_ORIGINS } from './lib/config';
import { getExtensionStorage } from './lib/storage';

const extensionStorage = getExtensionStorage();

const enabledInput = document.getElementById('enabled') as HTMLInputElement;
const targetSelect = document.getElementById('target') as HTMLSelectElement;
const tokenInput = document.getElementById('token') as HTMLInputElement;
const saveButton = document.getElementById('save') as HTMLButtonElement;
const clearButton = document.getElementById('clear') as HTMLButtonElement;
const statusText = document.getElementById('status') as HTMLElement;

function setStatus(message: string): void {
  statusText.textContent = message;
}

async function load(): Promise<void> {
  const config = await extensionStorage.getConfig();
  enabledInput.checked = config.enabled;
  targetSelect.value = config.target;
  tokenInput.value = '';
  setStatus(
    `${config.target === 'prod' ? 'Production' : 'Local'} target: ${
      TARGET_ORIGINS[config.target]
    }`
  );
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

saveButton.addEventListener('click', () => {
  void (async () => {
    await extensionStorage.setToken(tokenInput.value);
    tokenInput.value = '';
    setStatus('PAT saved locally in the extension.');
  })();
});

clearButton.addEventListener('click', () => {
  void (async () => {
    await extensionStorage.clearToken();
    tokenInput.value = '';
    setStatus('PAT cleared.');
  })();
});

void load();
