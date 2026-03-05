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

const CHUNK_SIZE = 5000; // blocks per getLogs query (safe for public RPCs)
const MAX_CONCURRENT_LOG_QUERIES = 8;

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

  // Build chunk ranges
  const ranges: Array<{ from: number; to: number }> = [];
  for (let from = params.fromBlock; from <= head; from += CHUNK_SIZE + 1) {
    ranges.push({ from, to: Math.min(from + CHUNK_SIZE, head) });
  }

  // Process chunks in parallel batches
  for (let i = 0; i < ranges.length; i += MAX_CONCURRENT_LOG_QUERIES) {
    const batch = ranges.slice(i, i + MAX_CONCURRENT_LOG_QUERIES);
    const batchResults = await Promise.all(
      batch.map(async ({ from, to }) => {
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
        return data.result && Array.isArray(data.result) ? (data.result as LogEntry[]) : [];
      }),
    );

    for (const logs of batchResults) {
      allLogs.push(...logs);
    }
  }

  return allLogs;
}
