import { Navigate, Route, Routes } from 'react-router-dom';
import TabLayout from './components/TabLayout';
import GamesList from './pages/GamesList';
import Season from './pages/Season';
import Entry from './pages/game/Entry';
import EventLog from './pages/game/EventLog';
import GameLayout, { GameIndex } from './pages/game/GameLayout';
import GameStats from './pages/game/GameStats';

export default function App() {
  return (
    <Routes>
      <Route element={<TabLayout />}>
        <Route path="/" element={<GamesList />} />
        <Route path="/season" element={<Season />} />
      </Route>
      <Route path="/game/:id" element={<GameLayout />}>
        <Route index element={<GameIndex />} />
        <Route path="entry" element={<Entry />} />
        <Route path="stats" element={<GameStats />} />
        <Route path="log" element={<EventLog />} />
        <Route path="live" element={<Navigate to="../entry" replace />} />
      </Route>
      <Route path="/dashboard" element={<Navigate to="/season" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
