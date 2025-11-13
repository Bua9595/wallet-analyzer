export type EvmChain = {
  id: number;
  name: string;   // kurzer, UI-freundlicher Name
  short: string;  // Ticker/Abkürzung
};

// Kompakte Namen (keine Zusätze wie "One" oder "C-Chain").
// Leicht erweiterbar; weitere Chains können hier ergänzt werden.
export const DEFAULT_CHAINS: EvmChain[] = [
  { id: 1, name: "Ethereum", short: "ETH" },
  { id: 56, name: "BNB", short: "BNB" },
  { id: 137, name: "Polygon", short: "POL" },
  { id: 10, name: "Optimism", short: "OP" },
  { id: 42161, name: "Arbitrum", short: "ARB" },
  { id: 43114, name: "Avalanche", short: "AVAX" },
];

export const CHAIN_NAME_BY_ID = new Map(DEFAULT_CHAINS.map(c => [c.id, c.name] as const));

export const CHAIN_COLOR_BY_ID = new Map<number, string>([
  [1, '#6366f1'],      // Ethereum - indigo
  [56, '#f59e0b'],     // BNB - amber
  [137, '#8b5cf6'],    // Polygon - violet
  [10, '#ef4444'],     // Optimism - red
  [42161, '#22c55e'],  // Arbitrum - green
  [43114, '#f43f5e'],  // Avalanche - rose
]);
