import {
  getGitHubRequestHeaders,
  getGitHubTokenFromRequest,
  missingGitHubTokenResponse,
} from '../githubAuth';

const GITHUB_API_HOST = 'api.github.com';

interface GitHubViewer {
  login: string;
  avatarUrl: string;
}

// Returns the authenticated GitHub user (login + avatar URL) so the client
// can attribute draft comments to the real viewer instead of a random local
// persona. The PAT comes from the current browser request, never process env.
export async function GET(request: Request): Promise<Response> {
  const token = getGitHubTokenFromRequest(request);
  if (token == null) {
    return missingGitHubTokenResponse('identify the viewer');
  }

  try {
    const viewer = await fetchViewer(token);
    return Response.json(viewer);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to load viewer.',
      },
      { status: 502 }
    );
  }
}

async function fetchViewer(token: string): Promise<GitHubViewer> {
  const response = await fetch(`https://${GITHUB_API_HOST}/user`, {
    cache: 'no-store',
    headers: getGitHubRequestHeaders(token),
  });
  if (!response.ok) {
    throw new Error(
      `GitHub /user returned ${response.status} ${response.statusText}.`
    );
  }
  const data = (await response.json()) as {
    login?: unknown;
    avatar_url?: unknown;
  };
  if (typeof data.login !== 'string' || typeof data.avatar_url !== 'string') {
    throw new Error('GitHub /user returned an unexpected shape.');
  }
  return { login: data.login, avatarUrl: data.avatar_url };
}
