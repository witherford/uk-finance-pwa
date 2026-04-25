import { useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themePref = useFinanceStore(s => s.state.profile.themePref);
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = themePref === 'dark' || (themePref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', dark);
    };
    apply();
    if (themePref === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [themePref]);
  return <>{children}</>;
}
