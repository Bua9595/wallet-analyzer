import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ParsedActivity } from '../types/activity'

type Props = {
  items: ParsedActivity[]
  wallet: string
  height?: number
}

type AggEdge = { from: string; to: string; sum: number; count: number }

function short(addr: string, n = 4) {
  if (!addr) return ''
  return `${addr.slice(0, 2 + n)}…${addr.slice(-n)}`
}

export default function FlowGraph({ items, wallet, height = 360 }: Props) {
  const navigate = useNavigate()
  const [pivot, setPivot] = useState(wallet.toLowerCase())

  const { inbound, outbound, maxSum } = useMemo(() => {
    const edges = new Map<string, AggEdge>()
    for (const a of items) {
      const v = typeof a.amountUSD === 'number' ? a.amountUSD : 0
      if (!v) continue
      const from = (a.from || '').toLowerCase()
      const to = (a.to || '').toLowerCase()
      if (!from || !to) continue
      const key = `${from}->${to}`
      const e = edges.get(key) || { from, to, sum: 0, count: 0 }
      e.sum += v; e.count++
      edges.set(key, e)
    }
    const inbound: AggEdge[] = []
    const outbound: AggEdge[] = []
    const p = pivot
    edges.forEach(e => {
      if (e.to === p) inbound.push(e)
      else if (e.from === p) outbound.push(e)
    })
    inbound.sort((a,b)=>b.sum-a.sum)
    outbound.sort((a,b)=>b.sum-a.sum)
    const maxSum = Math.max(1, inbound[0]?.sum || 0, outbound[0]?.sum || 0)
    return { inbound, outbound, maxSum }
  }, [items, pivot])

  const scale = (v: number) => {
    const min = 1, max = 10
    const lv = Math.log10(v + 1)
    const lmax = Math.log10((maxSum || 1) + 1)
    return min + (lv / (lmax || 1)) * (max - min)
  }

  // Layout: inbound links/targets links anordnen, outbound rechts
  const width = 800
  const leftX = 140, rightX = width - 140
  const centerX = width / 2
  const padY = 34
  const H = Math.max(height + 140, Math.max(inbound.length, outbound.length) * (padY) + 240)

  const leftNodes = inbound.slice(0, 20).map((e, i) => ({ addr: e.from, y: 100 + i * padY, sum: e.sum }))
  const rightNodes = outbound.slice(0, 20).map((e, i) => ({ addr: e.to, y: 100 + i * padY, sum: e.sum }))
  const centerY = H / 2

  return (
    <div className="mb-24 overflow-auto" style={{ width: '100%' }}>
      <div className="text-sm mb-2 flex items-center gap-2">
        <span>Pivot:</span>
        <code className="px-1 rounded bg-slate-200 dark:bg-slate-700">{short(pivot, 6)}</code>
        {pivot !== wallet.toLowerCase() && (
          <button className="text-xs bg-slate-200 dark:bg-slate-700 rounded px-2 py-0.5" onClick={() => setPivot(wallet.toLowerCase())}>Zurück zum Wallet</button>
        )}
        <span className="text-xs text-gray-500 ml-auto">Klicke eine Adresse, um sie als Pivot zu setzen</span>
      </div>
      <svg width={width} height={H} className="block mx-auto">
        <defs>
          <marker id="arrow-in" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
          </marker>
          <marker id="arrow-out" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
          </marker>
        </defs>

        {/* inbound links */}
        {inbound.slice(0, leftNodes.length).map((e, i) => {
          const y = leftNodes[i].y
          const w = scale(e.sum)
          const d = `M ${leftX} ${y} C ${leftX+80} ${y}, ${centerX-80} ${centerY}, ${centerX} ${centerY}`
          return <path key={`in-${e.from}`} d={d} stroke="#10b981" strokeWidth={w} fill="none" markerEnd="url(#arrow-in)" opacity={0.8} />
        })}

        {/* outbound links */}
        {outbound.slice(0, rightNodes.length).map((e, i) => {
          const y = rightNodes[i].y
          const w = scale(e.sum)
          const d = `M ${centerX} ${centerY} C ${centerX+80} ${centerY}, ${rightX-80} ${y}, ${rightX} ${y}`
          return <path key={`out-${e.to}`} d={d} stroke="#3b82f6" strokeWidth={w} fill="none" markerEnd="url(#arrow-out)" opacity={0.8} />
        })}

        {/* left nodes */}
        {leftNodes.map(n => (
          <g key={n.addr} transform={`translate(${leftX},${n.y})`} onClick={() => setPivot(n.addr)} className="cursor-pointer">
            <circle r={12} fill="#10b981" />
            <text x={-16} y={-18} textAnchor="end" className="fill-slate-700 dark:fill-[#f7931a] cursor-pointer" fontSize={11}
              onClick={() => navigate(`/results/${n.addr}`)}>{short(n.addr,6)}</text>
            <text x={-10} y={12} textAnchor="end" className="fill-slate-500 dark:fill-slate-300" fontSize={10}>${Math.round(n.sum)}</text>
          </g>
        ))}

        {/* right nodes */}
        {rightNodes.map(n => (
          <g key={n.addr} transform={`translate(${rightX},${n.y})`} onClick={() => setPivot(n.addr)} className="cursor-pointer">
            <circle r={12} fill="#3b82f6" />
            <text x={10} y={-18} className="fill-slate-700 dark:fill-[#f7931a] cursor-pointer" fontSize={11}
              onClick={() => navigate(`/results/${n.addr}`)}>{short(n.addr,6)}</text>
            <text x={10} y={12} className="fill-slate-500 dark:fill-slate-300" fontSize={10}>${Math.round(n.sum)}</text>
          </g>
        ))}

        {/* center node */}
        <g transform={`translate(${centerX},${centerY})`}>
          <text textAnchor="middle" y={-26} className="fill-[#f7931a]" fontSize={12}>{short(pivot,6)}</text>
          <circle r={18} fill="#0ea5e9" />
          <text textAnchor="middle" y={28} className="fill-slate-500 dark:fill-slate-400" fontSize={10}>Pivot</text>
        </g>
      </svg>
    </div>
  )
}
