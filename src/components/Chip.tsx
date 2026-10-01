import type { ReactNode } from 'react';

interface Props {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}

/** Selectable pill button (reasons, home/away, etc.). */
export default function Chip({ selected, onClick, children }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`h-11 rounded-full border px-4 text-sm font-bold ${
        selected ? 'border-fg bg-fg text-ink' : 'border-line-strong bg-divider text-fg-2'
      }`}
    >
      {children}
    </button>
  );
}
