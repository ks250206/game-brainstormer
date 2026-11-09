import { createContext, useContext, useSyncExternalStore } from 'react';
import { WorkbenchStore } from '../core/store.ts';
export const WorkbenchContext = createContext<WorkbenchStore | null>(null);
export function useWorkbench() { const store = useContext(WorkbenchContext); if (!store)
    throw new Error('Workbench provider missing'); const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot); return { store, state, catalog: store.catalog, board: store.board() }; }
