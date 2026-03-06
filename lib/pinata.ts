/**
 * Upload an image buffer to Pinata IPFS via v1 Pinning API.
 * Returns the IPFS URI (ipfs://CID).
 *
 * Uses /pinning/pinFileToIPFS which actually pins to the public IPFS network
 * and returns CIDv0 (Qm...) hashes resolvable on any IPFS gateway.
 */
export async function uploadImage(
  buffer: Buffer,
  name: string,
  pinataJwt: string,
): Promise<string> {
  const formBody = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: 'image/png' });
  formBody.append('file', blob, `${name}.png`);
  formBody.append(
    'pinataMetadata',
    JSON.stringify({ name }),
  );

  const resp = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${pinataJwt}` },
    body: formBody,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Pinata image upload failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Upload a JSON metadata object to Pinata IPFS via v1 Pinning API.
 * Returns the IPFS URI (ipfs://CID).
 */
export async function uploadMetadata(
  metadata: Record<string, unknown>,
  name: string,
  pinataJwt: string,
): Promise<string> {
  const resp = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: { name: `${name} metadata` },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Pinata metadata upload failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Re-pin a CIDv1 file from Pinata's v3 storage to the public IPFS network.
 * 1. Searches v3 Files API to find the file by CID
 * 2. Downloads content via Pinata's signed URL
 * 3. Re-uploads via v1 Pinning API (returns CIDv0)
 */
export async function repinToIPFS(
  cidV1: string,
  name: string,
  pinataJwt: string,
  pinataGateway: string,
): Promise<string> {
  // Find the file in Pinata v3
  const listResp = await fetch(
    `https://api.pinata.cloud/v3/files?cid=${cidV1}`,
    { headers: { Authorization: `Bearer ${pinataJwt}` } },
  );
  if (!listResp.ok) {
    throw new Error(`Failed to find file ${cidV1}: ${listResp.status}`);
  }
  const listData = await listResp.json();
  const files = listData.data?.files ?? listData.data ?? [];
  if (!files.length) {
    throw new Error(`File not found in Pinata: ${cidV1}`);
  }

  // Get a signed download URL
  const signResp = await fetch('https://api.pinata.cloud/v3/files/sign', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: `https://${pinataGateway}/files/${cidV1}`,
      date: Math.floor(Date.now() / 1000),
      expires: 300,
      method: 'GET',
    }),
  });
  if (!signResp.ok) {
    throw new Error(`Failed to sign URL for ${cidV1}: ${signResp.status}`);
  }
  const signData = await signResp.json();
  const signedUrl = signData.data;

  // Download the content
  const contentResp = await fetch(signedUrl);
  if (!contentResp.ok) {
    throw new Error(`Failed to download ${cidV1}: ${contentResp.status}`);
  }
  const contentBuffer = Buffer.from(await contentResp.arrayBuffer());

  // Re-upload via v1 API (pins to public IPFS, returns CIDv0)
  return uploadImage(contentBuffer, name, pinataJwt);
}
