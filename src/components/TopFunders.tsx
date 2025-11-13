import { useMemo } from 'react'
import type { ParsedActivity } from '../types/activity'

type Props = { items: ParsedActivity[]; wallet: string; max?: number }

export default function TopFunders({ items, wallet, max = 10 }: Props) {
  const list = useMemo(() => {
    const inMap = new Map<string, { usd: number; count: number }>()
    const w = wallet.toLowerCase()
    for (const a of items) {
      const to = (a.to || '').toLowerCase()
      if (to !== w) continue
      const from = (a.from || 'unknown').toLowerCase()
      const v = typeof a.amountUSD === 'number' ? a.amountUSD : 0
      const e = inMap.get(from) || { usd: 0, count: 0 }
      e.usd += v; e.count++
      inMap.set(from, e)
    }
    return Array.from(inMap, ([addr, v]) => ({ addr, ...v }))
      .sort((a,b)=> (b.usd||0) - (a.usd||0) || b.count - a.count)
      .slice(0, max)
  }, [items, wallet, max])

  if (!list.length) return null

  const short = (s: string, n=4) => `${s.slice(0,2+n)}…${s.slice(-n)}`

  return (
    <div className="mb-4 p-3 border rounded dark:border-slate-700">
      <div className="text-sm font-medium mb-2">Top Funder (eingehend)</div>
      <div className="grid grid-cols-1 gap-1 text-xs">
        {list.map((x) => (
          <div key={x.addr} className="flex items-center justify-between">
            <a className="text-blue-600 dark:text-blue-400 underline" href={`#/results/${x.addr}`}>{short(x.addr,6)}</a>
            <div className="text-slate-600 dark:text-slate-300">${x.usd.toFixed(2)} • {x.count} tx</div>
          </div>
        ))}
      </div>
    </div>
  )
}

