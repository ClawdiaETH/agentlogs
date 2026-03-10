import { createClient, type VercelKV } from '@vercel/kv';

/** Resolve KV credentials from env vars (supports agentsea_ prefix) */
export function getKvConfig(): { url: string; token: string } | null {
  const url =
    process.env.KV_REST_API_URL ??
    process.env.agentsea_KV_REST_API_URL;
  const token =
    process.env.KV_REST_API_TOKEN ??
    process.env.agentsea_KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

export function getKv(): VercelKV | null {
  const config = getKvConfig();
  if (!config) return null;
  return createClient(config);
}
