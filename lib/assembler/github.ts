import type { Commit } from '../renderer/types';

const GITHUB_USER = 'ClawdiaETH';
const KNOWN_GLYPHS: Record<string, string> = {
  spellblock:        '[SB]',
  'anons-dao':       '[AN]',
  'agentfails-wtf':  '[AF]',
  'bankrclub-ens':   '[BC]',
  'clawduct-hunt':   '[CD]',
  'sunset-protocol': '[SP]',
};

interface GitHubData {
  commits: Commit[];
  commitCount: number;
  reposActive: string[];
  peakHourFromCommits: number | null;
}

export async function fetchGitHubData(): Promise<GitHubData> {
  const empty: GitHubData = { commits: [], commitCount: 0, reposActive: [], peakHourFromCommits: null };

  try {
    const headers: Record<string, string> = { 'User-Agent': 'agentlogs-assembler' };
    const token = process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    const resp = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/events/public?per_page=100`,
      { headers, next: { revalidate: 0 } },
    );

    if (!resp.ok) {
      console.warn(`GitHub API returned ${resp.status}`);
      return empty;
    }

    const events = await resp.json() as Array<{
      type: string;
      created_at: string;
      repo: { name: string };
      payload: { commits?: Array<{ sha: string; message: string }> };
    }>;

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const commits: Commit[] = [];
    const repoSet = new Set<string>();
    const hourCounts: number[] = new Array(24).fill(0);

    for (const event of events) {
      if (event.type !== 'PushEvent') continue;
      const eventTime = new Date(event.created_at).getTime();
      if (eventTime < cutoff) continue;

      const repoName = event.repo.name.replace(/^[^/]+\//, '');
      repoSet.add(repoName);

      const hour = new Date(event.created_at).getUTCHours();
      hourCounts[hour]++;

      for (const c of event.payload.commits ?? []) {
        commits.push({
          sha: c.sha.slice(0, 7),
          message: c.message.split('\n')[0].slice(0, 72),
          repo: repoName,
          timestamp: event.created_at,
        });
      }
    }

    // Determine peak hour from commit activity
    let peakHourFromCommits: number | null = null;
    const maxCount = Math.max(...hourCounts);
    if (maxCount > 0) {
      peakHourFromCommits = hourCounts.indexOf(maxCount);
    }

    return {
      commits,
      commitCount: commits.length,
      reposActive: Array.from(repoSet),
      peakHourFromCommits,
    };
  } catch (err) {
    console.warn('GitHub fetch failed:', err);
    return empty;
  }
}

export { KNOWN_GLYPHS };
