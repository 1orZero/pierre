import { normalizeGitHubPath } from './url';

const GITHUB_HOST = 'github.com';

export interface FetchGitHubDiffOptions {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  sourceUrl: string;
}

export interface FetchGitHubDiffResult {
  body: string;
  status: number;
}

function getGitHubDiffUrl(sourceUrl: string): string | undefined {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return undefined;
  }

  if (parsedUrl.hostname !== GITHUB_HOST) return undefined;

  const path = normalizeGitHubPath(parsedUrl.pathname);
  return path == null ? undefined : `https://${GITHUB_HOST}${path}.diff`;
}

export function isGitHubDiffForPath(
  sourceUrl: string,
  pagePath: string
): boolean {
  const path = normalizeGitHubPath(pagePath);
  return (
    path != null &&
    getGitHubDiffUrl(sourceUrl) === `https://${GITHUB_HOST}${path}.diff`
  );
}

export async function fetchGitHubDiff(
  options: FetchGitHubDiffOptions
): Promise<FetchGitHubDiffResult> {
  const diffUrl = getGitHubDiffUrl(options.sourceUrl);
  if (diffUrl == null) {
    return { body: 'Unsupported GitHub diff URL.', status: 400 };
  }

  let response: Response;
  try {
    response = await options.fetch(diffUrl, {
      cache: 'no-store',
      credentials: 'include',
      redirect: 'follow',
    });
  } catch {
    return { body: 'Failed to fetch GitHub diff.', status: 502 };
  }

  if (!response.ok) {
    return {
      body: `GitHub returned ${response.status} for this diff.`,
      status: response.status,
    };
  }

  let body: string;
  try {
    // ponytail: this buffers one runtime message; use Port streaming if real
    // diffs exceed Chrome's message-size limit.
    body = await response.text();
  } catch {
    return { body: 'Failed to read GitHub diff.', status: 502 };
  }

  if (body !== '' && !body.startsWith('diff --git')) {
    return {
      body: 'Sign in to GitHub in this browser, then try again.',
      status: 401,
    };
  }

  return { body, status: 200 };
}
