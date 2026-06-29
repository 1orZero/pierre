import { type NextRequest } from 'next/server';

import {
  getGitHubRequestHeaders,
  getGitHubTokenFromRequest,
  missingGitHubTokenResponse,
} from '../githubAuth';

const GITHUB_API_HOST = 'api.github.com';
const PER_PAGE = 100;

interface RepoSummary {
  fullName: string; // owner/name — used as the search filter and dropdown value
  owner: string;
  name: string;
  private: boolean;
}

// Lists the repos the viewer has access to so the PR list can offer a
// scope-by-repo dropdown. Sorted by recent activity to keep the list useful
// when capped at GitHub's 100-per-page max.
export async function GET(request: NextRequest): Promise<Response> {
  const token = getGitHubTokenFromRequest(request);
  if (token == null) {
    return missingGitHubTokenResponse('list repos');
  }

  const url = new URL(`https://${GITHUB_API_HOST}/user/repos`);
  url.searchParams.set('per_page', String(PER_PAGE));
  url.searchParams.set('sort', 'updated');
  url.searchParams.set('direction', 'desc');
  url.searchParams.set('affiliation', 'owner,collaborator,organization_member');

  let response: Response;
  try {
    response = await fetch(url.href, {
      cache: 'no-store',
      headers: getGitHubRequestHeaders(token),
      signal: request.signal,
    });
  } catch {
    return jsonError('Failed to reach GitHub.', 502);
  }

  if (!response.ok) {
    let message: string | undefined;
    try {
      const json = (await response.json()) as { message?: unknown };
      if (typeof json.message === 'string') {
        message = `GitHub: ${json.message}`;
      }
    } catch {
      // Fall through.
    }
    return jsonError(
      message ?? `GitHub returned ${response.status}.`,
      response.status >= 400 && response.status < 600 ? response.status : 502
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return jsonError('GitHub returned unparseable JSON.', 502);
  }

  if (!Array.isArray(json)) {
    return jsonError('Unexpected GitHub response shape.', 502);
  }

  const repos: RepoSummary[] = [];
  for (const raw of json) {
    const parsed = parseRepoSummary(raw);
    if (parsed != null) {
      repos.push(parsed);
    }
  }
  return Response.json({ repos });
}

function parseRepoSummary(raw: unknown): RepoSummary | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }
  const data = raw as Record<string, unknown>;
  const fullName = data.full_name;
  const name = data.name;
  const privateFlag = data.private;
  const owner = data.owner;
  if (
    typeof fullName !== 'string' ||
    typeof name !== 'string' ||
    typeof privateFlag !== 'boolean' ||
    typeof owner !== 'object' ||
    owner === null
  ) {
    return undefined;
  }
  const ownerData = owner as Record<string, unknown>;
  const ownerLogin = ownerData.login;
  if (typeof ownerLogin !== 'string') {
    return undefined;
  }
  return {
    fullName,
    owner: ownerLogin,
    name,
    private: privateFlag,
  };
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
