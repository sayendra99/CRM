# Barbon Media Group CRM — Project Notes

A plain-English record of what we built, the decisions behind it, and how to
carry it forward. (For the technical "how to run it" version, see `README.md`.)

Last updated: 23 September 2026.

---

## Phase 3a — Prospect organisation restructure (23 Sep 2026)

Every prospect now has five clearly separate dimensions instead of one overloaded
"Groups" system:

- **Prospect Type** — *what they are* (Property Investor, Estate Agent, Architect…). One per prospect.
- **Lead Source** — *where they came from* (Instagram, Networking Event, Walk-in, Referral…). One per prospect.
- **Groups** — *how you choose to organise them* (High Value, Q4 Outreach…). Many per prospect.
- **Pipeline Stage** — *where they are in your process* (Interested, Leads, Paid Clients…). One per prospect.
- **Follow-up / Activity / Notes** — unchanged.

Prospect Types and Lead Sources are **global lists** (edit them in Settings). Groups
are per-workspace suggestions. Pipeline Stages are the per-workspace sections.

**What happened to your existing data (all preserved, verified against the
23.09.26 backup):** the old "Networking Events" and "Physical Walk-Ins" sections
became the Lead Source; "Event Space" and "Prime, Super Prime, Mansions & Castles"
became Groups; the six real stages stayed as Pipeline Stages; everyone else's Lead
Source is "Not specified" for you to fill in over time.

**New in the app:** filter the Pipeline by Type / Source / Group (combinable);
a "Group by" selector (Stage / Group / Type / Source); a "New this week" breakdown
on the dashboard by Type and Source; row cards now show type, source and groups.

---

## Phase 3b — Insights, smarter automation, stage reordering (23 Sep 2026)

- **Insights** (new sidebar item) — per workspace: a conversion **funnel** (All →
  Contacted → Replied → Interested → Clients won), headline **reply rate**, an
  a **grouped bar** activity chart (Sent / Replies / New prospects) with a
  labelled **Y-axis + gridlines**, dated **X-axis** labels, and a **hover tooltip**
  showing exact counts per period; a **flexible range** selector (7 days · 30 days ·
  3 months · 6 months · 12 months · all time — buckets adapt daily → weekly →
  monthly, totals reflect the range); and breakdowns **by Lead Source** and
  **by Prospect Type** (total / contacted / interested).
  "Clients won" counts any pipeline stage named like Paid / Client / Won.
- **Smarter automation** — additions to the rule builder:
  - Trigger **"No reply after N days"** — catches contacted prospects who've gone
    quiet (checked automatically each time you open the app).
  - Trigger **"Prospect matches a field (on add)"** — auto-route new/imported
    prospects by Prospect Type, Lead Source, or Group (e.g. Lead Source = Instagram
    → add to group "Instagram Leads"). Runs once, when a prospect is added/imported.
  - Action **"Add to a group"** (alongside move-to-stage and archive).
- **Reorder Pipeline Stages** — up/down arrows on each stage in Settings, so you
  control the order they appear in the pipeline.

---

## Phase 2 update (4 Aug 2026)

Added on top of everything below, without disturbing existing data (your saved
pipeline auto-migrates on first open):

- **Workspaces ("outreach clients")** — each is a fully separate pipeline with
  its own prospects, groups, service types, message templates and KPIs. Switch
  from the top-left. Two set up: **Barbon Photography** (your existing 1,168
  prospects) and **SA Management** (its own 11 service types + drafted
  contractor/corporate-guest templates; use the tags "Contractors" and
  "Corporate Guests" to split the two audiences).
- **Richer records** — email, phone, website, location, **tags** (colour-coded,
  filterable), **custom fields** (define your own in Settings), and a per-prospect
  **activity log** with a "log a note/interaction" action.
