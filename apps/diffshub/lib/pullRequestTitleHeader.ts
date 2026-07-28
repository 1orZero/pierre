export const PULL_REQUEST_TITLE_HEADER = 'X-DiffsHub-Pull-Request-Title';

export function encodePullRequestTitle(title: string): string {
  return encodeURIComponent(title);
}

export function decodePullRequestTitle(value: string | null): string | null {
  if (value == null) return null;

  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
