import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DownloadIcon, ShieldIcon, UploadIcon } from '../components/Icons';
import { backUpNow, importBackup, lastBackupAt, shareCsv, type ImportSummary } from '../data/backup';
import { useLatestChange } from '../data/hooks';
import { isPersisted } from '../data/persist';

type Message = { kind: 'ok' | 'error'; text: string };

/** Backups, CSV export, import, and storage status. */
export default function Data() {
  const latestChange = useLatestChange();
  const [persisted, setPersisted] = useState<boolean | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [last, setLast] = useState(lastBackupAt);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    isPersisted().then(setPersisted, () => setPersisted(null));
  }, []);

  async function run(action: () => Promise<Message | null>) {
    setBusy(true);
    setMessage(null);
    try {
      setMessage(await action());
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  const backUp = () =>
    run(async () => {
      const result = await backUpNow();
      setLast(lastBackupAt());
      if (result === 'cancelled') return null;
      return { kind: 'ok', text: result === 'shared' ? 'Backup shared.' : 'Backup saved to Downloads.' };
    });

  const exportCsv = () =>
    run(async () => {
      const result = await shareCsv();
      if (result === 'cancelled') return null;
      return { kind: 'ok', text: result === 'shared' ? 'CSV shared.' : 'CSV saved to Downloads.' };
    });

  const importFile = (file: File) =>
    run(async () => {
      let json: unknown;
      try {
        json = JSON.parse(await file.text());
      } catch {
        throw new Error("This file isn't a Goalie Tracker backup.");
      }
      return { kind: 'ok', text: importSummary(await importBackup(json)) };
    });

  const stale = !!last && !!latestChange && latestChange > last;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 pt-[max(1.75rem,env(safe-area-inset-top))] pb-6">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-bold tracking-[0.14em] text-muted uppercase">Backups &amp; export</div>
        <h1 className="font-display text-[46px] leading-[0.95] font-bold">Data</h1>
      </div>

      <Card title="Backup">
        <p className="text-sm text-fg-2">
          Your games live only on this device. Back up after each game and save the file to Google Drive.
        </p>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">Last backup</span>
          <span className={`font-bold ${stale ? 'text-goal-soft' : ''}`}>
            {last ? formatWhen(last) : 'Never'}
            {last && stale && ' · changes since'}
          </span>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={backUp}
          className="fill-save flex h-14 items-center justify-center gap-2.5 rounded-[20px] border border-white/30 text-[17px] font-extrabold text-save-ink disabled:opacity-60"
        >
          <UploadIcon size={20} />
          Back up now
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={exportCsv}
          className="flex h-14 items-center justify-center gap-2.5 rounded-[20px] border border-line-strong text-[15px] font-bold text-fg-2 disabled:opacity-60"
        >
          Export CSV for spreadsheets
        </button>
      </Card>

      <Card title="Import">
        <p className="text-sm text-fg-2">
          Pick a backup file to merge in. Games already here are kept; for anything in both, the most recently edited
          version wins. Importing the same file twice is safe.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          className="flex h-14 items-center justify-center gap-2.5 rounded-[20px] border border-save-line bg-save-deep/60 text-[15px] font-bold disabled:opacity-60"
        >
          <DownloadIcon size={20} />
          Import backup
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ''; // so picking the same file again still fires
            if (file) importFile(file);
          }}
        />
      </Card>

      {message && (
        <div
          role="status"
          className={`rounded-[18px] border px-4 py-3 text-sm font-semibold ${
            message.kind === 'ok' ? 'border-save-line bg-save-deep/50 text-save-soft' : 'border-goal/40 bg-goal/10 text-goal-soft'
          }`}
        >
          {message.text}
        </div>
      )}

      <Card title="Storage">
        <div className="flex items-start gap-3">
          <ShieldIcon size={22} className={persisted ? 'shrink-0 text-save' : 'shrink-0 text-muted'} />
          <p className="text-sm text-fg-2">
            {persisted === undefined
              ? 'Checking…'
              : persisted
                ? 'Protected: Chrome won’t clear this app’s data to free up space.'
                : persisted === false
                  ? 'Not protected: Chrome may clear this app’s data if the phone runs low on space. Installing the app to the home screen usually fixes this. Keep backing up either way.'
                  : 'This browser can’t report storage protection. Keep backing up.'}
          </p>
        </div>
      </Card>
    </div>
  );
}

function importSummary(s: ImportSummary): string {
  const updated = s.gamesUpdated + s.eventsUpdated;
  if (s.gamesAdded + s.eventsAdded + updated === 0) return 'Already up to date: nothing new in that file.';
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  return `Imported: ${plural(s.gamesAdded, 'game')} / ${plural(s.eventsAdded, 'event')} added, ${updated} updated.`;
}

/** "Oct 2, 7:30 PM" */
function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="surface flex flex-col gap-4 rounded-3xl border border-line px-5 py-5">
      <h2 className="eyebrow">{title}</h2>
      {children}
    </section>
  );
}
