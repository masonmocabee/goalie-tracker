import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShieldIcon } from '../components/Icons';
import NetDiagram from '../components/NetDiagram';
import RinkDiagram from '../components/RinkDiagram';
import TrendChart from '../components/TrendChart';
import { useGamesWithEvents } from '../data/hooks';
import { formatGaa, formatShortDate, seasonLabel, todayIso } from '../lib/format';
import { periodLabel } from '../lib/periods';
import { formatSvPct, type ShotTotals } from '../stats/gameStats';
import { filterGames, seasonStats, type DateRange, type SeasonStats } from '../stats/seasonStats';
import { GOAL_REASON_LABELS } from '../types';

const SV_FLOOR = 0.7; // by-period bars are scaled .700 to 1.000

export default function Season() {
  const games = useGamesWithEvents();
  const [range, setRange] = useState<DateRange>('all');
  const [opponent, setOpponent] = useState<string | null>(null);
  if (games === undefined) return null;

  const today = todayIso();
  const opponents = [...new Set(games.map((g) => g.game.opponent))].sort();
  const s = seasonStats(filterGames(games, { range, opponent }, today), today);
  const perGame = (n: number) => (s.games ? (n / s.games).toFixed(1) : '—');
  const maxReason = Math.max(1, ...s.goalsByReason.map((r) => r.count));
  const hdGoalShare = s.overall.goals ? (s.highDanger.goals / s.overall.goals) * 100 : 0;

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-5 px-4 pt-[max(1.75rem,env(safe-area-inset-top))] pb-6 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-bold tracking-[0.14em] text-muted uppercase">
            {seasonLabel(today)} · {s.games} {s.games === 1 ? 'game' : 'games'}
          </div>
          <h1 className="font-display text-[46px] leading-[0.95] font-bold md:text-[52px]">Season</h1>
        </div>
        <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
          <Select label="Date range" value={range} onChange={(v) => setRange(v as DateRange)}>
            <option value="all">Full season</option>
            <option value="last5">Last 5 games</option>
            <option value="last30">Last 30 days</option>
          </Select>
          <Select label="Opponent" value={opponent ?? ''} onChange={(v) => setOpponent(v || null)}>
            <option value="">All opponents</option>
            {opponents.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {s.overall.shots === 0 ? (
        <p className="py-10 text-center text-muted">
          {games.length ? 'No shots in these games.' : 'No shots logged yet. Stats show up here once you track a game.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Games" value={String(s.games)} sub={`${s.home} home · ${s.away} away`} />
            <Kpi label="Shots against" value={String(s.overall.shots)} sub={`${perGame(s.overall.shots)} per game`} />
            <Kpi label="Saves" value={String(s.overall.saves)} sub={`${perGame(s.overall.saves)} per game`} className="text-save" />
            <Kpi
              label="Goals against"
              value={String(s.overall.goals)}
              sub={`${s.highDanger.goals} HD · ${s.nonHighDanger.goals} other`}
              className="text-goal"
            />
            <Kpi
              label="Save %"
              value={formatSvPct(s.overall.svPct)}
              sub={`HD ${formatSvPct(s.highDanger.svPct)} · other ${formatSvPct(s.nonHighDanger.svPct)}`}
              className="text-save"
            />
            <Kpi label="GAA" value={formatGaa(s.gaa)} sub="Goals against per game" />
          </div>

          {s.shutouts.length > 0 && <ShutoutCallout shutouts={s.shutouts} />}

          <div className="flex flex-wrap gap-4">
            <Card title="Game-over-game trend" className="min-w-0 flex-[2_1_560px]">
              <div className="-mt-1 flex gap-4 text-[13px] text-fg-2">
                <span className="flex items-center gap-2">
                  <span className="h-[3px] w-[18px] rounded bg-save" />
                  SV%
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-[18px] border-t-[3px] border-dotted border-fg" />
                  HDSV%
                </span>
              </div>
              {s.trend.length >= 2 ? (
                <TrendChart points={s.trend} />
              ) : (
                <p className="py-8 text-center text-sm text-muted">The trend shows up after two games.</p>
              )}
            </Card>

            <Card title="High danger vs the rest" className="flex-[1_1_320px]">
              <SvBar label="HD shots" stats={s.highDanger} />
              <SvBar label="Everything else" stats={s.nonHighDanger} />
              {s.overall.goals > 0 && (
                <div className="flex flex-col gap-2.5 border-t border-divider pt-4">
                  <div className="text-[13px] font-bold text-fg-2">Goals against split</div>
                  <div className="flex h-9 gap-[3px] overflow-hidden rounded-[10px]">
                    {s.highDanger.goals > 0 && (
                      <div
                        className="flex items-center bg-goal pl-3 text-[13px] font-extrabold whitespace-nowrap text-goal-ink"
                        style={{ width: `${hdGoalShare}%` }}
                      >
                        {s.highDanger.goals} HD
                      </div>
                    )}
                    {s.nonHighDanger.goals > 0 && (
                      <div className="flex flex-1 items-center bg-goal-deep pl-3 text-[13px] font-extrabold whitespace-nowrap text-[#ffd3bc]">
                        {s.nonHighDanger.goals} other
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card title="By period">
              <div className="flex flex-col gap-3.5">
                {s.byPeriod.map(({ period, stats }) => (
                  <div key={period} className="grid grid-cols-[36px_minmax(0,1fr)_52px_48px] items-center gap-3">
                    <span className="font-display text-[22px] font-bold">{periodLabel(period)}</span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-divider">
                      <div
                        className="h-full rounded-full bg-save"
                        style={{ width: `${Math.max(0, ((stats.svPct ?? 0) - SV_FLOOR) / (1 - SV_FLOOR)) * 100}%` }}
                      />
                    </div>
                    <span className="text-right font-extrabold tabular-nums">{formatSvPct(stats.svPct)}</span>
                    <span className="text-right text-[13px] font-bold text-goal-soft">{stats.goals} GA</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted">Bar = SV%, scaled .700 to 1.000</div>
            </Card>

            <Card title="Goals by reason">
              {s.goalsByReason.length === 0 ? (
                <p className="text-sm text-muted">No goal reasons filled in yet.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {s.goalsByReason.map(({ reason, count }) => (
                    <div key={reason} className="grid grid-cols-[104px_minmax(0,1fr)_24px] items-center gap-2.5 text-[13px]">
                      <span className="font-semibold text-fg-2">{GOAL_REASON_LABELS[reason]}</span>
                      <div className="h-3.5">
                        <div className="h-full rounded bg-goal" style={{ width: `${(count / maxReason) * 100}%` }} />
                      </div>
                      <span className="text-right font-extrabold">{count}</span>
                    </div>
                  ))}
                </div>
              )}
              {s.goalsMissingReason > 0 && (
                <div className="text-xs text-muted">
                  {s.goalsMissingReason} goal{s.goalsMissingReason === 1 ? '' : 's'} without a reason yet
                </div>
              )}
            </Card>

            <Card title="Net heat map">
              <NetDiagram counts={s.goalsByZone} />
            </Card>

            <Card title="Goal location heat map">
              <RinkDiagram heat={s.goalOrigins} />
              <div className="text-xs text-muted">
                {s.goalOrigins.length === 0
                  ? 'No goal locations yet. Tap where a goal was shot from in its details.'
                  : s.goalOrigins.length < s.overall.goals
                    ? `${s.goalOrigins.length} of ${s.overall.goals} goals placed · brighter = more goals`
                    : 'Brighter = more goals'}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function ShutoutCallout({ shutouts }: { shutouts: SeasonStats['shutouts'] }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-save-line bg-save-deep/50 px-5 py-5 sm:flex-row sm:items-center md:px-6">
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-save text-save-ink">
          <ShieldIcon size={30} />
        </span>
        <div className="flex flex-col gap-0.5">
          <div className="font-display text-[44px] leading-none font-bold text-save">{shutouts.length}</div>
          <div className="text-xs font-bold tracking-[0.1em] text-save-soft uppercase">
            {shutouts.length === 1 ? 'Shutout' : 'Shutouts'}
          </div>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2 sm:ml-4">
        {shutouts.map((so) => (
          <li key={so.gameId}>
            <Link
              to={`/game/${so.gameId}/stats`}
              className="flex h-11 items-center gap-2 rounded-full border border-save-line bg-save-deep px-4 text-sm font-bold text-fg"
            >
              {formatShortDate(so.date)} · {so.opponent}
              <span className="font-semibold text-save-soft">{so.saves} saves</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Card({ title, className = '', children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className={`flex flex-col gap-4 rounded-3xl surface border border-line px-5 py-5 md:px-6 ${className}`}>
      <h2 className="eyebrow">{title}</h2>
      {children}
    </section>
  );
}

function Kpi({ label, value, sub, className = '' }: { label: string; value: string; sub: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[20px] surface border border-line px-5 py-4">
      <div className="eyebrow">{label}</div>
      <div className={`font-display text-[44px] leading-none font-bold ${className}`}>{value}</div>
      <div className="text-xs text-muted">{sub}</div>
    </div>
  );
}

function SvBar({ label, stats }: { label: string; stats: ShotTotals }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold">{label}</span>
        <span className="font-display text-[40px] leading-none font-bold">{formatSvPct(stats.svPct)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-goal-track">
        <div className="h-full bg-save" style={{ width: `${(stats.svPct ?? 0) * 100}%` }} />
      </div>
      <div className="text-[13px] text-muted">
        {stats.saves} of {stats.shots} saved
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1.5 text-xs font-bold text-muted sm:flex-none">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 min-w-[170px] rounded-xl border border-line-strong bg-panel px-3 text-sm font-semibold text-fg"
      >
        {children}
      </select>
    </label>
  );
}
