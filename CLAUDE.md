# Goalie Tracker — Project Spec

A simple, free, offline-first web app for a youth hockey head coach to track his goalie's shots, saves, and goals — live during games and reconciled afterward from game video.

## Product summary

- **Single user.** One coach, tracking one goalie.
- **Primary device:** Android phone (Chrome), installed as a PWA.
- **Secondary device:** Desktop Chrome, used mostly for viewing the dashboard on a bigger screen.
- **Workflow:**
  1. **Live:** Track saves and goals in real time during the game.
  2. **Reconcile:** Rewatch the game video later; insert missed shots, fix mistakes, fill in goal details.
  3. **Analyze:** Per-game summary and season dashboard.
- **Zero cost.** No paid services, no backend in v1.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| Routing | React Router using `HashRouter` (static hosting friendly) |
| Local database | IndexedDB via Dexie.js (`dexie-react-hooks` for live queries) |
| Offline / install | `vite-plugin-pwa` (installable, works fully offline) |
| Charts | Custom SVG (trend line, net heat map); no chart library |
| IDs | `crypto.randomUUID()` |
| Tests | Vitest for stats and merge logic |
| Hosting | GitHub Pages (via GitHub Actions) or Cloudflare Pages |

### Architecture rules

- **No backend in v1.** All data lives in IndexedDB on the device.
- **All reads and writes go through a data-access layer** (`src/data/`). UI components never call Dexie directly. This keeps a future cloud sync (e.g. Supabase) a drop-in swap.
- **Stats are always derived, never stored.** Save %, totals, and breakdowns are computed from events with pure functions in `src/stats/`.
- **Call `navigator.storage.persist()` on first launch** so Chrome doesn't evict data. Show the persistence status in Settings.

## Data model

All records carry a UUID, `createdAt`, `updatedAt`, and a `deleted` flag. Deletes are **soft** (`deleted: true`) so they survive export/import merges. Queries filter out deleted records.

### Game

```ts
interface Game {
  id: string;            // uuid
  date: string;          // ISO date
  opponent: string;
  homeAway?: 'home' | 'away';
  rink?: string;
  numPeriods: number;    // default 3
  periodLengthMin?: number; // optional, not asked for in the form (GAA is per game, see Season dashboard)
  final?: boolean;       // set by "End game"; can be reopened
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}
```

### Event

```ts
type EventType = 'save' | 'goal';
type Period = 1 | 2 | 3 | 'OT';   // supports numPeriods; OT always available

interface ShotEvent {
  id: string;            // uuid
  gameId: string;
  type: EventType;
  period: Period;
  sortKey: number;       // ordering within the game (see Ordering)
  highDanger: boolean;   // default false
  gameClock?: string;    // optional, "MM:SS"; label only, NOT used for ordering
  // Goal-only fields (all optional; can be filled in later)
  netZone?: NetZone;
  reason?: GoalReason;
  strength?: 'EV' | 'PP' | 'PK';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

type NetZone =
  | 'glove_high' | 'blocker_high'
  | 'glove_low'  | 'blocker_low'
  | 'five_hole'
  | 'left_pad_low' | 'right_pad_low'   // goalie's left/right; "low" = beat at the legs
  | 'unknown';
// glove_low / blocker_low = above the pad, below the glove/blocker.
// The goalie catches left: glove = goalie's left = shooter's right.

type GoalReason =
  | 'screen' | 'rebound' | 'deflection' | 'breakaway'
  | 'odd_man_rush' | 'cross_crease' | 'wraparound'
  | 'bad_angle' | 'scramble' | 'soft_goal' | 'other';
```

### Ordering

- Events are ordered by `period`, then `sortKey`.
- A new event appended live gets `sortKey = (last sortKey in that period) + 1000`.
- **Insert here:** an event inserted between A and B gets `sortKey = (A.sortKey + B.sortKey) / 2`. No renumbering of other events.
- The game clock is optional and purely informational. It is not used for sorting.

### High danger definition (show as help text in the app)

> Tag a shot as high danger if it came from the slot or inner slot, was a rebound, breakaway, odd-man rush, cross-crease pass, or a tip/deflection in close. Consistency matters more than precision.

## Screens

Visual design: the "Goalie Tracker" Design canvas (claude.ai artifact DZH141E3LL4naKqEkNYTsF). Dark theme only (tokens in `src/index.css`): blue = saves, orange = goals; Barlow Condensed for numbers/headings, Manrope for body, both bundled in `src/assets/fonts/` for offline use.

**Navigation.** App level: bottom tabs **Games / Season** (later **Data** for Settings, Milestone 3). Opening a game shows game-level bottom tabs **Entry / Stats / Log** (`/game/:id/entry|stats|log`) with a back arrow to Games. Today's unfinished game opens on Entry; any other game opens on Stats. "End game" on Entry marks the game final and goes to Stats.

**Net diagram.** One picker/heat map/marker component (`NetDiagram`), drawn from the **shooter's view** of a left-catching goalie (glove on the right), with 7 tappable zones on a goalie silhouette plus "Unknown".

### 1. Games list (home)

- "New game" button opens a quick form: date (defaults to today), opponent, home/away, number of periods (defaults to 3).
- List of games: date, opponent, shots, goals against, SV%.
- Any game with goals missing details shows a small "needs details" badge.

### 2. Live game screen (most important; phone-first)

