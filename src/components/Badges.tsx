export function HdTag() {
  return (
    <span className="rounded-md border border-save-line px-1.5 py-px text-[10px] font-extrabold tracking-[0.08em] text-save-soft">
      HD
    </span>
  );
}

export function ShutoutBadge() {
  return (
    <span className="self-start rounded-full border border-save-line bg-save-deep px-2 py-0.5 text-[11px] font-bold tracking-[0.03em] text-save-soft">
      Shutout
    </span>
  );
}

export function NeedsDetailsBadge() {
  return (
    <span className="self-start rounded-full border border-goal/35 bg-goal/12 px-2 py-0.5 text-[11px] font-bold tracking-[0.03em] text-goal-soft">
      Needs details
    </span>
  );
}
