export function getGitHubTokenFromAuthorizationHeader(
  authorization: string | null
): string | undefined {
  if (authorization == null) {
    return undefined;
  }
  const match = /^Bearer\s+(.+)$/.exec(authorization.trim());
  const token = match?.[1]?.trim();
  return token === '' ? undefined : token;
}

export function getGitHubTokenFromRequest(
  request: Request
): string | undefined {
  return getGitHubTokenFromAuthorizationHeader(
    request.headers.get('Authorization')
  );
}

export function getGitHubRequestHeaders(token: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'pierre-diffshub',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export function missingGitHubTokenResponse(action: string): Response {
  return Response.json(
    { error: `Add a GitHub PAT in Diffshub to ${action}.` },
    { status: 401 }
  );
}
