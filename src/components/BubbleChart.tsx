import { useEffect, useMemo, useRef, useState } from "react"
import type { ParsedActivity } from "../types/activity"
import { CHAIN_NAME_BY_ID } from "../config/chains"

type Props = { items: ParsedActivity[]; height?: number }
type P = ParsedActivity & { r: number; x: number; y: number; value: number }

export default function BubbleChart({ items, height = 360 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 600, h: height })
  const [selected, setSelected] = useState<ParsedActivity | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const resize = () => setSize({ w: el.clientWidth || 600, h: height })
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    return () => ro.disconnect()
  }, [height])

  const data = useMemo(() => {
    const valued = items.filter(i => typeof i.amountUSD === 'number' && (i.amountUSD as number) > 0) as ParsedActivity[]
    const vals = valued.map(v => Math.log10((v.amountUSD as number) + 1))
    const max = Math.max(0.0001, ...vals)
    const minR = 12, maxR = 56
    const nodes: P[] = valued.map((a, idx) => {
      const v = vals[idx]
      const r = minR + (v / max) * (maxR - minR)
      return { ...(a as any), value: v, r, x: 0, y: 0 }
    })

    // Row packing without overlap, more space
    const gap = 12, rowGap = 24, margin = 28
    const width = Math.max(320, size.w)
    nodes.sort((a,b)=>b.r-a.r)
    const rows: P[][] = []
    let current: P[] = []
    let currentW = 0
    nodes.forEach(n => {
      const d = n.r*2
      if (current.length === 0 || currentW + (current.length?gap:0) + d <= (width - margin*2)) {
        current.push(n)
        currentW += (current.length>1?gap:0) + d
      } else {
        rows.push(current)
        current = [n]
        currentW = d
      }
    })
    if (current.length) rows.push(current)

    const rowHeights = rows.map(r => Math.max(...r.map(n=>n.r*2)))
    const totalH = rowHeights.reduce((s,h)=> s + h, 0) + rowGap*(rowHeights.length-1) + margin*2
    let y = margin
    rows.forEach((row, ri) => {
      const contentW = row.reduce((s,n)=> s + n.r*2, 0) + gap*(row.length-1)
      let x = Math.max(margin, (width - contentW)/2)
      const rowH = rowHeights[ri]
      row.forEach(n => {
        n.x = x + n.r
        n.y = y + rowH/2
        x += n.r*2 + gap
      })
      y += rowH + rowGap
    })
    ;(nodes as any).__vh = Math.max(size.h, totalH)
    return nodes
  }, [items, size.w, size.h])

  const colorByType = (t: string) => (
    t === 'transfer' ? '#3b82f6' :
    t === 'swap' ? '#10b981' :
    t === 'nft' ? '#a855f7' :
    t === 'mint' ? '#f59e0b' :
    t === 'burn' ? '#f97316' :
    t === 'bridge' ? '#ec4899' : '#64748b'
  )

  return (
    <div ref={ref} style={{ width: '100%' }} className="mb-32">
      <svg width={size.w} height={(data as any).__vh ?? size.h} className="block mx-auto">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#00000050" />
          </filter>
        </defs>
        {data.map((d, idx) => (
          <g key={d.id} transform={`translate(${d.x},${d.y})`}>
            <g className="cursor-pointer bubble bubble-float" style={{ animationDuration: `${8 + (idx % 5)}s`, animationDelay: `${(idx % 7) * 0.3}s` }} onClick={() => setSelected(d)}>
              <circle r={d.r} fill={colorByType(d.type)} filter="url(#shadow)" opacity={0.9} stroke="white" strokeWidth={1.25} className="dark:stroke-slate-900" />
              <text textAnchor="middle" dy="0.35em" fontSize={Math.max(11, d.r/3)} fill="white" className="pointer-events-none select-none">
                {Math.round(((d as any).amountUSD ?? 0) as number)}$
              </text>
              <title>{`${d.type} • ${d.chainId}\n${new Date(d.timestamp).toLocaleString()}\n$${(d.amountUSD ?? 0).toFixed(2)}\n${d.txHash}`}</title>
            </g>
          </g>
        ))}
      </svg>
      {data.length === 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-300">Keine bewerteten Aktivitäten für die aktuelle Auswahl.</div>
      )}
      {selected && (
        <div className="mt-3 p-3 border rounded dark:border-slate-700">
          <div className="text-sm font-medium mb-1">Details</div>
          <div className="text-xs">Kette: {String(CHAIN_NAME_BY_ID.get(selected.chainId) ?? selected.chainId)}</div>
          <div className="text-xs">Typ: {selected.type}</div>
          <div className="text-xs">Zeit: {new Date(selected.timestamp).toLocaleString()}</div>
          {typeof selected.amountUSD === 'number' && <div className="text-xs">USD: ${selected.amountUSD.toFixed(2)}</div>}
          <div className="text-xs break-all">Tx: {selected.txHash}</div>
          <button className="mt-2 text-xs bg-slate-200 dark:bg-slate-700 rounded px-2 py-0.5" onClick={() => setSelected(null)}>Schließen</button>
        </div>
      )}
    </div>
  )
}

