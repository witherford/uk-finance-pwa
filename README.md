# UK Finance & Budget — PWA

An offline-first, installable Progressive Web App for personal finance and budgeting in the UK.

## Features
- UK PAYE / Self-employed tax engine (2025/26 reference figures, England/Wales/NI + Scotland; tax-code aware: `1257L`, `K475`, `BR/D0/D1/0T/NT`, `S` and `C` prefixes, W1/M1/X)
- National Insurance Class 1 / Class 2 / Class 4
- Pension contributions: relief-at-source, net-pay, salary sacrifice, employer match; long-term projection
- Side incomes with optional taxable flag
- Bills, debts, savings: categories with colours, frequencies (daily → yearly + custom), provider, account/policy ref, optional end dates, sortable by category / cost / alpha / due date
- Holidays goal tracker with progress bars
- Yearly events: birthdays, vehicle servicing, insurance renewals (one-off or recurring)
- Calendar GUI: week / month / quarter / 6-month / 12-month views
- ICS export of all upcoming bills/debts/savings/events for calendar apps
- Financial breakdown: daily / weekly / fortnightly / monthly / yearly; pie + bar charts
- Savings projector with compound interest
- Calculator with labelled, persistent memory
- CSV / XLSX import with sample template, plus JSON / CSV / XLSX backups
- Single-click PNG snapshot of dashboard (with Web Share where supported)
- Light / dark / system theme
- Optional password (PBKDF2 + AES-GCM, all client-side); the only password recovery is a full data wipe
- Learning centre: jargon, PAYE, self-employed, NI classes, tax types, sick pay, annual leave, support payments

## Getting started
```bash
npm install
npm run dev
```
Then open http://localhost:5173.

```bash
npm run build    # production build (also runs tsc)
npm run preview  # preview production build
```

## Tech
Vite · React 18 · TypeScript · Tailwind · Zustand · Dexie (IndexedDB) · SheetJS · PapaParse · ics · date-fns · Recharts · mathjs · html-to-image · Web Crypto · vite-plugin-pwa

## Disclaimer
This app provides general guidance based on 2025/26 reference figures and is not financial, tax or legal advice. Always verify against gov.uk.

## License
MIT
