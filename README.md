# Wallet Analyzer (Vite + React + TS)

Kurzanleitung in Deutsch: Setup, Starten und API‑Key.

## Warum ein API‑Key?
- Die App liest Transaktionsverläufe über den Dienst "Covalent" (https://www.covalenthq.com/).
- Covalent aggregiert Blockchain‑Daten über viele Chains in einer API. Ohne Key antwortet der Dienst nicht.

## API‑Key beschaffen
1. https://www.covalenthq.com/platform/ öffnen
2. Kostenlos registrieren/anmelden (E‑Mail, GitHub oder Google möglich)
3. Im Dashboard unter "API Keys" neuen Schlüssel erzeugen
4. Schlüssel kopieren (Format: `cqt_...` oder `ckey_...`)

## API‑Key eintragen
- Variante A (einfach): In der App erscheint eine Karte "Covalent API‑Key erforderlich" → Key einfügen → Speichern. Der Key bleibt lokal im Browser gespeichert (localStorage).
- Variante B (Datei): Datei `wallet-analyzer/.env` erstellen und eintragen:

```
VITE_COVALENT_KEY=cqt_oder_ckey_dein_schluessel
```

Danach den Dev‑Server neu starten.

Hinweis: In einer reinen Browser‑App ist der Key sichtbar und rate‑limitiert. Für produktive Nutzung empfiehlt sich ein kleiner Proxy‑Server.

## Starten
- Entwicklung: `StartDev.cmd` doppelklicken → http://localhost:5173
- Vorschau/Prod: `StartPreview.cmd` doppelklicken → http://localhost:4173
- Statisch aus `dist`: `ServeDist.cmd` → http://localhost:8080

## Sonstiges
- Vite lädt `.env` automatisch aus dem Projektordner. Die Datei ist in `.gitignore` ausgeschlossen.