- Header: opponent, current period selector (sticky, large tap targets).
- Running stats: shots / saves / goals / SV%, overall and for the current period.
- Three large buttons, thumb-reachable:
  - **SAVE**: one tap logs a save in the current period.
  - **HD SAVE**: one tap logs a high-danger save.
  - **GOAL**: logs a goal and opens the goal detail sheet.
- **Undo last:** large, always visible; soft-deletes the most recent event.
- Brief visual and haptic confirmation on each tap (`navigator.vibrate`).
- Link to the event log.

### 3. Goal detail sheet (bottom sheet)

- Net diagram (SVG) with tappable zones.
- Reason chips (single select).
- High danger toggle.
- Strength (EV/PP/PK), optional game clock, notes.
- **Everything is skippable.** "Done" is always enabled.

### 4. Event log (reconciliation)

- Timeline grouped by period, ordered by `sortKey`.
- Each row shows: type, HD marker, clock (if set), and goal zone/reason; plus a "needs details" badge on goals missing zone or reason.
- Tap a row to edit any field (type, period, HD, goal details) or delete it.
- **"+ Insert here"** affordance between every pair of rows and at the end of each period. It opens a quick picker (Save / HD Save / Goal) and inserts at that position.
- New inserts default to the period of the gap they were inserted into.

### 5. Game summary

- Totals: shots, saves, goals, SV%, HDSV%.
- Per-period table: shots, saves, goals, SV%.
- Goals list with zone, reason, and HD.
- Net diagram showing this game's goal locations.

### 6. Season dashboard

- **Totals:** games, shots, saves, goals against, SV%, GAA, HDSV% vs non-HD SV%.
  - **GAA = goals against per game**, not per 60 minutes: youth periods get cut short, so minutes aren't tracked.
- **Shutouts:** called out (count + each game) when there are any. A shutout is a finished game (ended, or dated before today) with shots against and no goals. Also badged on the games list and the game's Stats tab.
- **By period:** SV% and goals against for P1 / P2 / P3 / OT.
- **Goals breakdown:**
  - Bar chart by reason
  - Net zone heat map (custom SVG)
  - HD vs non-HD split
- **Trends:** SV% and HDSV% game over game (line chart).
- **Filters:** date range, opponent.

### 7. Settings / data

- Storage persistence status.
- **Export backup:** JSON of all games and events (including soft-deleted). Filename: `goalie-tracker-YYYY-MM-DD-HHmm.json`. Use the Web Share API on Android so it can go straight to Google Drive; fall back to a download.
- **Export CSV:** events flattened with game info, for spreadsheets.
- **Import backup:** pick a JSON file and merge it in (see Import / merge).
- **Sync from folder (desktop Chrome only):** use the File System Access API (`showDirectoryPicker`) to choose a folder once (e.g. a Google Drive for desktop folder). Persist the handle in IndexedDB. The button imports the newest export file in that folder. Hide this feature when the API is unavailable.
- **Backup nudge:** after a game is marked complete or edited, show a gentle "Back up now?" prompt.

## Import / merge rules

- Export format: `{ schemaVersion: number, exportedAt: string, games: Game[], events: ShotEvent[] }`.
- **Import upserts by `id`.** If a record exists, keep whichever has the newer `updatedAt`. Otherwise insert it.
- Soft deletes merge like any other update, so deletes propagate.
- Re-importing the same file is idempotent: no duplicates.
- Validate `schemaVersion`; reject unknown versions with a clear message.
- Show a summary after import: X games / Y events added, Z updated.
- **Sync direction for v1:** phone → desktop (one-way by convention). The merge logic supports two-way, but the UI doesn't need to.

## UX principles

- Phone-first, one-handed, usable at a cold rink with gloves off for a second.
- Big tap targets (minimum 56px for primary actions); high contrast; dark theme only.
- Live logging must take one tap. Everything else can be filled in later.
- Never block logging on missing details.

## Build milestones

Complete and test each milestone on the Android phone before starting the next.

1. **Foundation + live tracking**
   - Scaffold Vite + React + TS + Tailwind + Dexie
   - Data-access layer
   - Games list and new-game form
   - Live screen with SAVE / HD SAVE / GOAL / Undo, period selector, running stats
2. **Goal details + reconciliation**
   - Goal detail sheet with net zones and reasons
   - Event log with edit, delete, and "insert here" using `sortKey`
   - "Needs details" badges
3. **Game summary + data portability**
   - Per-game summary
   - JSON export/import with merge rules
   - CSV export
   - Persistent storage request and backup nudge
   - Vitest coverage for stats and merge logic
4. **Season dashboard**
   - Totals, by-period, goals breakdown, net heat map, trends, filters
5. **PWA + deploy**
   - `vite-plugin-pwa` offline support and install manifest
   - GitHub Pages deploy via Actions
   - Desktop "Sync from folder"

### Later (not in v1)

- Shot origin location on a rink diagram
- Missed and blocked shot types
- Multiple goalies
- Cloud sync (e.g. Supabase) behind the existing data-access layer, for viewing stats on another device

## Working conventions for Claude Code

- Keep the code simple and readable; this is a hobby app maintained by one person.
- Stats and merge logic are pure functions with unit tests.
- Don't add dependencies beyond the stack above without asking.
- Don't add a backend, auth, or paid service.
- After each milestone, summarize what was built and how to test it on the phone.
