import { useState, type FormEvent } from 'react';
import { createGame } from '../data/games';
import { todayIso } from '../lib/format';
import type { Game } from '../types';
import Segmented from './Segmented';

interface Props {
  onCreated: (game: Game) => void;
}

const inputClass = 'mt-2 block h-12 w-full rounded-[14px] border border-line-strong bg-well px-3.5 text-base text-fg';

export default function NewGameForm({ onCreated }: Props) {
  const [date, setDate] = useState(todayIso());
  const [opponent, setOpponent] = useState('');
  const [homeAway, setHomeAway] = useState<'home' | 'away' | undefined>();
  const [numPeriods, setNumPeriods] = useState(3);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const game = await createGame({
      date,
      opponent: opponent.trim() || 'Opponent',
      homeAway,
      numPeriods,
    });
    onCreated(game);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="eyebrow block">
        Opponent
        <input
          className={`${inputClass} tracking-normal normal-case`}
          value={opponent}
          onChange={(e) => setOpponent(e.target.value)}
          placeholder="e.g. Ice Hawks"
          autoFocus
        />
      </label>
      <label className="eyebrow block">
        Date
        <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Home / away</span>
        <Segmented
          label="Home or away"
          options={[
            { value: 'home', label: 'HOME' },
            { value: 'away', label: 'AWAY' },
          ]}
          value={homeAway}
          onChange={(v) => setHomeAway(homeAway === v ? undefined : v)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Periods</span>
        <Segmented
          label="Number of periods"
          options={[2, 3, 4].map((n) => ({ value: n, label: String(n) }))}
          value={numPeriods}
          onChange={setNumPeriods}
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="h-[58px] rounded-[18px] bg-save text-[17px] font-extrabold text-save-ink disabled:opacity-60"
      >
        Start game
      </button>
    </form>
  );
}
