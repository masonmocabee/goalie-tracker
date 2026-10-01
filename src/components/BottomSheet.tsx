import type { ReactNode } from 'react';
import { CloseIcon } from './Icons';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Pinned below the scrolling content (e.g. a Done button). */
  footer?: ReactNode;
}

export default function BottomSheet({ title, subtitle, onClose, children, footer }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-[rgba(5,4,14,0.65)]" onClick={onClose} />
      <div
        role="dialog"
        className="relative mx-auto flex max-h-[calc(100dvh-3rem)] w-full max-w-xl flex-col rounded-t-[28px] border-t border-line-strong bg-panel bg-linear-to-b from-[#1d1840] to-panel"
      >
        <div className="flex justify-center pt-2.5">
          <div className="h-1 w-10 rounded-full bg-[#3a3566]" />
        </div>
        <div className="flex items-center justify-between gap-2 pt-2 pr-3 pb-1 pl-5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="font-display text-[30px] leading-none font-bold">{title}</h2>
            {subtitle && <div className="text-[13px] text-muted">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center rounded-[14px] text-fg-2"
          >
            <CloseIcon size={22} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-5">{children}</div>
        {footer && (
          <div className="border-t border-divider px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>
  );
}
