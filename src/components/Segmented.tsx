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
      className={`track flex gap-1 border border-line-strong ${large ? 'rounded-[22px] p-1.5' : 'rounded-2xl p-1'}`}
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
              large ? 'h-12 rounded-2xl text-[22px]' : 'h-11 rounded-xl text-xl'
            } ${on ? 'bg-fg text-ink shadow-[0_4px_14px_rgba(0,0,0,0.35)]' : 'text-fg-2/75'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
