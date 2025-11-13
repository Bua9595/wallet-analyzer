import type { CovalentTransactionsV3Response } from "../types/covalent";

// Provider selection: 'covalent' (default) or 'moralis'
const PROVIDER = (import.meta.env.VITE_PROVIDER as 'covalent' | 'moralis' | undefined) || 'covalent';

// Covalent base + auth config
const ENV_BASE = (import.meta.env.VITE_COVALENT_BASE as string | undefined)?.replace(/\/$/, "");
const DEFAULT_BASE = import.meta.env.DEV ? "/covalent/v1" : "https://api.covalenthq.com/v1";
const BASE = ENV_BASE || DEFAULT_BASE;
type AuthMode = 'query' | 'header';
const AUTH_MODE = ((import.meta.env.VITE_COVALENT_AUTH as AuthMode | undefined) || 'query');
const AUTH_HEADER = (import.meta.env.VITE_COVALENT_HEADER as string | undefined) || 'Authorization';
const AUTH_PREFIX = (import.meta.env.VITE_COVALENT_PREFIX as string | undefined) ?? 'Bearer ';

// Moralis base
const MORALIS_BASE = ((import.meta.env.VITE_MORALIS_BASE as string | undefined) || 'https://deep-index.moralis.io/api/v2.2').replace(/\/$/, "");

const ENV_KEY_COVALENT = import.meta.env.VITE_COVALENT_KEY as string | undefined;
const ENV_KEY_MORALIS = import.meta.env.VITE_MORALIS_KEY as string | undefined;
let RUNTIME_KEY: string | null = typeof window !== 'undefined' ? localStorage.getItem('covalent_key') : null;

export function getCovalentKey(): string | undefined {
  if (PROVIDER === 'moralis') return RUNTIME_KEY || ENV_KEY_MORALIS;
  return RUNTIME_KEY || ENV_KEY_COVALENT;
}

export function setCovalentKey(key: string) {
  RUNTIME_KEY = key;
  try { if (typeof window !== 'undefined') localStorage.setItem('covalent_key', key); } catch {}
}

export type CovalentResponse<T = unknown> = {
  data: T;
  error?: boolean;
  error_message?: string | null;
};

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchTransactionsV3(
  chainId: number,
  address: string,
  params: { pageSize?: number; pageNumber?: number } = {}
) {
  const COVALENT_KEY = getCovalentKey();
  if (!COVALENT_KEY) throw new Error("API‑Key fehlt. Bitte in .env setzen oder im UI einfügen.");

  if (PROVIDER === 'moralis') {
    return await fetchMoralisPage(chainId, address, params.pageSize ?? 100, undefined, COVALENT_KEY);
  }

  const useHeader = AUTH_MODE === 'header' || (COVALENT_KEY.startsWith('cqt_') && import.meta.env.DEV);

  const search = new URLSearchParams();
  if (params.pageSize) search.set("page-size", String(params.pageSize));
  if (params.pageNumber) search.set("page-number", String(params.pageNumber));
  // Use query param by default; or header if configured
  if (!useHeader) search.set("key", COVALENT_KEY);

  const url = `${BASE}/${chainId}/address/${address}/transactions_v3/?${search.toString()}`;
  const init: RequestInit = useHeader ? { headers: { [AUTH_HEADER]: `${AUTH_PREFIX}${COVALENT_KEY}` } as any } : {};
  const res = await fetch(url, init);
  if (!res.ok) {
    let msg = `Covalent Fehler ${res.status}`;
    try {
      const j = await res.json() as any;
      if (j?.error_message) msg += `: ${j.error_message}`;
    } catch {}
    if (res.status === 401 || res.status === 403) {
      msg = 'API‑Key ungültig oder nicht autorisiert. Bitte GoldRush/Covalent‑Key (cqt_/ckey_) prüfen.';
    }
    throw new Error(msg);
  }
  const json = (await res.json()) as CovalentResponse<CovalentTransactionsV3Response | any[]>;
  if (json.error) throw new Error(json.error_message || "Unknown Covalent error");
  return json.data;
}

// Simple concurrency limiter
function pLimit(concurrency: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => {
    active--;
    if (queue.length > 0) queue.shift()!();
  };
  return async function <T>(fn: () => Promise<T>): Promise<T> {
    if (active >= concurrency) await new Promise<void>((r) => queue.push(r));
    active++;
    try {
      return await fn();
    } finally {
      next();
    }
  };
}

export async function fetchTransactionsV3AllPages(
  chainId: number,
  address: string,
  pageSize = 100,
  maxPages = Number(import.meta.env.VITE_COVALENT_MAX_PAGES ?? 10)
) {
  if (PROVIDER === 'moralis') {
    const apiKey = getCovalentKey();
    if (!apiKey) throw new Error('API‑Key fehlt.');
    const all: any[] = [];
    let cursor: string | undefined = undefined;
    for (let page = 0; page < maxPages; page++) {
      const { items, nextCursor } = await fetchMoralisPage(chainId, address, pageSize, cursor, apiKey);
      all.push(...items);
      if (!nextCursor || items.length < pageSize) break;
      cursor = nextCursor;
      await delay(200);
    }
    return all;
  }

  const pages: any[] = [];
  for (let page = 0; page < maxPages; page++) {
    const data = await fetchTransactionsV3(chainId, address, { pageSize, pageNumber: page });
    const items = Array.isArray(data)
      ? data
      : (data as CovalentTransactionsV3Response)?.items ?? [];
    pages.push(...items);
    if (!items || items.length < pageSize) break;
    await delay(200); // light pacing
  }
  return pages;
}

