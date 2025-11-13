import { useMemo, useState } from "react";
import type { ActivityType } from "../types/activity";

export type Filters = {
  chains: number[];
  types: ActivityType[];
  minUsd?: number | null;
  onlyUsdValued?: boolean; // true = nur Aktivitäten mit USD-Schätzung
  collapsePassThrough?: boolean; // Transfers bündeln (A -> X -> B mit gleichem Wert)
};

type Props = {
  availableChains: { id: number; name: string }[];
  availableTypes: ActivityType[];
  value: Filters;
  onChange: (next: Filters) => void;
};

export default function FilterBar({ availableChains, availableTypes, value, onChange }: Props) {
  const [minUsdDraft, setMinUsdDraft] = useState<string>(value.minUsd?.toString() ?? "");
  const toggleChain = (id: number) => {
    const set = new Set(value.chains);
    if (set.has(id)) set.delete(id); else set.add(id);
    onChange({ ...value, chains: Array.from(set) });
  };

  const toggleType = (t: ActivityType) => {
    const set = new Set(value.types);
    if (set.has(t)) set.delete(t); else set.add(t);
    onChange({ ...value, types: Array.from(set) as ActivityType[] });
  };

  const setMinUsdDraftSafe = (v: string) => {
    // Nur Zahlen oder leer erlauben
    setMinUsdDraft(v);
  };

  // Nutzerfreundliches Zahl-Parsing ("1.000,50", "1000", "1,5" etc.)
  const parseUserNumber = (raw: string): number | null => {
    const s = raw.trim();
    if (s === "") return null;
    const cleaned = s.replace(/[^0-9,\.\-]/g, "");
    let norm = cleaned;
    if (cleaned.includes(",") && cleaned.includes(".")) {
      const lastDot = cleaned.lastIndexOf(".");
      const lastComma = cleaned.lastIndexOf(",");
      const dec = lastDot > lastComma ? "." : ",";
      const thou = dec === "." ? "," : ".";
      norm = cleaned.replace(new RegExp(`\\${thou}`, 'g'), "").replace(dec, ".");
    } else if (cleaned.includes(",")) {
      norm = /,\d{1,2}$/.test(cleaned) ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
    }
    const n = Number(norm);
    return Number.isFinite(n) ? n : null;
  };

  const applyMinUsd = () => {
    const n = parseUserNumber(minUsdDraft);
    const valid = n == null ? null : Math.max(0.01, n);
    onChange({ ...value, minUsd: valid });
  };

  const clear = () => {
    setMinUsdDraft("");
    onChange({ chains: availableChains.map(c => c.id), types: availableTypes.slice(), minUsd: null, onlyUsdValued: true, collapsePassThrough: true });
  };

  const usdToggleChecked = useMemo(() => value.onlyUsdValued !== false, [value.onlyUsdValued]);

  return (
    <div className="mb-6 rounded border p-4 dark:border-slate-700">
      <div className="mb-3">
        <div className="font-medium mb-1">Chains</div>
        <div className="flex flex-wrap gap-3">
          {availableChains.map((c) => (
            <label key={c.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={value.chains.includes(c.id)}
                onChange={() => toggleChain(c.id)}
              />
              {c.name}
            </label>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <div className="font-medium mb-1">Types</div>
        <div className="flex flex-wrap gap-3">
          {availableTypes.map((t) => (
            <label key={t} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={value.types.includes(t)}
                onChange={() => toggleType(t)}
              />
              {t}
            </label>
          ))}
        </div>
      </div>
      <div className="mb-2 flex items-center gap-3 flex-wrap">
        <label className="text-sm">Min USD</label>
        <input
          className="border rounded p-1.5 text-sm w-28"
          type="text"
          inputMode="decimal"
          min={0.01}
          step={0.01}
          placeholder="≥ 0.01"
          value={minUsdDraft}
          onChange={(e) => setMinUsdDraftSafe(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyMinUsd(); } }}
        />
        <button type="button" className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1" onClick={applyMinUsd}>Anwenden</button>
        <label className="ml-1 text-sm flex items-center gap-1">
          <input type="checkbox" checked={usdToggleChecked} onChange={(e) => onChange({ ...value, onlyUsdValued: e.target.checked })} />
          Nur USD‑Wert
        </label>
        <label className="text-sm flex items-center gap-1">
          <input type="checkbox" checked={value.collapsePassThrough !== false} onChange={(e) => onChange({ ...value, collapsePassThrough: e.target.checked })} />
          Pass‑Through bündeln
        </label>
        <button type="button" className="ml-auto text-sm text-blue-700" onClick={clear}>Filter zurücksetzen</button>
      </div>
    </div>
  );
}
