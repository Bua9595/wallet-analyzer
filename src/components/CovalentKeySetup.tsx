import { useState } from 'react'
import { setCovalentKey } from '../api/covalentRequest'

type Props = { onSaved?: () => void }

export default function CovalentKeySetup({ onSaved }: Props) {
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(false)

  const save = () => {
    if (!key.trim()) return
    setCovalentKey(key.trim())
    setSaved(true)
    onSaved?.()
  }

  return (
    <div className="p-4 border rounded-lg bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700">
      <h2 className="text-lg font-semibold mb-2">GoldRush/Covalent API‑Key erforderlich</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
        Hole dir kostenlos einen API‑Key bei covalenthq.com und füge ihn hier ein. Der Key wird nur lokal in deinem Browser gespeichert.
      </p>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          className="border rounded px-2 py-1 flex-1"
          placeholder="cqt_... oder ckey_..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1">
          Speichern
        </button>
      </div>
      {saved && <div className="text-green-700 text-sm">Gespeichert. Lade die Seite neu oder starte die Suche erneut.</div>}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer">Woher bekomme ich den Key?</summary>
        <ol className="list-decimal ml-5 mt-1">
          <li>GoldRush/Covalent öffnen: https://www.covalenthq.com/ → „GoldRush API“ → „Get API Key“</li>
          <li>Im Dashboard einen API‑Key erzeugen</li>
          <li>Den Schlüssel (beginnend mit <code>cqt_</code> oder <code>ckey_</code>) hier einfügen</li>
        </ol>
      </details>
    </div>
  )
}
