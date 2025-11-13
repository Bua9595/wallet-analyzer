import type { ParsedActivity } from "../types/activity";
import type { CovalentTransactionV3Item } from "../types/covalent";
import { classifyTransaction } from "./classify";

export function parseTransactionsV3(data: unknown, chainId: number): ParsedActivity[] {
  const items: CovalentTransactionV3Item[] = Array.isArray(data)
    ? (data as any[])
    : (data as any)?.items ?? [];

  const out: ParsedActivity[] = [];
  for (const it of items) {
    const txHash = it.tx_hash || "unknown";
    let token: string | undefined;
    let amount: number | undefined;
    const anyIt: any = it as any;
    const erc20: any[] | undefined = anyIt.erc20_transfers;
    if (Array.isArray(erc20) && erc20.length) {
      const match = erc20.find(t => (t.from_address||'').toLowerCase() === (it.from_address||'').toLowerCase() && (t.to_address||'').toLowerCase() === (it.to_address||'').toLowerCase()) || erc20[0];
      const dec = Number(match?.token_decimals ?? 18) || 18;
      const raw = typeof match?.value === 'string' ? match.value : String(match?.value ?? '0');
      const norm = Number(raw) / Math.pow(10, dec);
      token = match?.token_symbol || 'TOKEN';
      amount = isFinite(norm) ? norm : undefined;
    } else if (it.value != null) {
      // Fallback: native transfer guess (wei → ether-like)
      const raw = typeof it.value === 'string' ? it.value : String(it.value);
      const norm = Number(raw) / 1e18;
      if (isFinite(norm)) { amount = norm; token = 'NATIVE'; }
    }
    // USD-Schätzung: bevorzugt value_quote; sonst (bei nativen Transfers) via Quote-Rate
    const quoteRate =
      typeof (anyIt?.gas_quote_rate) === 'number' ? anyIt.gas_quote_rate :
      typeof (anyIt?.quote_rate) === 'number' ? anyIt.quote_rate :
      undefined;
    const amountUSD =
      typeof (anyIt?.value_quote) === 'number' ? anyIt.value_quote :
      (typeof amount === 'number' && typeof quoteRate === 'number') ? (amount * quoteRate) :
      undefined;

    out.push({
      id: `${chainId}:${txHash}`,
      chainId,
      timestamp: it.block_signed_at || new Date().toISOString(),
      type: classifyTransaction(it),
      from: it.from_address || "",
      to: it.to_address || "",
      token,
      amount,
      amountUSD,
      txHash,
    });
  }
  return out;
}
