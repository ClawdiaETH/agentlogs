import type { LayerFn } from '../types';

/** Layer 9: Twitter handles in DOM, Farcaster handles in ACC, seeded positions */
export const replies: LayerFn = (ctx, rng, dayLog, colors) => {
  const { twitter = [], farcaster = [] } = dayLog.replies ?? {};
  if (twitter.length === 0 && farcaster.length === 0) return;

  ctx.font = '9px JetBrainsMono';
  ctx.textBaseline = 'top';

  // Twitter handles
  for (const handle of twitter.slice(0, 12)) {
    const x = 20 + Math.floor(rng() * 680);
    const y = 100 + Math.floor(rng() * 500);
    ctx.globalAlpha = 0.08 + rng() * 0.1;
    ctx.fillStyle = colors.DOM;
    ctx.fillText(`@${handle}`, x, y);
  }

  // Farcaster handles
  for (const handle of farcaster.slice(0, 12)) {
    const x = 20 + Math.floor(rng() * 680);
    const y = 100 + Math.floor(rng() * 500);
    ctx.globalAlpha = 0.08 + rng() * 0.1;
    ctx.fillStyle = colors.ACC;
    ctx.fillText(`@${handle}`, x, y);
  }

  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
};
