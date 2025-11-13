export type ActivityType =
  | "transfer"
  | "swap"
  | "mint"
  | "burn"
  | "bridge"
  | "nft"
  | "unknown";

export interface ParsedActivity {
  id: string;
  chainId: number;
  timestamp: string; // ISO
  type: ActivityType;
  from: string;
  to: string;
  token?: string;
  amount?: number; // native or token units (normalized)
  amountUSD?: number;
  txHash: string;
  meta?: Record<string, unknown>;
}

