import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ParsedActivity } from '../types/activity'
import { CHAIN_COLOR_BY_ID } from '../config/chains'

type Props = { items: ParsedActivity[]; wallet: string; topN?: number }

function short(addr: string, n = 4) { return addr ? `${addr.slice(0, 2 + n)}…${addr.slice(-n)}` : '' }

export default function RadialBubbleMap({ items, wallet, topN = 60 }: Props) {
  const navigate = useNavigate()
  const [pivot, setPivot] = useState(wallet.toLowerCase())

  const nodes = useMemo(() => {
    const sums = new Map<string, { addr: string; chainId: number; dir: 'in'|'out'; usd: number }>()
    for (const a of items) {
      const v = typeof a.amountUSD === 'number' ? a.amountUSD : 0
      if (v <= 0) continue
      const from = (a.from||'').toLowerCase(); const to = (a.to||'').toLowerCase()
      if (!from || !to) continue
      if (to === pivot) {
        const key = `in:${a.chainId}:${from}`
        const e = sums.get(key) || { addr: from, chainId: a.chainId, dir: 'in' as const, usd: 0 }
        e.usd += v; sums.set(key, e)
      } else if (from === pivot) {
        const key = `out:${a.chainId}:${to}`
        const e = sums.get(key) || { addr: to, chainId: a.chainId, dir: 'out' as const, usd: 0 }
        e.usd += v; sums.set(key, e)
      }
    }
    const arr = Array.from(sums.values()).sort((a,b)=>b.usd-a.usd).slice(0, topN)
    const max = Math.max(1, ...arr.map(x=>x.usd))
    const minR = 12, maxR = 52
    const prelim = arr.map((n,i)=>{
      const rv = Math.log10(n.usd+1)/Math.log10(max+1)
      const r = minR + rv*(maxR-minR)
      // Basiskurve: in links, out rechts – danach Kollisionsauflösung auf y-Achse
      const angle = (n.dir==='in'? Math.PI : 0) + (i/arr.length - 0.5)*1.6
      const dist = 180 + (i%24)*6
      const x = Math.cos(angle)*dist
      const y = Math.sin(angle)*dist
      return { ...n, r, x, y, color: CHAIN_COLOR_BY_ID.get(n.chainId) || '#64748b' }
    })
    // Kollisionsauflösung separat für in/out: vertikal auseinander schieben
    function separate(dir: 'in'|'out') {
      const g = prelim.filter(p=>p.dir===dir).sort((a,b)=>a.y-b.y)
      const pad = 10
      for (let i=1;i<g.length;i++){
        const prev=g[i-1], cur=g[i]
        const minGap = prev.r + cur.r + pad
        if (cur.y - prev.y < minGap) {
          const delta = minGap - (cur.y - prev.y)
          cur.y += delta
        }
      }
      // rückwärts, um Ketten zu entspannen
      for (let i=g.length-2;i>=0;i--){
        const next=g[i+1], cur=g[i]
        const minGap = cur.r + next.r + pad
        if (next.y - cur.y < minGap) {
          const delta = minGap - (next.y - cur.y)
          cur.y -= delta
        }
      }
    }
    separate('in'); separate('out')
    return prelim
  }, [items, pivot, topN])

  const W = 860
  const cx = W/2
  const minY = Math.min(0, ...nodes.map(n=>n.y))
  const maxY = Math.max(0, ...nodes.map(n=>n.y))
  const H = Math.max(480, (maxY - minY) + 260)
  const cy = H/2 - (minY + maxY)/2

  return (
    <div className="mb-24">
      <div className="text-sm mb-2 flex items-center gap-2">
        <span>Pivot:</span>
        <code className="px-1 rounded bg-slate-200 dark:bg-slate-700">{short(pivot,6)}</code>
        {pivot!==wallet.toLowerCase() && (
          <button className="text-xs bg-slate-200 dark:bg-slate-700 rounded px-2 py-0.5" onClick={()=>setPivot(wallet.toLowerCase())}>Zurück</button>
        )}
        <span className="text-xs text-gray-500 ml-auto">In=links, Out=rechts. Klick auf Bubble → neuer Pivot.</span>
      </div>
      <svg width={W} height={H} className="block mx-auto">
        <defs>
          <marker id="arrow-line" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
          </marker>
        </defs>
        {/* Verbindungs-Linien zum Pivot */}
        {nodes.map(n => (
          <line key={`ln-${n.addr}-${n.chainId}`} x1={cx} y1={cy} x2={cx+n.x} y2={cy+n.y} stroke={n.color} strokeWidth={1.5} opacity={0.5} markerEnd="url(#arrow-line)" />
        ))}
        {/* Subtile Verbindung zwischen Bubbles gleicher Richtung (der Reihenfolge nach) */}
        {(['in','out'] as const).map(dir => {
          const g = nodes.filter(n=>n.dir===dir).sort((a,b)=>a.y-b.y)
          if (g.length < 2) return null
          const path = g.map((n,i)=>`${i===0?'M':'L'} ${cx+n.x} ${cy+n.y}`).join(' ')
          return <path key={`chain-${dir}`} d={path} stroke={dir==='in'?'#10b981':'#3b82f6'} strokeWidth={0.75} opacity={0.35} fill="none" />
        })}
        {/* Bubbles */}
        {nodes.map(n => (
          <g key={`${n.addr}-${n.chainId}`} transform={`translate(${cx+n.x},${cy+n.y})`} className="cursor-pointer" onClick={()=>navigate(`/results/${n.addr}`)}>
            <circle r={n.r} fill={n.color} opacity={0.9} stroke="#ffffff" strokeWidth={1.5} className="dark:stroke-slate-900" />
            <text textAnchor="middle" dy="0.35em" fontSize={Math.max(11, n.r/3)} fill="white">{Math.round(n.usd)}</text>
            <text textAnchor="middle" y={-(n.r + 12)} className="fill-slate-700 dark:fill-[#f7931a]" fontSize={11}>{short(n.addr,6)}</text>
            <title>{`${short(n.addr,6)} • ${n.dir==='in'?'Eingehend':'Ausgehend'} • $${n.usd.toFixed(2)}`}</title>
          </g>
        ))}
        {/* Pivot */}
        <g transform={`translate(${cx},${cy})`}>
          <text textAnchor="middle" y={-26} className="fill-[#f7931a]" fontSize={12}>{short(pivot,6)}</text>
          <circle r={20} fill="#0ea5e9" />
          <text textAnchor="middle" y={30} className="fill-slate-500 dark:fill-slate-400" fontSize={10}>Pivot</text>
        </g>
      </svg>
    </div>
  )
}