- **Faster workflow** — one-click **Quick Send** (copies the next message + marks
  it sent), **Snooze** (+1d/+3d/+1w), **bulk select** → move/tag/set-service/
  archive/delete, **keyboard shortcuts** (Today: J/K/Enter/S/O; global: N = new,
  / = search), and **paste-a-list** import.
- **Easier backups** — a "back up soon" reminder after 7 days, and a one-time
  **undo snapshot** taken before any reset (restore it from Settings).

New/added workspaces created with "+ New workspace" start with groups + KPIs but
no message templates until you add service types and copy (or ask for a starter
set to be drafted).

### Latest tweaks (4 Aug 2026, later)

- **Property notes column** — a dedicated field shown and editable directly in the
  main Pipeline table (separate from the general Notes). Also on the add/edit form,
  the detail drawer, and CSV export. (On phone it's edited via the detail card.)
- **Oldest-on-top ordering** — new prospects now append to the bottom of the
  pipeline; existing rows show oldest-first (by date added).
- **Group by Status / Tag** — a toggle in the Pipeline toolbar. "Tag" mode groups
  rows into sections by their tags. In **SA Management**, "Contractors" and
  "Corporate Guests" are pre-set as quick tags, so you can tag each prospect and
  then group/filter the two audiences.
- **Gradient palettes** — 10 named gradient palettes (Nightshade, Fernway,
  Cloudlifter, Grasshopper, Muted dusk, Inkblot, Gumdrop, Almond flour,
  Strawberry guava, Nocturne) plus the default Violet. Pick one **per workspace**
  in Settings → Appearance; it recolours the whole app (accent, logo, hero
  gradient, and a subtle surface tint) and switches automatically when you change
  workspace. It layers over light/dark/system, which still controls brightness.
  Defaults: Photography → Muted dusk, SA → Gumdrop.
- **Glass background** — an optional style (Settings → Appearance → Glass
  background toggle, off by default). When on, the active palette becomes a bold
  full-screen gradient with frosted-glass panels floating over it. Tuned "crisp"
  so text stays readable; the whole Pipeline table shares one glass sheet so it
  stays fast even with 1,000+ rows. Static (no motion). Works in light and dark.

### Opening the app (no Terminal needed)

The server now **starts automatically when you log in** and runs quietly in the
background. Just open **http://localhost:4173** (bookmark it / install it to your
dock). Nothing to launch.

- The **live app that runs** lives at
  `~/Library/Application Support/BarbonCRM/barbon-crm` — macOS won't let a
  background service read files inside Dropbox, so the running copy sits here.
- The **Dropbox copy** (`Custom CRM App/barbon-crm`) is kept as the editable
  source + backup. Your data is in the browser (localhost:4173), not in either
  folder, so both stay in sync data-wise.
- Auto-start config: `~/Library/LaunchAgents/com.barbonstudios.crm.plist`.
  To stop it: Terminal → `launchctl bootout gui/$(id -u)/com.barbonstudios.crm`.
  To start it again: `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.barbonstudios.crm.plist`.
  Log (if it ever misbehaves): `~/Library/Logs/barbon-crm.log`.

---

## 1. What this is

A standalone web app for tracking your Instagram outreach to property prospects
— property investors, architects, interior designers, estate agents,
lettings/property management, SA providers, property developers, deal sourcers,
and property entrepreneurs. Built to look and feel like Attio, works on laptop
and phone, and runs entirely on your machine with no accounts and no internet
needed after the first load.

---

## 2. Decisions we made up front

Four choices shaped the build:

| Decision | What we chose | Why it matters |
|---|---|---|
| **Data & devices** | Local-first, "sync-ready later" | Your data saves in the browser, offline. Cross-device sync (laptop ⇆ phone) can be added later without a rewrite. For now, move data with Export/Import. |
| **Existing data** | Import & clean the full Monday.com export | ~1,060 prospects brought in, de-duplicated by Instagram handle, messy service types mapped to your 9 canonical ones, sorted into groups. |
| **Message library** | Draft the full library in your voice | 3 first-DM + 3 per follow-up stage, for all 9 service types (162 messages), matching your existing tone. Fully editable. |
| **Notifications** | In-app badge always on + optional browser notifications | Reliable due-today count everywhere; OS reminders if you enable them (best once installed to the home screen). |

