const BASE_RPC = 'https://mainnet.base.org';
const inFlightCalls = new Map<string, Promise<string>>();

export async function rpcCall(contract: string, data: string): Promise<string> {
  const key = `${contract.toLowerCase()}:${data.toLowerCase()}`;
  const existing = inFlightCalls.get(key);
  if (existing) return existing;

  const call = fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: contract, data }, 'latest'],
      id: 1,
    }),
  }).then(async (res) => (await res.json()).result as string);

  inFlightCalls.set(key, call);
  try {
    return await call;
  } finally {
    inFlightCalls.delete(key);
  }
}
