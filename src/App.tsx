import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { Button } from '@astryxdesign/core/Button';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import catalogData from './data/catalog.json';
import type { Catalog } from './core/types.ts';
import { WorkbenchStore } from './core/store.ts';
import { MAX_IMPORT_BYTES, STORAGE_KEY, toMarkdown, toSvg } from './core/engine.ts';
import { WorkbenchContext, ThemeModeContext, THEME_KEY, type ThemeMode } from './components/context.tsx';
import { Icon } from './components/Icons.tsx';
import { Ribbon, Library } from './components/Library.tsx';
import { Lab } from './components/Lab.tsx';
import { QuadrantMap } from './components/QuadrantMap.tsx';
const BoardCanvas = lazy(() => import('./components/Board.tsx').then(m => ({ default: m.BoardCanvas })));
export function downloadFile(name: string, contents: string, type = 'application/json') { const url = URL.createObjectURL(new Blob([contents], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function Help({ close }: {
    close: () => void;
}) { const ref = useRef<HTMLDialogElement>(null); useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []); return <dialog ref={ref} className="help-native" onCancel={close}><button className="icon-btn help-close" aria-label="ヘルプを閉じる" onClick={close}><Icon name="x"/></button><h2>まだない遊びを、実験しよう。</h2><h3>01 / 素材を探す</h3><p>上のリボンは、ゲーム制作で決める問いごとの11分類（操作・戦略・謎・構築・成長・構造・物語・人数・世界観・表現・形式）。タグ429件・メカニクス203件を横断します。関連する分類にも重ねて現れます。日本語の同義語・タグ名・メカニクスIDで検索できます。各素材の「?」で説明と代表作を確認できます。</p><h3>02 / つないで、混ぜる</h3><p>素材をドラッグ、または＋で配置。素材名のクリックでラボへ送れます。カード右端から別のカード左端へ線を引くか、接続ツールで2枚を選びます。Shiftで複数選択。「素材にする」でまとめて混ぜられます。</p><h3>03 / 化学反応を仮説にする</h3><p>ベースの遊び、素材、変換の方法を選び「反応を試す」。出力はルールベースの問いと既存のブレスト例です。AIや売上予測による評価ではありません。コアルール・プレイ例・最小の実験・懸念点を編集して比較します。</p><h3>04 / カイヨワの遊びの地図</h3><p>右パネルの「遊びの地図」は、ロジェ・カイヨワの分類表です。アゴン（競争）・アレア（運）・ミミクリ（模倣）・イリンクス（眩暈）の4列に、上のパイディア（即興）から下のルドゥス（規則）まで、ボードのカードを素材データから自動で置きます。偏りと空白を見て、足りない型の素材を混ぜられます。位置は編集上の目安で、自動評価ではありません。</p><h3>05 / 二軸四象限マップ</h3><p>ボード上部の切り替えで「二軸四象限マップ」を開きます。軸を自分で決め（プリセットあり）、カードをドラッグで置いて比べる、カイヨワとは別の汎用ポジショニングマップです。空いた象限には「狙う付箋」を置けます。ボードごとに保存されます。</p><h3>保存と出典</h3><p>データはこのブラウザのlocalStorageにのみ保存。JSONは全ボードのバックアップ、Markdownは企画書、SVGはボード画像です。読み込みは現在のボードを削除せず追加します。元データは会話で作った2026-10-11のスナップショット。順位は適用頻度で、売上ではありません。書籍本文ではなく項目名・IDと独自の応用案を収録しています。</p><h3>キーボード</h3><p>右上で表示テーマ（ライト・ダーク・自動）を切り替えられます。<br />V 選択 / H 移動 / N 付箋 / Delete 削除 / ⌘・Ctrl + Z 戻す / Shift + ⌘・Ctrl + Z やり直す / ⌘・Ctrl + D 複製。入力欄ではブラウザ標準の編集を優先します。</p><Button label="ボードに戻る" variant="primary" onClick={close}/></dialog>; }
const THEMES: [ThemeMode, string, string][] = [['light', 'ライト', 'sun'], ['dark', 'ダーク', 'moon'], ['system', '自動（OSに合わせる）', 'auto']];
function ThemeSwitch({ mode, onChange }: {
    mode: ThemeMode;
    onChange: (mode: ThemeMode) => void;
}) { return <div className="theme-switch"><SegmentedControl label="表示テーマ" size="sm" value={mode} onChange={v => onChange(v as ThemeMode)}>{THEMES.map(([id, label, icon]) => <SegmentedControlItem key={id} value={id} label={label} isLabelHidden icon={<Icon name={icon}/>}/>)}</SegmentedControl></div>; }
export default function App() {
    const [store] = useState(() => new WorkbenchStore(catalogData as Catalog));
    const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const board = store.board();
    const [mounted, setMounted] = useState(false), [loaded, setLoaded] = useState(false), [saveStatus, setSaveStatus] = useState('ローカルに保存'), [saveError, setSaveError] = useState(false), [help, setHelp] = useState(false);
    const blocked = useRef(false), importRef = useRef<HTMLInputElement>(null);
    const [mode, setMode] = useState<ThemeMode>('system');
    // Runs after Astryx Theme's own layout effect and before paint, so a stored choice never flashes.
    useLayoutEffect(() => { try {
        const saved = window.localStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark')
            setMode(saved);
    }
    catch { /* Storage may be blocked; follow the OS. */ } }, []);
    function changeMode(next: ThemeMode) { setMode(next); try {
        if (next === 'system')
            window.localStorage.removeItem(THEME_KEY);
        else
            window.localStorage.setItem(THEME_KEY, next);
    }
    catch { /* The choice still applies for this session. */ } }
    useEffect(() => { setMounted(true); try {
        store.restore(window.localStorage);
    }
    catch (error) {
        blocked.current = true;
        setSaveError(true);
        setSaveStatus('保存データの復元に失敗');
        store.ui({ toast: `保存済みデータは上書きせず保持しました。JSONのバックアップから読み込んでください。${String(error)}` });
    } setLoaded(true); }, [store]);
    useEffect(() => { if (!loaded || blocked.current)
        return; setSaveStatus('保存中…'); const timer = setTimeout(() => { try {
        store.persist(window.localStorage);
        setSaveStatus('ローカルに保存');
        setSaveError(false);
    }
    catch {
        setSaveStatus('保存できません · JSONで退避');
        setSaveError(true);
    } }, 250); return () => clearTimeout(timer); }, [store, state.workspace, loaded]);
    useEffect(() => { const flush = () => { if (!blocked.current)
        try {
            store.persist(window.localStorage);
        }
        catch { /* Status already exposes persistence failures. */ } }; window.addEventListener('pagehide', flush); return () => window.removeEventListener('pagehide', flush); }, [store]);
    useEffect(() => { if (!state.toast)
        return; const timer = setTimeout(() => store.ui({ toast: '' }), 5000); return () => clearTimeout(timer); }, [state.toast, store]);
    useEffect(() => { function onKey(e: KeyboardEvent) { const target = e.target as HTMLElement; if (target.closest('input,textarea,select,[contenteditable="true"],dialog'))
        return; const mod = e.metaKey || e.ctrlKey; const k = e.key.toLowerCase(); if (mod && k === 'z') {
        e.preventDefault();
        e.shiftKey ? store.redo() : store.undo();
    }
    else if (mod && k === 'y') {
        e.preventDefault();
        store.redo();
    }
    else if (mod && k === 'd') {
        e.preventDefault();
        store.duplicateSelected();
    }
    else if (mod && k === 'a') {
        e.preventDefault();
        store.ui({ selected: store.board().nodes.filter(n => n.type !== 'frame').map(n => n.id) });
    }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        store.deleteSelected();
    }
    else if (!mod && k === 'n') {
        e.preventDefault();
        store.addNote();
    }
    else if (!mod && k === 'v')
        store.ui({ tool: 'select' });
    else if (!mod && k === 'h')
        store.ui({ tool: 'pan' });
    else if (e.key === 'Escape')
        store.ui({ selected: [], selectedEdge: null, tool: 'select', mobilePanel: 'none' }); } window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [store]);
    async function readImport(file?: File) { if (!file)
        return; try {
        if (file.size > MAX_IMPORT_BYTES)
            throw new Error('JSONは5MB以下にしてください。');
        store.import(await file.text());
    }
    catch (e) {
        store.ui({ toast: `読み込みできません: ${e instanceof Error ? e.message : String(e)}` });
    } if (importRef.current)
        importRef.current.value = ''; }
    const staticBoard = <section className="board-area"><div className="canvas-heading"><div className="eyebrow">YOUR NEXT GAME STARTS HERE</div><h1>つないで、ずらして、化学反応を。</h1></div><div className="ssg-board" dangerouslySetInnerHTML={{ __html: toSvg(board) }}/></section>;
    return <Theme theme={neutralTheme} mode={mode}><ThemeModeContext.Provider value={mode}><WorkbenchContext.Provider value={store}><div className="app"><header className="app-header"><div className="brand"><span className="brand-mark"><Icon name="brand"/></span><div><div className="brand-title">Game Brainstormer</div><small>A PLAYGROUND FOR POSSIBILITIES</small></div></div><div className="header-divider"/><div className="header-title"><select className="board-switch" aria-label="ボードを切り替える" value={board.id} onChange={e => store.switchBoard(e.target.value)}>{state.workspace.boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select><button className="icon-btn" aria-label="新しいボード" title="新しいボード" onClick={() => store.newBoard()}><Icon name="plus"/></button></div><div className={`save-status ${saveError ? 'error' : ''}`} role="status"><span className="save-dot"/>{saveStatus}</div><div className="header-actions"><ThemeSwitch mode={mode} onChange={changeMode}/><button className="btn subtle" onClick={() => importRef.current?.click()}><Icon name="upload"/><span>読み込み</span></button><details className="export-menu"><summary className="btn"><Icon name="download"/><span>書き出し</span><Icon name="chevron"/></summary><div className="menu-pop"><button onClick={() => downloadFile('game-brainstormer.json', JSON.stringify(state.workspace, null, 2))}><Icon name="save"/>全ボードをJSON保存</button><button onClick={() => downloadFile('game-concept.md', toMarkdown(board, store.catalog), 'text/markdown')}><Icon name="note"/>企画をMarkdownへ</button><button onClick={() => downloadFile('brainstorm-board.svg', toSvg(board), 'image/svg+xml')}><Icon name="board"/>ボードをSVG画像へ</button><button onClick={() => { const name = window.prompt('ボード名', board.title); if (name)
        store.renameBoard(name); }}>ボード名を変更</button><div className="menu-theme" role="group" aria-label="表示テーマ（モバイル）">{THEMES.map(([id, label, icon]) => <button key={id} aria-pressed={mode === id} className={mode === id ? 'active' : ''} onClick={() => changeMode(id)}><Icon name={icon}/>{label.replace('（OSに合わせる）', '')}</button>)}</div></div></details><button className="icon-btn" aria-label="使い方とデータの出典" onClick={() => setHelp(true)}><Icon name="info"/></button></div><input type="file" ref={importRef} accept="application/json,.json" hidden onChange={e => void readImport(e.target.files?.[0])}/></header><Ribbon /><main className={`workspace ${state.mobilePanel === 'library' ? 'show-library' : state.mobilePanel === 'lab' ? 'show-lab' : ''}`}><Library />{!mounted ? staticBoard : state.view === 'quadrant' ? <QuadrantMap /> : <Suspense fallback={staticBoard}><BoardCanvas /></Suspense>}<Lab /></main><footer className="board-footer"><span>{board.nodes.filter(n => n.type !== 'frame').length} カード</span><span>{board.edges.length} つながり</span><span className="footer-help">Shift + クリックで複数選択 · H でパン · N で付箋</span><span className="right">LOCAL-FIRST · NO ACCOUNT · YOUR IDEAS STAY HERE</span></footer>{state.toast && <div className="toast" role="status">{state.toast}</div>}{help && <Help close={() => setHelp(false)}/>}</div></WorkbenchContext.Provider></ThemeModeContext.Provider></Theme>;
}
