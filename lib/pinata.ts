/**
 * Upload an image buffer to Pinata IPFS.
 * Returns the IPFS URI (ipfs://CID).
 */
export async function uploadImage(
  buffer: Buffer,
  name: string,
  pinataJwt: string,
): Promise<string> {
  const formBody = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: 'image/png' });
  formBody.append('file', blob, `${name}.png`);
  formBody.append('name', name);

  const resp = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${pinataJwt}` },
    body: formBody,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Pinata image upload failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  const cid = data.data?.cid ?? data.IpfsHash;
  return `ipfs://${cid}`;
}

/**
 * Upload a JSON metadata object to Pinata IPFS.
 * Returns the IPFS URI (ipfs://CID).
 */
export async function uploadMetadata(
  metadata: Record<string, unknown>,
  name: string,
  pinataJwt: string,
): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(metadata, null, 2));
  const formBody = new FormData();
  const blob = new Blob([raw], { type: 'application/json' });
  formBody.append('file', blob, `${name}.json`);
  formBody.append('name', `${name} metadata`);

  const resp = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${pinataJwt}` },
    body: formBody,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Pinata metadata upload failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  const cid = data.data?.cid ?? data.IpfsHash;
  return `ipfs://${cid}`;
}
