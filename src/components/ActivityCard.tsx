import type { ParsedActivity } from "../types/activity";
import { CHAIN_NAME_BY_ID } from "../config/chains";

function TypeBadge({ type }: { type: ParsedActivity["type"] }) {
  const color =
    type === "transfer" ? "bg-blue-100 text-blue-700" :
    type === "swap" ? "bg-emerald-100 text-emerald-700" :
    type === "nft" ? "bg-purple-100 text-purple-700" :
    type === "mint" ? "bg-yellow-100 text-yellow-700" :
    type === "burn" ? "bg-orange-100 text-orange-700" :
    type === "bridge" ? "bg-pink-100 text-pink-700" :
    "bg-gray-100 text-gray-700";
  return <span className={`px-2 py-0.5 rounded text-xs ${color}`}>{type}</span>;
}

export default function ActivityCard({ a }: { a: ParsedActivity }) {
  return (
    <div className="rounded border p-3 mb-2 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-300">Chain: {CHAIN_NAME_BY_ID.get(a.chainId) ?? a.chainId}</div>
        <TypeBadge type={a.type} />
      </div>
      <div className="text-sm break-all">{a.txHash}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(a.timestamp).toLocaleString()}</div>
      <div className="text-sm mt-1 flex items-center gap-3">
        {typeof a.amountUSD === 'number' && (
          <span>${a.amountUSD.toFixed(2)}</span>
        )}
        {a.token && a.amount != null && (
          <span className="text-xs text-gray-700 dark:text-gray-300">{a.amount.toFixed(4)} {a.token}</span>
        )}
        {a.meta?.collapsed && (
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">Pass‑Through via {(a.meta as any).via}</span>
        )}
      </div>
    </div>
  );
}
