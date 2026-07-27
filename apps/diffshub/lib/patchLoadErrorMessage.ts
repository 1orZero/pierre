export const GENERIC_PATCH_LOAD_ERROR_MESSAGE =
  'We couldn’t load that diff. Check the URL and try again.';

const TOO_LARGE_PATCH_LOAD_ERROR_MESSAGE =
  'This diff is too large for GitHub’s API (more than 300 changed files), so it can’t be loaded here. Open it on GitHub instead.';

const NOT_ACCEPTABLE_STATUS_PATTERN = /Failed to fetch patch: 406\b/;

export function getPatchLoadErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return GENERIC_PATCH_LOAD_ERROR_MESSAGE;
  }
  const { message } = error;
  if (
    message.includes('too_large') ||
    message.includes('exceeded the maximum number of files') ||
    NOT_ACCEPTABLE_STATUS_PATTERN.test(message)
  ) {
    return TOO_LARGE_PATCH_LOAD_ERROR_MESSAGE;
  }
  return GENERIC_PATCH_LOAD_ERROR_MESSAGE;
}
