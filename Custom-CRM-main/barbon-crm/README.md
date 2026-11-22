# Barbon Media Group CRM

A standalone, local-first web app for tracking Instagram outreach to property
prospects. Attio-inspired table UI, message generator, follow-up automation,
custom KPIs, a success/failure checklist, and a purpose-driven dashboard.

No build step, no accounts, no internet required after first load. Your data is
saved in the browser and can be exported/imported as a backup.

## Running it

You need a tiny local web server (the app uses ES modules, which browsers block
over `file://`). Python is already on your Mac:

```bash
cd "Custom CRM App/barbon-crm"
python3 serve.py
```

Then open **http://localhost:4173** in Chrome, Edge, or Safari.

To install it like a native app: in Chrome/Edge click the install icon in the
address bar; on iPhone Safari use Share → *Add to Home Screen*. It then works
offline and can send follow-up reminders.

> Tip: keep the `python3 serve.py` terminal open while you use the app. To have
> it always available you can add it to login items, or run it whenever you sit
> down to do outreach.

## What's inside

- **Home** — daily KPI progress, today's due follow-ups, checklist status, and a
  rotating quote (Hormozi / Napoleon Hill / Stoicism / Christianity) framed
  around servitude and honour.
- **Today** — the exact ordered list of who to message next, so you never have
  to decide. Overdue follow-ups first, then fresh prospects.
- **Pipeline** — Attio-style grouped table (Interested / Ideal Leads / Leads /
  Unsure / Not Ideal). Search, filter, inline stage tracking, click a row for
  the full detail drawer. Rows move between groups manually or via automations.
- **Messages** — 3 distinct variants of the first DM and each follow-up stage,
  per service type, in your voice. `{name}` auto-fills. The app rotates variants
  and never repeats one to the same person.
- **KPIs** — build your own daily/weekly targets. Some track themselves (DMs
  sent, replies, new prospects); others you tap to log.
- **Standard** — define what a winning/failing day looks like, check items off,
  and watch your streak and 120-day track record.
- **Automations** — WHEN/THEN rules (e.g. positive reply → Interested) with a
  master on/off switch and per-rule toggles. Build your own over time.
- **Settings** — light/dark/system theme, groups, send guardrails (daily cap,
  skip weekends, randomised timing), notifications, CSV import with duplicate
  detection, and JSON/CSV backup + restore.

## Sending is manual (by design)

To stay clear of Instagram spam detection, the app never sends anything. It
composes the message, fills the name, suggests a fresh variant, and — when you
click **Copy & mark sent** — copies it to your clipboard and records what went
out, scheduling the next follow-up automatically. You paste and send in
Instagram yourself.

## Data & backups

Everything lives in this browser's local storage. Use **Settings → Export
backup** regularly, especially before switching devices. The storage layer is
written behind a swappable adapter (`js/storage.js`), so cloud sync across your
laptop and phone can be added later without changing the rest of the app.

## Tech

Zero-build: Preact + htm (vendored locally in `/vendor`), hand-written CSS,
a service worker for offline, and a PWA manifest. Seed data was cleaned from
your Monday.com export (`Instagram_Leads_*.xlsx`) — 1,000+ prospects, deduped by
handle and mapped to your nine service types.
