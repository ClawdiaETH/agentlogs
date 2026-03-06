import type { LayerFn } from '../types';

const KNOWN_REPOS = new Set([
  'agentsea', 'agentlogs', 'clawd',
  'spellblock', 'anons-dao', 'agentfails-wtf',
  'bankrclub-ens', 'clawduct-hunt', 'sunset-protocol',
]);

/** Layer 10: Commit messages + SHA stubs */
export const commits: LayerFn = (ctx, rng, dayLog, colors) => {
  const commitList = dayLog.commits ?? [];
  if (commitList.length === 0) return;

  ctx.textBaseline = 'top';
  const baseY = 140 + Math.floor(rng() * 100);

  commitList.slice(0, 15).forEach((commit, i) => {
    const x = 30 + Math.floor(rng() * 200);
    const y = baseY + i * 28;

    // Commit message
    const isKnown = KNOWN_REPOS.has(commit.repo);
    ctx.globalAlpha = 0.20 + rng() * 0.12;
    ctx.fillStyle = isKnown ? colors.SEC : colors.DOM;
    ctx.font = '10px JetBrainsMono';
    ctx.fillText(commit.message.slice(0, 48), x, y);

    // SHA stub beneath at lower opacity
    ctx.globalAlpha *= 0.5;
    ctx.font = '8px JetBrainsMono';
    ctx.fillText(commit.sha, x, y + 12);
  });

  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
};