---

## 3. What got built

**Home dashboard** — daily KPI progress, today's due follow-ups, checklist
status, win streak, and a rotating quote (Hormozi, Napoleon Hill, Stoicism,
Christianity) framed around servitude and honour.

**Today** — the exact, ordered list of who to message next. Overdue follow-ups
first, then fresh prospects. Work top to bottom, no deciding.

**Pipeline** — the Attio-style table (not kanban). Collapsible groups
(Interested / Ideal Leads / Leads / Unsure / Not Ideal), search, service/due
filters, inline stage tracking, and a full detail drawer per prospect. Rows move
between groups manually or via automations.

**Messages** — your editable library. `{name}` auto-fills. The app rotates
variants and never repeats one to the same person, to stay clear of Instagram's
spam detection.

**KPIs** — build your own daily/weekly targets. Some track themselves (DMs sent,
replies, new prospects); others you tap to log (calls booked, conversions).

**Standard** (success/failure checklist) — define what a winning and a failing
day look like, check items off, and watch your streak + 120-day track record.

**Automations** — WHEN/THEN rules (e.g. positive reply → Interested) with a
master on/off switch and per-rule toggles. Build your own over time.

**Settings** — light/dark/system theme, groups, outreach guardrails (daily send
cap, skip weekends, ±1-day randomised timing), notifications, CSV import with
duplicate detection, and JSON/CSV backup + restore.

---

## 4. Key design principle: sending stays manual

To protect your account, the app never sends anything. It composes the message,
fills the name, suggests a fresh variant, and — on **Copy & mark sent** — copies
it to your clipboard and records what went out, scheduling the next follow-up
automatically. You paste and send in Instagram yourself.

Default follow-up cadence: **3 → 5 → 7 → 14 → 16 days** between stages (editable
per stage in Messages).

---

## 5. Extra safeguards added (beyond the brief)

- Daily send-cap warning
- Variant anti-repeat + auto-rotation
- Reply tracking (positive / negative) that auto-moves prospects
- Tap an Instagram handle to open their profile
- Weekend-skipping and randomised follow-up dates
- One-click JSON/CSV backup so the pipeline is never lost

---

## 6. Known limitations (be aware)

- **No cross-device sync yet** — data lives per-browser. Use Settings → Export /
  Restore to move between laptop and phone. (Sync is the main "future" item.)
- **iOS notifications are limited** — work best after Add to Home Screen; true
  background push would need a small server.
- **Keep the server running** — the app needs `python3 serve.py` running to
  open (ES modules can't load from a bare file).

---

## 7. How future changes work

It's a zero-build app, so revisions are quick: describe what you want → the
source files in this folder get edited → you refresh the browser. No rebuild.

Your data (prospects, history, KPIs, check-ins) is stored separately from the
code, so changes to how the app looks or behaves never wipe your pipeline.

Lots is already self-serve in-app with no code change: message copy & cadence,
KPIs, automations, checklist items, groups, colours, and theme.

Bigger asks, roughly by size:
- Small/cosmetic — wording, colours, a new column, default cadence
- Features — new views/filters, extra fields, tags, bulk actions, charts
- Large — cloud sync across laptop + phone (needs a backend + login)

---

## 8. Reference files used

- `Instagram_Leads_1783288873.xlsx` — your Monday.com export (seed data)
- `Instagram Message Outreach.rtf` — your DM examples (writing voice)
- Attio UI screenshots — the look and feel

The cleaned seed lives in `js/data/`. To rebuild it from a fresh export, the
`.xlsx` was parsed with Python's `openpyxl` — ask and it can be regenerated.
