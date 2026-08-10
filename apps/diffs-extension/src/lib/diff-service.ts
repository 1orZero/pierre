import { normalizeGitHubPath } from './url';

const GITHUB_HOST = 'github.com';

export interface FetchGitHubDiffOptions {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  sourceUrl: string;
}

export interface FetchGitHubDiffResult {
  body: string;
  status: number;
  titleHtml?: string;
}

function getGitHubPageUrl(sourceUrl: string): string | undefined {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return undefined;
  }

  if (parsedUrl.hostname !== GITHUB_HOST) return undefined;

  const path = normalizeGitHubPath(parsedUrl.pathname);
  return path == null ? undefined : `https://${GITHUB_HOST}${path}`;
}

function getGitHubDiffUrl(sourceUrl: string): string | undefined {
  const pageUrl = getGitHubPageUrl(sourceUrl);
  return pageUrl == null ? undefined : `${pageUrl}.diff`;
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
  const pageUrl = getGitHubPageUrl(options.sourceUrl);
  if (diffUrl == null || pageUrl == null) {
    return { body: 'Unsupported GitHub diff URL.', status: 400 };
  }

  const titleHtmlPromise = fetchGitHubTitleHtml(options.fetch, pageUrl);

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

  const titleHtml = await titleHtmlPromise;
  return titleHtml == null
    ? { body, status: 200 }
    : { body, status: 200, titleHtml };
}

async function fetchGitHubTitleHtml(
  fetch: FetchGitHubDiffOptions['fetch'],
  pageUrl: string
): Promise<string | undefined> {
  try {
    const response = await fetch(pageUrl, {
      cache: 'no-store',
      credentials: 'include',
      redirect: 'follow',
    });
    if (!response.ok) return undefined;

    // ponytail: buffers one GitHub page; stream to </title> if this request
    // becomes a measurable load-time or memory cost.
    const titleHtml = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(
      await response.text()
    )?.[1];
    const trimmedTitleHtml = titleHtml?.trim();
    return trimmedTitleHtml === '' ? undefined : trimmedTitleHtml;
  } catch {
    return undefined;
  }
}
