const REPO = 'ClawdiaETH/agentsea';
const FILE_PATH = 'data/registry.json';
const BRANCH = 'master';

/**
 * Commit an updated registry.json to GitHub via the Contents API.
 * This triggers a Vercel redeploy from the push.
 */
export async function commitRegistry(
  content: string,
  message: string,
  githubToken: string,
): Promise<void> {
  const apiUrl = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

  // Get current file SHA (required for updates)
  const getResp = await fetch(`${apiUrl}?ref=${BRANCH}`, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      'User-Agent': 'agentsea-pipeline',
    },
  });

  let sha: string | undefined;
  if (getResp.ok) {
    const data = await getResp.json();
    sha = data.sha;
  }

  // Write updated file
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const putResp = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${githubToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'agentsea-pipeline',
    },
    body: JSON.stringify(body),
  });

  if (!putResp.ok) {
    const text = await putResp.text();
    throw new Error(`GitHub commit failed: ${putResp.status} ${text}`);
  }
}