export async function fetchAllChainsTransactions(
  chainIds: number[],
  address: string,
  options: { concurrency?: number; pageSize?: number; maxPages?: number } = {}
) {
  const defaultMax = PROVIDER === 'moralis' ? Number((import.meta.env as any).VITE_MORALIS_MAX_PAGES ?? 10) : 3;
  const envConc = Number((import.meta.env as any).VITE_API_CONCURRENCY ?? 2);
  const { concurrency = envConc, pageSize = 100, maxPages = defaultMax } = options;
  const limit = pLimit(concurrency);
  const settled = await Promise.allSettled(
    chainIds.map((id) => limit(() => fetchTransactionsV3AllPages(id, address, pageSize, maxPages).then(items => ({ chainId: id, items }))))
  );
  const results: { chainId: number; items: any[] }[] = [];
  for (const s of settled) {
    if (s.status === 'fulfilled') results.push(s.value);
    else {
      const m = (s as any).reason?.message || String((s as any).reason || 'unknown error');
      try { console.warn('Fetch chain failed:', m); } catch {}
      // still include empty result to keep UI stable
      const match = /chainId\s*[:=]\s*(\d+)/i.exec(m);
      const chainId = match ? Number(match[1]) : -1;
      results.push({ chainId, items: [] });
    }
  }
  return results; // [{ chainId, items }]
}

// Fetch detailed transaction including log events for path reconstruction
export async function fetchTransactionDetails(chainId: number, txHash: string) {
  const apiKey = getCovalentKey();
  if (!apiKey) throw new Error("API‑Key fehlt. Bitte in .env setzen oder im UI einfügen.");

  if (PROVIDER === 'moralis') {
    // Moralis: use transaction details endpoint
    const chain = moralisChainParam(chainId);
    const url = `${MORALIS_BASE}/transaction/${txHash}?chain=${encodeURIComponent(chain)}`;
    const res = await fetch(url, { headers: { 'X-API-Key': apiKey } });
    if (!res.ok) {
      let msg = `Moralis Fehler ${res.status}`;
      try { const j = await res.json() as any; if (j?.message) msg += `: ${j.message}`; } catch {}
      throw new Error(msg);
    }
    const json = await res.json();
    return (json as any).result ?? (json as any).data ?? json;
  }

  const useHeader = AUTH_MODE === 'header' || (apiKey.startsWith('cqt_') && import.meta.env.DEV);
  const url = `${BASE}/${chainId}/transaction_v3/${txHash}/${useHeader ? '' : `?key=${apiKey}`}`;
  const init: RequestInit = useHeader ? { headers: { [AUTH_HEADER]: `${AUTH_PREFIX}${apiKey}` } as any } : {};
  const res = await fetch(url, init);
  if (!res.ok) {
    let msg = `Covalent Fehler ${res.status}`;
    try { const j = await res.json() as any; if (j?.error_message) msg += `: ${j.error_message}`; } catch {}
    throw new Error(msg);
  }
  const json = await res.json();
  return (json as any).data ?? json;
}

// ------- Moralis helpers -------
function moralisChainParam(chainId: number): string {
  switch (chainId) {
    case 1: return 'eth';
    case 56: return 'bsc';
    case 137: return 'polygon';
    case 10: return 'optimism';
    case 42161: return 'arbitrum';
    case 43114: return 'avalanche';
    default: return `0x${chainId.toString(16)}`;
  }
}

async function fetchMoralisPage(chainId: number, address: string, limit: number, cursor: string | undefined, apiKey: string) {
  const chain = moralisChainParam(chainId);
  const search = new URLSearchParams();
  search.set('chain', chain);
  search.set('limit', String(Math.min(Math.max(limit, 10), 100)));
  search.set('order', 'DESC');
  search.set('include', 'internal_transactions,erc20_transfers,nft_transfers');
  if (cursor) search.set('cursor', cursor);
  const url = `${MORALIS_BASE}/wallets/${address}/history?${search.toString()}`;
  const res = await fetch(url, { headers: { 'X-API-Key': apiKey } });
  if (!res.ok) {
    let msg = `Moralis Fehler ${res.status}`;
    try { const j = await res.json() as any; if (j?.message) msg += `: ${j.message}`; } catch {}
    throw new Error(msg);
  }
  const json = await res.json() as any;
  const result: any[] = (json as any).result || (json as any).data || [];
  // Map to Covalent-like items and carry ERC20/NFT transfer info for parsing
  const items = result.map((it) => ({
    tx_hash: it.hash || it.transaction_hash || it.tx_hash,
    block_signed_at: it.block_timestamp || it.block_signed_at,
    from_address: it.from_address,
    to_address: it.to_address,
    value: it.value,
    value_quote: typeof it.value_usd === 'number' ? it.value_usd
      : (typeof it.value_quote === 'number' ? it.value_quote : undefined),
    erc20_transfers: Array.isArray(it.erc20_transfers) ? it.erc20_transfers.map((t: any) => ({
      from_address: t.from_address,
      to_address: t.to_address,
      token_symbol: t.token_symbol || t.symbol,
      token_decimals: Number(t.token_decimals ?? t.decimals ?? 18),
      token_address: t.address || t.token_address,
      value: t.value,
      value_decimal: typeof t.value_decimal === 'number' ? t.value_decimal : undefined,
    })) : undefined,
  }));
  const nextCursor = (json as any).cursor || (json as any).next || undefined;
  return { items, nextCursor };
}
