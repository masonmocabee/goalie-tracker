interface Option<T> {
  value: T;
  label: string;
}

interface Props<T> {
  label: string;
  options: Option<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  /** Taller buttons for the live period selector. */
  large?: boolean;
}

/** A row of mutually exclusive buttons inside a rounded track. */
export default function Segmented<T extends string | number>({ label, options, value, onChange, large }: Props<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex gap-1 border border-line p-1 ${large ? 'rounded-2xl bg-panel' : 'rounded-[14px] bg-well'}`}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className={`flex-1 font-display font-bold tracking-wider ${
              large ? 'h-12 rounded-xl text-[22px]' : 'h-11 rounded-[10px] text-xl'
            } ${on ? 'bg-fg text-ink' : 'text-muted'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
