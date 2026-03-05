const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org';
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

export interface LogEntry {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
}

// Alchemy supports large ranges; public RPCs typically cap at ~2k-10k.
// 100k blocks ≈ ~2.3 days on Base (2s block time).
const CHUNK_SIZE = 100_000;

export async function rpcGetBlockNumber(): Promise<number> {
  const res = await fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
  });
  const data = await res.json();
  return parseInt(data.result, 16);
}

/**
 * Query eth_getLogs with automatic block-range chunking.
 * Handles RPC limits by splitting large ranges into CHUNK_SIZE blocks.
 */
export async function rpcGetLogs(params: {
  address: string;
  topics: (string | null)[];
  fromBlock: number;
  toBlock?: number;
}): Promise<LogEntry[]> {
  const head = params.toBlock ?? await rpcGetBlockNumber();
  const allLogs: LogEntry[] = [];

  for (let from = params.fromBlock; from <= head; from += CHUNK_SIZE + 1) {
    const to = Math.min(from + CHUNK_SIZE, head);
    const res = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getLogs',
        params: [{
          address: params.address,
          topics: params.topics,
          fromBlock: '0x' + from.toString(16),
          toBlock: '0x' + to.toString(16),
        }],
        id: 1,
      }),
    });
    const data = await res.json();
    if (data.result && Array.isArray(data.result)) {
      allLogs.push(...data.result);
    }
  }

  return allLogs;
}
