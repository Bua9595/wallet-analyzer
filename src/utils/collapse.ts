import type { ParsedActivity } from '../types/activity'

export type CollapseOptions = {
  windowMinutes?: number
  amountTolerance?: number // relative tolerance, e.g., 0.01 = 1%
}

export function collapsePassThrough(items: ParsedActivity[], opts: CollapseOptions = {}): ParsedActivity[] {
  const windowMs = Math.max(1, (opts.windowMinutes ?? 60)) * 60 * 1000
  const tol = Math.max(0, opts.amountTolerance ?? 0.01)
  const consumed = new Set<string>()
  const byMiddle = new Map<string, ParsedActivity[]>()
  const sorted = [...items].sort((a,b)=> +new Date(a.timestamp) - +new Date(b.timestamp))

  for (const it of sorted) {
    if (it.type !== 'transfer') continue
    const midIn = (it.to || '').toLowerCase()
    if (!midIn) continue
    const arr = byMiddle.get(midIn) || []
    arr.push(it)
    byMiddle.set(midIn, arr)
  }

  const out: ParsedActivity[] = []
  const candidateOut = new Map<string, ParsedActivity[]>() // middle -> outgoing list
  for (const it of sorted) {
    if (it.type !== 'transfer') continue
    const midOut = (it.from || '').toLowerCase()
    if (!midOut) continue
    const arr = candidateOut.get(midOut) || []
    arr.push(it)
    candidateOut.set(midOut, arr)
  }

  // Build collapsed
  for (const [mid, ins] of byMiddle) {
    const outs = (candidateOut.get(mid) || []).slice()
    let j = 0
    for (const inn of ins) {
      if (consumed.has(inn.id)) continue
      // advance outs index near time
      const tIn = +new Date(inn.timestamp)
      while (j < outs.length && +new Date(outs[j].timestamp) < tIn) j++
      let best: ParsedActivity | null = null
      let bestIdx = -1
      for (let k = j; k < outs.length; k++) {
        const o = outs[k]
        if (consumed.has(o.id)) continue
        const dt = +new Date(o.timestamp) - tIn
        if (dt < 0) continue
        if (dt > windowMs) break
        if (inn.chainId !== o.chainId) continue
        // compare token/amount or USD
        const sameToken = (!!inn.token && !!o.token) ? (inn.token === o.token) : true
        let match = false
        if (inn.amount != null && o.amount != null) {
          const a = inn.amount, b = o.amount
          match = Math.abs(a - b) <= Math.max(a,b) * tol
        } else if (inn.amountUSD != null && o.amountUSD != null) {
          const a = inn.amountUSD, b = o.amountUSD
          match = Math.abs(a - b) <= Math.max(a,b) * tol
        }
        if (sameToken && match) { best = o; bestIdx = k; break }
      }
      if (best) {
        consumed.add(inn.id); consumed.add(best.id)
        const amount = inn.amount != null ? (Math.min(inn.amount!, best.amount ?? inn.amount) ) : undefined
        const amountUSD = inn.amountUSD != null ? (Math.min(inn.amountUSD!, best.amountUSD ?? inn.amountUSD) ) : (best.amountUSD ?? undefined)
        out.push({
          id: `collapsed:${inn.id}>${best.id}`,
          chainId: inn.chainId,
          timestamp: best.timestamp,
          type: 'transfer',
          from: inn.from,
          to: best.to,
          token: inn.token || best.token,
          amount,
          amountUSD,
          txHash: best.txHash,
          meta: { collapsed: true, via: mid, inId: inn.id, outId: best.id }
        })
      }
    }
  }

  // Keep non-consumed originals and add collapsed
  for (const it of items) if (!consumed.has(it.id)) out.push(it)
  // Sort newest first as before
  return out.sort((a,b)=> +new Date(b.timestamp) - +new Date(a.timestamp))
}

