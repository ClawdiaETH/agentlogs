import type { LayerFn } from '../types';

const LOG_TEMPLATES = [
  'INIT_SEQUENCE OK',
  'HEARTBEAT: latency {}ms',
  'TX_POOL: {} pending',
  'MEM_ALLOC: {}MB',
  'SYNC_BLOCK: #{}',
  'RPC_CALL: eth_getBalance',
  'CACHE_HIT ratio: {}%',
  'QUEUE_DEPTH: {}',
  'GC_PAUSE: {}ms',
  'SOCKET_OPEN: ws://relay-{}',
  'FEED_INGEST: {} events',
  'CRON_TICK: daily_mint',
  'DB_QUERY: {}ms',
  'RATE_LIMIT: {}/min',
  'WEBHOOK_RECV: 200 OK',
  'IPFS_PIN: Qm{}',
  'SIGNER_READY: 0x{}',
  'ERR_TIMEOUT: retry #{}',
  'MINT_GAS: {} gwei',
  'PALETTE_SELECT: {}',
];

/** Layer 8: Faint operational log lines scattered across upper half */
export const logText: LayerFn = (ctx, rng, dayLog, colors) => {
  const lineCount = 8 + Math.floor(rng() * 12);

  ctx.font = '9px JetBrainsMono';
  ctx.textBaseline = 'top';

  for (let i = 0; i < lineCount; i++) {
    const template = LOG_TEMPLATES[Math.floor(rng() * LOG_TEMPLATES.length)];
    const val = Math.floor(rng() * 9999);
    const text = template.replace('{}', String(val));

    const x = 12 + Math.floor(rng() * 400);
    const y = 20 + Math.floor(rng() * 340);

    ctx.globalAlpha = 0.12 + rng() * 0.14;
    ctx.fillStyle = rng() > 0.7 ? colors.ACC : colors.SEC;
    ctx.fillText(text, x, y);
  }

  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
};
