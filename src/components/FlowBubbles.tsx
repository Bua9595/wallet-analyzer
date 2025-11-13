﻿import { useMemo, useState } from "react"
import type { ParsedActivity } from "../types/activity"

function short(addr: string, n = 4) { return addr ? `${addr.slice(0, 2 + n)}…${addr.slice(-n)}` : '' }

type Props = { items: ParsedActivity[]; wallet: string }

export default function FlowBubbles({ items, wallet }: Props) {
  const [selected, setSelected] = useState<{ side: 'in'|'out'; addr: string; sum: number } | null>(null)

  const { inbound, outbound, inTotal, outTotal } = useMemo(() => {
    // Heuristic de-duplication: same direction + counterparty + rounded USD within 72h → keep earliest
    const uniq: ParsedActivity[] = []
    const seen = new Map<string, number>()
    for (const a of items) {
      const v = typeof a.amountUSD === 'number' ? a.amountUSD : 0
      if (v <= 0) continue
      const ts = +new Date(a.timestamp)
      const dir = a.to?.toLowerCase() === wallet.toLowerCase() ? 'in' : (a.from?.toLowerCase() === wallet.toLowerCase() ? 'out' : null)
      if (!dir) continue
      const counter = dir === 'in' ? (a.from || 'unknown').toLowerCase() : (a.to || 'unknown').toLowerCase()
      const rounded = Math.round(v)
      const keyBase = `${dir}:${rounded}`
      const key = a.type === 'unknown' ? keyBase : `${keyBase}:${counter}`
      const last = seen.get(key)
      if (last != null && Math.abs(ts - last) <= 1000 * 60 * 60 * 72) {
        continue
      }
      seen.set(key, ts)
      uniq.push(a)
    }
    const inbound = new Map<string, { sum: number; count: number }>()
    const outbound = new Map<string, { sum: number; count: number }>()
    for (const a of uniq) {
      const v = typeof a.amountUSD === 'number' ? a.amountUSD : 0
      if (!v) continue
      if (a.to?.toLowerCase() === wallet.toLowerCase()) {
        const key = (a.from || 'unknown')
        const e = inbound.get(key) || { sum: 0, count: 0 }
        e.sum += v; e.count++
        inbound.set(key, e)
      } else if (a.from?.toLowerCase() === wallet.toLowerCase()) {
        const key = (a.to || 'unknown')
        const e = outbound.get(key) || { sum: 0, count: 0 }
        e.sum += v; e.count++
        outbound.set(key, e)
      }
    }
    const toArr = (m: Map<string, { sum: number; count: number }>) => Array.from(m, ([addr, v]) => ({ addr, ...v }))
      .sort((a, b) => b.sum - a.sum).slice(0, 16)
    const inA = toArr(inbound)
    const outA = toArr(outbound)
    const inTotal = inA.reduce((s, x) => s + x.sum, 0)
    const outTotal = outA.reduce((s, x) => s + x.sum, 0)
    return { inbound: inA, outbound: outA, inTotal, outTotal }
  }, [items, wallet])

  const scale = (v: number, max: number) => {
    const minR = 10, maxR = 44
    if (max <= 0) return minR
    const lv = Math.log10(v + 1)
    const lmax = Math.log10(max + 1)
    return minR + (lv / lmax) * (maxR - minR)
  }

  const inMax = Math.max(...inbound.map(x => x.sum), 0)
  const outMax = Math.max(...outbound.map(x => x.sum), 0)

  const rowsEstimate = (len: number) => Math.ceil(len / 4)
  const minH = Math.max(rowsEstimate(inbound.length), rowsEstimate(outbound.length)) * 120 + 140

  return (
    <div className="mb-32">
      <div className="grid grid-cols-3 gap-2" style={{ minHeight: minH }}>
        <div>
          <div className="text-sm font-medium mb-2">Eingehend (${inTotal.toFixed(2)})</div>
          <div className="flex flex-wrap gap-3 p-2">
            {inbound.map(n => (
              <div key={n.addr} className="relative" onClick={() => { location.hash = `#/results/${n.addr}` }}>
                <div className="rounded-full flex items-center justify-center text-white shadow ring-2 ring-white/60 dark:ring-slate-800" style={{ width: scale(n.sum, inMax) * 2 + 6, height: scale(n.sum, inMax) * 2 + 6, background: '#10b981' }}>
                  <span className="text-xs pointer-events-none select-none">{Math.round(n.sum)}</span>
                </div>
                <div className="text-[11px] text-gray-600 dark:text-[#f7931a] text-center w-full">{short(n.addr)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="rounded-full w-28 h-28 bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-100">
            {short(wallet, 6)}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium mb-2">Ausgehend (${outTotal.toFixed(2)})</div>
          <div className="flex flex-wrap gap-3 p-2 justify-end">
            {outbound.map(n => (
              <div key={n.addr} className="relative" onClick={() => { location.hash = `#/results/${n.addr}` }}>
                <div className="rounded-full flex items-center justify-center text-white shadow ring-2 ring-white/60 dark:ring-slate-800" style={{ width: scale(n.sum, outMax) * 2 + 6, height: scale(n.sum, outMax) * 2 + 6, background: '#3b82f6' }}>
                  <span className="text-xs pointer-events-none select-none">{Math.round(n.sum)}</span>
                </div>
                <div className="text-[11px] text-gray-600 dark:text-[#f7931a] text-center w-full">{short(n.addr)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {selected && (
        <div className="mt-4 p-3 border rounded dark:border-slate-700">
          <div className="text-sm mb-1">Details</div>
          <div className="text-xs text-slate-700 dark:text-slate-200">Richtung: {selected.side==='in'?'Eingehend':'Ausgehend'}</div>
          <div className="text-xs text-slate-700 dark:text-[#f7931a]">Adresse: {short(selected.addr, 8)}</div>
          <div className="text-xs text-slate-700 dark:text-slate-200">Summe: ${selected.sum.toFixed(2)}</div>
          <button className="mt-2 text-xs bg-slate-200 dark:bg-slate-700 rounded px-2 py-0.5" onClick={() => setSelected(null)}>Schließen</button>
        </div>
      )}
    </div>
  )
}
