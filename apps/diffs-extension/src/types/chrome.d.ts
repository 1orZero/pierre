export {};

declare global {
  namespace chrome {
    namespace declarativeNetRequest {
      interface Rule {
        id: number;
        priority: number;
        action:
          | { type: 'allow' }
          | {
              type: 'redirect';
              redirect: { regexSubstitution: string };
            };
        condition: {
          regexFilter: string;
          resourceTypes: ['main_frame'];
        };
      }

      function updateDynamicRules(options: {
        addRules: Rule[];
        removeRuleIds: number[];
      }): Promise<void>;
    }

    namespace runtime {
      interface MessageSender {
        url?: string;
      }

      interface OnInstalledDetails {
        reason: string;
      }

      const onInstalled: {
        addListener(listener: (details: OnInstalledDetails) => void): void;
      };

      const onMessage: {
        addListener(
          listener: (
            message: unknown,
            sender: MessageSender,
            sendResponse: (response?: unknown) => void
          ) => boolean | undefined | void
        ): void;
      };

      function sendMessage(message: unknown): Promise<unknown>;
    }

    namespace commands {
      interface Command {
        description?: string;
        name?: string;
        shortcut?: string;
      }

      const onCommand: {
        addListener(listener: (command: string) => void): void;
      };

      function getAll(): Promise<Command[]>;
    }

    namespace tabs {
      function create(options: { url: string }): Promise<unknown>;
    }

    namespace storage {
      interface StorageArea {
        get(key: string): Promise<Record<string, unknown>>;
        set(values: Record<string, unknown>): Promise<void>;
        remove(key: string): Promise<void>;
      }

      interface StorageChange {
        newValue?: unknown;
        oldValue?: unknown;
      }

      const local: StorageArea;
      const sync: StorageArea;
      const onChanged: {
        addListener(
          listener: (
            changes: Record<string, StorageChange>,
            areaName: string
          ) => void
        ): void;
      };
    }

    namespace action {
      function setBadgeText(options: { text: string }): Promise<void>;
      function setBadgeBackgroundColor(options: {
        color: string;
      }): Promise<void>;
    }
  }
}
