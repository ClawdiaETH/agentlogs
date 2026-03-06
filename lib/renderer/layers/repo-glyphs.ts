import type { LayerFn } from '../types';

const GLYPH_MAP: Record<string, string> = {
  agentsea:        '[CS]',
  agentlogs:       '[OL]',
  clawd:           '[CLA]',
  spellblock:      '[SB]',
  'anons-dao':     '[AN]',
  'agentfails-wtf':'[AF]',
  'bankrclub-ens': '[BC]',
  'clawduct-hunt': '[CD]',
  'sunset-protocol':'[SP]',
};

/** Layer 12: Bracketed repo tags in lower-left zone */
export const repoGlyphs: LayerFn = (ctx, rng, dayLog, colors) => {
  const repos = dayLog.reposActive ?? [];
  if (repos.length === 0) return;

  ctx.font = '11px JetBrainsMono';
  ctx.textBaseline = 'top';

  const startY = 580 + Math.floor(rng() * 60);
  const startX = 16 + Math.floor(rng() * 30);

  repos.forEach((repo, i) => {
    const glyph = GLYPH_MAP[repo] ?? `[${repo.slice(0, 2).toUpperCase()}]`;
    const x = startX + (i % 3) * 70;
    const y = startY + Math.floor(i / 3) * 20;

    ctx.globalAlpha = 0.4 + rng() * 0.25;
    ctx.fillStyle = colors.SEC;
    ctx.fillText(glyph, x, y);
  });

  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
};
