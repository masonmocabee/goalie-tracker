import { Outlet } from 'react-router-dom';
import { ChartIcon, ListIcon } from './Icons';
import TabBar, { TAB_BAR_PADDING } from './TabBar';

/** App-level screens (Games, Season) with the bottom tab bar. */
export default function TabLayout() {
  return (
    <>
      <div className={TAB_BAR_PADDING}>
        <Outlet />
      </div>
      <TabBar
        label="Main"
        tabs={[
          { to: '/', label: 'Games', icon: <ListIcon size={22} /> },
          { to: '/season', label: 'Season', icon: <ChartIcon size={22} /> },
        ]}
      />
    </>
  );
}
