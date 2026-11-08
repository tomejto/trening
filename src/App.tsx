import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { cx } from './components/ui';
import TodayScreen from './screens/TodayScreen';
import WorkoutScreen from './screens/WorkoutScreen';
import PlanScreen from './screens/PlanScreen';
import TemplateEditScreen from './screens/TemplateEditScreen';
import ExercisesScreen from './screens/ExercisesScreen';
import ExerciseScreen from './screens/ExerciseScreen';
import HistoryScreen from './screens/HistoryScreen';
import HistoryDetailScreen from './screens/HistoryDetailScreen';
import QuickEditScreen from './screens/QuickEditScreen';
import ProgressScreen from './screens/ProgressScreen';
import MoreScreen from './screens/MoreScreen';
import BodyWeightScreen from './screens/BodyWeightScreen';
import { RestTimerBar, RestTimerProvider, useRestTimer } from './timer/RestTimer';

const tabs = [
  { to: '/', label: 'Dziś', icon: '🏋️', end: true },
  { to: '/historia', label: 'Historia', icon: '📅' },
  { to: '/postepy', label: 'Postępy', icon: '📈' },
  { to: '/plan', label: 'Plan', icon: '📋' },
  { to: '/wiecej', label: 'Więcej', icon: '⚙️' },
];

function BottomNav() {
  const { pathname } = useLocation();
  // Na ekranie treningu chowamy dolne menu – więcej miejsca na serie.
  if (pathname.startsWith('/trening/')) return null;
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex max-w-xl">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cx(
                'flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold',
                isActive ? 'text-accent-600 dark:text-accent-400' : 'text-zinc-500',
              )
            }
          >
            <span className="text-xl leading-none grayscale-[30%]">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Layout() {
  const { pathname } = useLocation();
  const hasNav = !pathname.startsWith('/trening/');
  const timerActive = !!useRestTimer().state;
  return (
    <div className={cx('min-h-dvh', hasNav && (timerActive ? 'pb-[calc(9rem+env(safe-area-inset-bottom))]' : 'pb-[calc(4rem+env(safe-area-inset-bottom))]'))}>
      <Routes>
        <Route path="/" element={<TodayScreen />} />
        <Route path="/trening/:id" element={<WorkoutScreen />} />
        <Route path="/historia" element={<HistoryScreen />} />
        <Route path="/historia/:id" element={<HistoryDetailScreen />} />
        <Route path="/historia/:id/edytuj" element={<QuickEditScreen />} />
        <Route path="/postepy" element={<ProgressScreen />} />
        <Route path="/plan" element={<PlanScreen />} />
        <Route path="/plan/:id" element={<TemplateEditScreen />} />
        <Route path="/cwiczenia" element={<ExercisesScreen />} />
        <Route path="/cwiczenia/:id" element={<ExerciseScreen />} />
        <Route path="/wiecej" element={<MoreScreen />} />
        <Route path="/masa" element={<BodyWeightScreen />} />
        <Route path="*" element={<TodayScreen />} />
      </Routes>
      <RestTimerBar />
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <RestTimerProvider>
        <Layout />
      </RestTimerProvider>
    </HashRouter>
  );
}
