import type { Replies } from '../renderer/types';

interface OperationalData {
  txns: number;
  posts: number;
  errors: number;
  messages: number;
  peakHour: number;
  replies: Replies;
}

/**
 * Stub for operational stats. Returns defaults.
 * Real stats would come from Clawdia's logging system (out of scope).
 */
export async function fetchOperationalData(): Promise<OperationalData> {
  return {
    txns: 0,
    posts: 0,
    errors: 0,
    messages: 0,
    peakHour: 12,
    replies: {
      twitter: [],
      farcaster: [],
      combined: [],
    },
  };
}
