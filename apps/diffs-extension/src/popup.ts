import { getExtensionStorage } from './lib/storage';

const extensionStorage = getExtensionStorage();

const enabledInput = document.getElementById('enabled') as HTMLInputElement;
const shortcutButton = document.getElementById('shortcut') as HTMLButtonElement;
const statusText = document.getElementById('status') as HTMLElement;
const shortcutStatusText = document.getElementById(
  'shortcut-status'
) as HTMLElement;

function setStatus(message: string): void {
  statusText.textContent = message;
}

async function load(): Promise<void> {
  const config = await extensionStorage.getConfig();
  const commands = await chrome.commands.getAll();
  const toggleCommand = commands.find(
    (command) => command.name === 'toggle-enabled'
  );
  enabledInput.checked = config.enabled;
  setStatus(config.enabled ? 'Redirect enabled.' : 'Redirect disabled.');
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

shortcutButton.addEventListener('click', () => {
  void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

void load();
