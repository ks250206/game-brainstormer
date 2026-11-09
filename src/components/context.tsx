import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { WorkbenchStore } from '../core/store.ts';
export const WorkbenchContext = createContext<WorkbenchStore | null>(null);
export function useWorkbench() { const store = useContext(WorkbenchContext); if (!store)
    throw new Error('Workbench provider missing'); const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot); return { store, state, catalog: store.catalog, board: store.board() }; }
export type ThemeMode = 'light' | 'dark' | 'system';
export const THEME_KEY = 'game-brainstormer.theme';
export const ThemeModeContext = createContext<ThemeMode>('system');
/** Resolve the effective colour scheme for components that need concrete colours (e.g. React Flow minimap). */
export function useIsDark(): boolean {
    const mode = useContext(ThemeModeContext);
    const [systemDark, setSystemDark] = useState(false);
    useEffect(() => { const q = window.matchMedia('(prefers-color-scheme: dark)'); setSystemDark(q.matches); const on = (e: MediaQueryListEvent) => setSystemDark(e.matches); q.addEventListener('change', on); return () => q.removeEventListener('change', on); }, []);
    return mode === 'dark' || (mode === 'system' && systemDark);
}
