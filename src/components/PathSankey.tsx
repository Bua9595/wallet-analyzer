import { useEffect, useMemo, useState } from 'react'
import type { ParsedActivity } from '../types/activity'
import { fetchTransactionDetails } from '../api/covalentRequest'

type Props = { items: ParsedActivity[]; topN?: number; wallet: string }

type Edge = { from: string; to: string; usd: number }

function short(addr: string, n = 4) { return addr ? `${addr.slice(0, 2 + n)}…${addr.slice(-n)}` : '' }

function buildEdgesFromLogs(detail: any): { edges: { from: string; to: string }[] } {
  const logs = detail?.items?.[0]?.log_events ?? detail?.log_events ?? []
  const edges: { from: string; to: string }[] = []
  for (const le of logs) {
    const decoded = le?.decoded
    if (!decoded) continue
    if ((decoded?.name || '').toLowerCase() === 'transfer') {
      const from = decoded.params?.find((p: any) => p?.name === 'from')?.value?.toLowerCase?.()
      const to = decoded.params?.find((p: any) => p?.name === 'to')?.value?.toLowerCase?.()
      if (from && to) edges.push({ from, to })
    }
  }
  return { edges }
}

export default function PathSankey({ items, topN = 30, wallet }: Props) {
  const [edges, setEdges] = useState<Edge[]>([])
  const pivot = wallet.toLowerCase()

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const top = [...items]
          .filter(i => typeof i.amountUSD === 'number' && (i.amountUSD as number) > 0)
          .sort((a,b) => (b.amountUSD ?? 0) - (a.amountUSD ?? 0))
          .slice(0, topN)
        const results: Edge[] = []
        for (const it of top) {
          try {
            const detail = await fetchTransactionDetails(it.chainId, it.txHash)
            const { edges } = buildEdgesFromLogs(detail)
            if (!edges.length) continue
            const share = (it.amountUSD ?? 0) / edges.length
            for (const e of edges) results.push({ from: e.from, to: e.to, usd: share })
          } catch (e) {
            // ignore individual failures
          }
        }
        if (!cancelled) setEdges(results)
      } catch {}
    }
    run()
    return () => { cancelled = true }
  }, [items, topN, wallet])

  const graph = useMemo(() => {
    // Aggregate edges
    const agg = new Map<string, number>()
    for (const e of edges) {
      const k = `${e.from}->${e.to}`
      agg.set(k, (agg.get(k) || 0) + (e.usd || 0))
    }
    // Build adjacency for BFS around pivot (depth 1 in+out for MVP)
    const inbound: { addr: string; usd: number }[] = []
    const outbound: { addr: string; usd: number }[] = []
    let max = 0
    agg.forEach((usd, k) => {
      const [from, to] = k.split('->')
      if (to === pivot) { inbound.push({ addr: from, usd }); max = Math.max(max, usd) }
      if (from === pivot) { outbound.push({ addr: to, usd }); max = Math.max(max, usd) }
    })
    inbound.sort((a,b)=>b.usd-a.usd)
    outbound.sort((a,b)=>b.usd-a.usd)
    return { inbound, outbound, max }
  }, [edges, pivot])

  const scale = (v: number, max: number) => {
    const base = Math.log10((v||0)+1)
    const denom = Math.log10((max||1)+1) || 1
    const t = base/denom
    return 2 + t * 10
  }

  const W = 860, pad = 36
  const leftX = pad + 140, rightX = W - pad - 140, centerX = W/2
  const H = Math.max(380, Math.max(graph.inbound.length, graph.outbound.length)*34 + 220)
  const centerY = H/2

  return (
    <div className="mb-24">
      <div className="text-sm font-medium mb-3">Transaktions-Pfade (Top {Math.min(topN, items.length)} USD‑Events)</div>
      <svg width={W} height={H} className="block mx-auto">
        <defs>
          <marker id="ps-arrow-in" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
          </marker>
          <marker id="ps-arrow-out" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
          </marker>
        </defs>
        {/* inbound links */}
        {graph.inbound.map((n, i) => {
          const y = 100 + i*30
          const w = scale(n.usd, graph.max)
          const d = `M ${leftX} ${y} C ${leftX+80} ${y}, ${centerX-80} ${centerY}, ${centerX} ${centerY}`
          return <path key={`i-${n.addr}`} d={d} stroke="#10b981" strokeWidth={w} fill="none" opacity={0.6} markerEnd="url(#ps-arrow-in)" />
        })}
        {/* outbound links */}
        {graph.outbound.map((n, i) => {
          const y = 100 + i*30
          const w = scale(n.usd, graph.max)
          const d = `M ${centerX} ${centerY} C ${centerX+80} ${centerY}, ${rightX-80} ${y}, ${rightX} ${y}`
          return <path key={`o-${n.addr}`} d={d} stroke="#3b82f6" strokeWidth={w} fill="none" opacity={0.6} markerEnd="url(#ps-arrow-out)" />
        })}
        {/* nodes */}
        {graph.inbound.map((n, i) => (
          <g key={`ni-${n.addr}`} transform={`translate(${leftX},${100 + i*30})`}>
            <circle r={10} fill="#10b981" />
            <text x={-16} y={-18} textAnchor="end" className="fill-slate-700 dark:fill-[#f7931a]" fontSize={11}>{short(n.addr,6)}</text>
            <text x={-10} y={12} textAnchor="end" className="fill-slate-500 dark:fill-slate-300" fontSize={10}>${Math.round(n.usd)}</text>
          </g>
        ))}
        {graph.outbound.map((n, i) => (
          <g key={`no-${n.addr}`} transform={`translate(${rightX},${100 + i*30})`}>
            <circle r={10} fill="#3b82f6" />
            <text x={10} y={-18} className="fill-slate-700 dark:fill-[#f7931a]" fontSize={11}>{short(n.addr,6)}</text>
            <text x={10} y={12} className="fill-slate-500 dark:fill-slate-300" fontSize={10}>${Math.round(n.usd)}</text>
          </g>
        ))}
        {/* center */}
        <g transform={`translate(${centerX},${centerY})`}>
          <text textAnchor="middle" y={-26} className="fill-[#f7931a]" fontSize={12}>{short(pivot,6)}</text>
          <circle r={18} fill="#0ea5e9" />
          <text textAnchor="middle" y={28} className="fill-slate-500 dark:fill-slate-400" fontSize={10}>Pivot</text>
        </g>
      </svg>
    </div>
  )
}
