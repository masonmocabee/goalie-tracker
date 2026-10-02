import { useState } from 'react';
import { backUpNow, dismissBackupNudge, needsBackup } from '../data/backup';
import { useLatestChange } from '../data/hooks';
import { UploadIcon } from './Icons';

/** Gentle "Back up now?" banner, shown when anything changed since the last backup. */
export default function BackupNudge({ className = '' }: { className?: string }) {
  const latestChange = useLatestChange();
  const [, rerender] = useState(0);
  const [busy, setBusy] = useState(false);

  if (!needsBackup(latestChange)) return null;

  async function backUp() {
    setBusy(true);
    try {
      await backUpNow();
    } catch (err) {
      alert(`Backup failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
      rerender((n) => n + 1);
    }
  }

  function later() {
    dismissBackupNudge();
    rerender((n) => n + 1);
  }

  return (
    <div className={`surface flex items-center gap-3 rounded-[20px] border border-save-line px-4 py-3 ${className}`}>
      <UploadIcon size={20} className="shrink-0 text-save" />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold">Back up now?</div>
        <div className="text-xs text-muted">Save this season to Google Drive.</div>
      </div>
      <button type="button" onClick={later} className="h-11 px-2 text-sm font-bold text-muted">
        Later
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={backUp}
        className="fill-save h-11 rounded-[14px] px-4 text-sm font-extrabold text-save-ink disabled:opacity-60"
      >
        Back up
      </button>
    </div>
  );
}
