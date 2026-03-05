import { rpcCall } from './rpc';

// tokenURI(uint256) selector
const TOKEN_URI_SELECTOR = '0xc87b56dd';

/**
 * Decode a hex-encoded ABI string return value into a decoded tokenURI string,
 * then resolve the metadata JSON to extract name + image.
 */
export async function resolveTokenURI(hex: string): Promise<{ name: string; image: string } | null> {
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
      const json = JSON.parse(atob(uri.slice('data:application/json;base64,'.length)));
      return { name: json.name || '', image: json.image || '' };
    }

    if (uri.startsWith('data:application/json,')) {
      const raw = decodeURIComponent(uri.slice('data:application/json,'.length));
      const json = JSON.parse(raw);
      return { name: json.name || '', image: json.image || '' };
    }

    if (uri.startsWith('{')) {
      const json = JSON.parse(uri);
      return { name: json.name || '', image: json.image || '' };
    }

    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      const res = await fetch(uri);
      if (!res.ok) return null;
      const json = await res.json();
      return { name: json.name || '', image: json.image || '' };
    }

    return null;
  } catch {
    return null;
  }
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
