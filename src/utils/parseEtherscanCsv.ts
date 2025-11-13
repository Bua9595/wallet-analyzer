import type { ParsedActivity } from "../types/activity";

// Very tolerant CSV parser for Etherscan export (ETH normal txns)
export function parseEtherscanCsv(text: string, chainId = 1): ParsedActivity[] {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length <= 1) return []
  const header = lines[0].split(',').map(s => s.replace(/^"|"$/g, ''))
  const idx = (name: string) => header.findIndex(h => h.toLowerCase().startsWith(name.toLowerCase()))
  const iHash = idx('Transaction Hash')
  const iDate = idx('DateTime')
  const iFrom = idx('From')
  const iTo = idx('To')
  const iValIn = idx('Value_IN')
  const iValOut = idx('Value_OUT')
  const iCurrent = idx('CurrentValue')
  const iMethod = idx('Method')
  const out: ParsedActivity[] = []
  for (let li = 1; li < lines.length; li++) {
    const raw = splitCsvLine(lines[li])
    if (!raw || raw.length < 5) continue
    const txHash = strip(raw[iHash])
    if (!txHash) continue
    const timestamp = strip(raw[iDate])
    const from = strip(raw[iFrom])
    const to = strip(raw[iTo])
    const vin = toNumber(strip(raw[iValIn]))
    const vout = toNumber(strip(raw[iValOut]))
    const currentUsd = toNumber(strip(raw[iCurrent]))
    const method = (strip(raw[iMethod]) || '').toLowerCase()

    let type: ParsedActivity['type'] = 'unknown'
    if (method.includes('transfer')) type = 'transfer'
    else if (method.includes('swap')) type = 'swap'
    else if (method.includes('mint')) type = 'mint'
    else if (method.includes('burn')) type = 'burn'
    else if (method.includes('fulfill') || method.includes('atomic') || method.includes('order')) type = 'nft'

    // Prefer positive USD magnitude if present; fallback to zero (will be filtered out if user wants only USD)
    const amountUSD = Number.isFinite(currentUsd) ? currentUsd : (vin - vout) * 0 // avoid NaN

    out.push({
      id: `csv:${chainId}:${txHash}`,
      chainId,
      timestamp,
      type,
      from,
      to,
      amountUSD: Number.isFinite(amountUSD) ? amountUSD : undefined,
      txHash,
    })
  }
  return out
}

function splitCsvLine(line: string): string[] | null {
  // Handle quotes and commas
  const res: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQ = !inQ
    } else if (ch === ',' && !inQ) {
      res.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  res.push(cur)
  return res
}

function strip(s?: string) { return (s ?? '').replace(/^"|"$/g, '').trim() }
function toNumber(s?: string) { const n = Number((s||'').replace(/[^0-9.\-]/g,'')); return Number.isFinite(n) ? n : 0 }

