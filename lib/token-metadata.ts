import { rpcCall } from './rpc';

// tokenURI(uint256) selector
const TOKEN_URI_SELECTOR = '0xc87b56dd';

export interface TokenMetadataFull {
  tokenId: string;
  name: string;
  image: string;
  description?: string;
  attributes?: { trait_type: string; value: string }[];
  raw?: Record<string, unknown>;
}

/**
 * Resolve a tokenURI hex return value to the full parsed JSON object.
 */
async function resolveTokenURIFull(hex: string): Promise<Record<string, unknown> | null> {
  if (!hex || hex === '0x') return null;
  try {
    const stripped = hex.slice(2);
    const offset = parseInt(stripped.slice(0, 64), 16) * 2;
    const length = parseInt(stripped.slice(offset, offset + 64), 16);
    const hexStr = stripped.slice(offset + 64, offset + 64 + length * 2);

    let uri = '';
    for (let i = 0; i < hexStr.length; i += 2) {
      uri += String.fromCharCode(parseInt(hexStr.slice(i, i + 2), 16));
    }

    if (uri.startsWith('data:application/json;base64,')) {
      return JSON.parse(atob(uri.slice('data:application/json;base64,'.length)));
    }
    if (uri.startsWith('data:application/json,')) {
      return JSON.parse(decodeURIComponent(uri.slice('data:application/json,'.length)));
    }
    if (uri.startsWith('{')) {
      return JSON.parse(uri);
    }
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      const res = await fetch(uri);
      if (!res.ok) return null;
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch full metadata for a single token including traits and description.
 */
export async function fetchFullTokenMetadata(
  contractAddress: string,
  tokenId: string,
): Promise<TokenMetadataFull | null> {
  try {
    const paddedId = BigInt(tokenId).toString(16).padStart(64, '0');
    const result = await rpcCall(contractAddress, `${TOKEN_URI_SELECTOR}${paddedId}`);
    const json = await resolveTokenURIFull(result);
    if (json) {
      return {
        tokenId,
        name: (json.name as string) || '',
        image: (json.image as string) || '',
        description: (json.description as string) || undefined,
        attributes: Array.isArray(json.attributes) ? json.attributes : undefined,
        raw: json,
      };
    }
  } catch {}
  return null;
}

/**
 * Decode a hex-encoded ABI string return value into a decoded tokenURI string,
 * then resolve the metadata JSON to extract name + image.
 */
export async function resolveTokenURI(hex: string): Promise<{ name: string; image: string } | null> {
  const json = await resolveTokenURIFull(hex);
  if (!json) return null;
  return {
    name: typeof json.name === 'string' ? json.name : '',
    image: typeof json.image === 'string' ? json.image : '',
  };
}

/**
 * Fetch metadata for a single token by calling tokenURI on-chain then resolving.
 */
export async function fetchTokenMetadata(
  contractAddress: string,
  tokenId: string,
): Promise<{ tokenId: string; name: string; image: string } | null> {
  try {
    const paddedId = BigInt(tokenId).toString(16).padStart(64, '0');
    const result = await rpcCall(contractAddress, `${TOKEN_URI_SELECTOR}${paddedId}`);
    const decoded = await resolveTokenURI(result);
    if (decoded) {
      return { tokenId, name: decoded.name, image: decoded.image };
    }
  } catch {}
  return null;
}
