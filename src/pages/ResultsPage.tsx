import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { DEFAULT_CHAINS } from "../config/chains";
import { fetchAllChainsTransactions, getCovalentKey } from "../api/covalentRequest";
import { parseTransactionsV3 } from "../utils/parse";
import { collapsePassThrough } from "../utils/collapse";
import Spinner from "../components/Spinner";
import ActivityCard from "../components/ActivityCard";
import FilterBar, { type Filters } from "../components/FilterBar";
import CovalentKeySetup from "../components/CovalentKeySetup";
import BubbleChart from "../components/BubbleChart";
import FlowBubbles from "../components/FlowBubbles";
import FlowGraph from "../components/FlowGraph";
import RadialBubbleMap from "../components/RadialBubbleMap";
import PathSankey from "../components/PathSankey";
import TopFunders from "../components/TopFunders";
import type { ActivityType } from "../types/activity";
import { parseEtherscanCsv } from "../utils/parseEtherscanCsv";

export default function ResultsPage() {
  const { wallet } = useParams<{ wallet: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [csvActivities, setCsvActivities] = useState<any[]>([]);
  const [reloadTick, setReloadTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [filters, setFilters] = useState<Filters>({ chains: DEFAULT_CHAINS.map(c => c.id), types: ["transfer","swap","mint","burn","bridge","nft","unknown"], minUsd: null, onlyUsdValued: false, collapsePassThrough: true });
  // Nur ausgewählte Chains wirklich fetchen (spart API-Limits)
  const chainIds = useMemo(() => filters.chains.slice(), [filters.chains]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        if (!getCovalentKey()) {
          return; // Key fehlt â†’ UI zeigt Setup-Komponente
        }
        const all = await fetchAllChainsTransactions(chainIds, wallet!);
        const parsed = all.flatMap(({ chainId, items }) => parseTransactionsV3(items, chainId));
        if (mounted) setActivities(parsed.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)));
      } catch (e: any) {
        if (mounted) setError(e?.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (wallet) run();
    return () => {
      mounted = false;
    };
  }, [wallet, chainIds, reloadTick]);

  // Merge API activities with CSV-imported ones (persist across reloads)
  const mergedActivities = useMemo(() => {
    // Merge by id first, then de-duplicate by txHash across sources
    const byId = new Map<string, any>();
    for (const a of activities) byId.set(a.id, a);
    for (const c of csvActivities) if (!byId.has(c.id)) byId.set(c.id, c);
    const arr = Array.from(byId.values());
    const byHash = new Map<string, any>();
    for (const it of arr) {
      const key = String(it.txHash || it.id);
      const prev = byHash.get(key);
      if (!prev) {
        byHash.set(key, it);
      } else {
        // Prefer entry with defined/greater USD estimate
        const a = typeof (it.amountUSD) === 'number' ? it.amountUSD : -Infinity;
        const b = typeof (prev.amountUSD) === 'number' ? prev.amountUSD : -Infinity;
        if (a > b) byHash.set(key, it);
      }
    }
    const base = Array.from(byHash.values()).sort((a,b)=> +new Date(b.timestamp) - +new Date(a.timestamp));
    return (filters.collapsePassThrough === false) ? base : collapsePassThrough(base, { windowMinutes: 60, amountTolerance: 0.01 });
  }, [activities, csvActivities, filters.collapsePassThrough]);

  const filtered = useMemo(() => {
    return mergedActivities.filter(a => {
      if (!filters.chains.includes(a.chainId)) return false;
      if (!filters.types.includes(a.type as ActivityType)) return false;
      const hasUsd = typeof a.amountUSD === 'number';
      // Wenn "Nur USD-Wert" aktiv ist, ohne Preis verwerfen
      if (filters.onlyUsdValued !== false && !hasUsd) return false;
      // Wenn eine Min-USD-Grenze gesetzt ist, Einträge ohne Preis ausschließen
      if (filters.minUsd != null && !hasUsd) return false;
      // Falls Preis vorhanden, auf Mindestwert prüfen
      if (filters.minUsd != null && hasUsd && (a.amountUSD as number) < (filters.minUsd ?? 0)) return false;
      return true;
    });
  }, [mergedActivities, filters]);

  const availableTypes: ActivityType[] = ["transfer","swap","mint","burn","bridge","nft","unknown"];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Timeline</h1>
      <div className="text-sm text-gray-600 mb-2 break-all">Wallet: {wallet}</div>
      <div className="mb-3 flex items-center gap-2">
        <button className="text-sm bg-slate-200 hover:bg-slate-300 rounded px-2 py-1" onClick={() => setReloadTick((t) => t + 1)}>Aktualisieren</button>
        <span className="text-xs text-gray-500">Einträge: {filtered.length} / {mergedActivities.length}</span>
        <span className="mx-2">|</span>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const txt = await f.text();
          const extra = parseEtherscanCsv(txt, 1);
          setCsvActivities(prev => {
            const ids = new Set(prev.map(p => p.id));
            const merged = [...prev];
            for (const x of extra) if (!ids.has(x.id)) merged.push(x);
            return merged.sort((a,b) => +new Date(b.timestamp) - +new Date(a.timestamp));
          })
        }} />
        <button className="text-sm bg-slate-200 hover:bg-slate-300 rounded px-2 py-1" onClick={() => fileInputRef.current?.click()}>CSV importieren</button>
      </div>
      {!getCovalentKey() && (
        <CovalentKeySetup onSaved={() => {
          // einfache Variante: Seite neu laden, damit der Effekt erneut lÃ¤uft
          location.reload();
        }} />
      )}
      <FilterBar availableChains={DEFAULT_CHAINS} availableTypes={availableTypes} value={filters} onChange={setFilters} />
      {!loading && !error && <TopFunders items={mergedActivities as any} wallet={wallet!} />}
      {loading && <Spinner />}
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-sm text-gray-500">Keine Aktivitäten gefunden.</div>
      )}
      {!loading && !error && filtered.map((a) => <ActivityCard key={a.id} a={a} />)}
      {!loading && !error && (
        <>
          {/* Primär: radiale BubbleMap (ähnlich bubblemaps.io) */}
          {wallet && <RadialBubbleMap items={filtered as any} wallet={wallet} />}
          {/* Pfad-Rekonstruktion (Top 30, USD-aggregiert) */}
          {wallet && <PathSankey items={filtered as any} wallet={wallet} topN={30} />}
          {/* Sekundär: gerichtete Flows um Pivot */}
          {wallet && <FlowGraph items={filtered as any} wallet={wallet} />}
          {/* Sekundär: Größenradar + Ein-/Aus-Bubbles */}
          <BubbleChart items={filtered as any} />
          {wallet && <FlowBubbles items={filtered as any} wallet={wallet} />}
        </>
      )}
    </div>
  );
}








