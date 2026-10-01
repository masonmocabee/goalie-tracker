import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

export interface Tab {
  to: string;
  label: string;
  icon: ReactNode;
}

/** Thumb-reachable bottom navigation, fixed to the bottom of the screen. */
export default function TabBar({ tabs, label }: { tabs: Tab[]; label: string }) {
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-divider bg-well pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-xl px-2 pt-1.5">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            className={({ isActive }) =>
              `flex h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-bold ${
                isActive ? 'text-save' : 'text-muted'
              }`
            }
          >
            {tab.icon}
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** Space to leave at the bottom of a page so content clears the tab bar. */
export const TAB_BAR_PADDING = 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]';
