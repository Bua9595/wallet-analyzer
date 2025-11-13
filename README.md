# Wallet Analyzer (Vite + React + TS)

Kurzanleitung auf Deutsch: Setup, Start und Nutzung (inkl. API‑Key, Filter, CSV).

## Warum ein API‑Key?
- Die App liest Transaktionsverläufe über den Dienst „Covalent“ (https://www.covalenthq.com/).
- Covalent aggregiert Blockchain‑Daten vieler Chains in einer API. Ohne Key antwortet der Dienst nicht.

## API‑Key beschaffen
1. https://www.covalenthq.com/platform/ öffnen
2. Kostenlos registrieren/anmelden (E‑Mail, GitHub oder Google möglich)
3. Im Dashboard unter „API Keys“ neuen Schlüssel erzeugen
4. Schlüssel kopieren (Format: `cqt_...` oder `ckey_...`)

## API‑Key eintragen
- Variante A (einfach): In der App erscheint eine Karte „Covalent API‑Key erforderlich“ → Key einfügen → Speichern. Der Key bleibt lokal im Browser (localStorage).
- Variante B (Datei): Datei `wallet-analyzer/.env` erstellen und eintragen:

```
VITE_COVALENT_KEY=cqt_oder_ckey_dein_schluessel
```

Danach den Dev‑Server neu starten.

Hinweis: In einer reinen Browser‑App ist der Key sichtbar und rate‑limitiert. Für produktive Nutzung empfiehlt sich ein kleiner Proxy‑Server.

## Starten (Windows per Doppelklick)
- Entwicklung: `StartDev.cmd` → http://localhost:5173
- Vorschau/Prod: `StartPreview.cmd` → http://localhost:4173
- Statisch aus `dist`: `ServeDist.cmd` → http://localhost:8080

## Starten (Terminal mit npm)
1) In den Projektordner wechseln: `cd wallet-analyzer`
2) Abhängigkeiten installieren: `npm install`
3) Entwicklung: `npm run dev` (optional: `npm run dev -- --host` für LAN)
4) Produktionsvorschau: `npm run build` und danach `npm run preview`
5) Nur statisch ausliefern: `npm run build` und danach `node serve-dist.mjs`

Hinweis: Es gibt bewusst kein `npm start`. Nutze in der Entwicklung `npm run dev`. Auf Wunsch kann in `package.json` ein Alias `"start": "vite"` ergänzt werden.

## Repository klonen
- SSH: `git clone git@github.com:Bua9595/wallet-analyzer.git`
- HTTPS: `git clone https://github.com/Bua9595/wallet-analyzer.git`
- Danach: `cd wallet-analyzer && npm install`

## Filter und CSV
- CSV‑Import: Über „CSV importieren“ können z. B. Etherscan‑CSV‑Dateien geladen werden; sie werden mit den API‑Ergebnissen zusammengeführt.
- Min USD: Zahl eingeben und „Anwenden“. Es werden nur Einträge mit USD‑Preis ≥ Grenzwert gezeigt. Eingaben wie `1000`, `1.000,50` oder `1,5` werden akzeptiert.
- Nur USD‑Wert: blendet Einträge ohne USD‑Preis aus.
- Pass‑Through bündeln: fasst aufeinanderfolgende Transfers mit gleichem Betrag innerhalb kurzer Zeit zusammen.

## Sonstiges
- Vite lädt `.env` automatisch aus dem Projektordner. Die Datei ist in `.gitignore` ausgeschlossen.
- Typische Probleme:
  - „Missing script: dev“ → Im Unterordner `wallet-analyzer` arbeiten (`cd wallet-analyzer`).
  - Kein API‑Key → In der UI eingeben oder `.env` anlegen und neu starten.
  - Port belegt → Anderen Port wählen: `npm run dev -- --port 5174`.

