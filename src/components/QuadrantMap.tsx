import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import type { AxisLabels, BoardNode, MapPoint, QuadrantMap as QuadrantModel } from '../core/types.ts';
import { CUSTOM_PRESET, QUADRANT_ORDER, QUADRANT_PRESETS, clampPoint, defaultQuadrant, quadrantMeaning, quadrantOf, quadrantSummary, type QuadrantIndex } from '../core/quadrant.ts';
import { material } from '../core/engine.ts';
import { useWorkbench } from './context.tsx';
import { Icon } from './Icons.tsx';
import { MobileNav, ViewSwitch } from './BoardChrome.tsx';
import { HelpPopover } from './Help.tsx';

/**
 * Component 2 — a general two-axis, four-quadrant positioning map. The designer picks
 * the axes and places cards by hand. Nothing here is derived from the Caillois lens.
 */
const QUAD_COLORS = ['#378c79', '#517fa7', '#8d74b0', '#cc7359'];
const toPct = (p: MapPoint) => ({ left: `${(p.x + 1) * 50}%`, top: `${(1 - p.y) * 50}%` });
function kindOf(n: BoardNode, catalog: ReturnType<typeof useWorkbench>['catalog']) {
    if (n.type !== 'material')
        return n.type;
    return material(catalog, n.data.materialId ?? '')?.kind ?? 'tag';
}
function LabelInput({ label, value, onCommit, className = '' }: {
    label: string;
    value: string;
    onCommit: (v: string) => void;
    className?: string;
}) {
    const [draft, setDraft] = useState(value);
    useEffect(() => setDraft(value), [value]);
    return <input className={`field-input ${className}`} aria-label={label} placeholder={label} maxLength={40} value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => { if (draft.trim() && draft !== value) onCommit(draft.trim()); else setDraft(value); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}/>;
}
export function QuadrantMap() {
    const { store, state, board, catalog } = useWorkbench();
    const map: QuadrantModel = board.quadrant ?? defaultQuadrant();
    const summary = quadrantSummary(board);
    const plane = useRef<HTMLDivElement>(null);
    const [drag, setDrag] = useState<{ id: string; point: MapPoint | null; moved: boolean; fromTray: boolean } | null>(null);
    const committed = useRef<object | null>(null);
    const cards = board.nodes.filter(n => n.type !== 'frame');
    const byId = new Map(cards.map(n => [n.id, n]));
    const preset = QUADRANT_PRESETS.find(p => p.id === map.preset);
    function pointAt(e: PointerEvent, clamp: boolean): MapPoint | null {
        const r = plane.current?.getBoundingClientRect();
        if (!r)
            return null;
        const p = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: 1 - ((e.clientY - r.top) / r.height) * 2 };
        if (!clamp && (Math.abs(p.x) > 1 || Math.abs(p.y) > 1))
            return null;
        return clampPoint(p);
    }
    function startDrag(e: PointerEvent<HTMLElement>, id: string, fromTray: boolean) {
        if (e.button !== 0)
            return;
        store.ui({ selected: [id], selectedEdge: null });
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({ id, point: fromTray ? null : map.positions[id] ?? null, moved: false, fromTray });
    }
    function moveDrag(e: PointerEvent) { if (drag) setDrag({ ...drag, point: pointAt(e, !drag.fromTray), moved: true }); }
    function endDrag() {
        // pointerup and lostpointercapture can both arrive for one gesture; commit it once.
        if (drag && committed.current !== drag) {
            committed.current = drag;
            if (drag.moved && drag.point)
                store.placeOnQuadrant(drag.id, drag.point);
        }
        setDrag(null);
    }
    function onChipKey(e: KeyboardEvent, id: string) {
        const p = map.positions[id];
        if (!p)
            return;
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // Only take the card off the map; never delete it from the board from here.
            e.preventDefault();
            e.stopPropagation();
            store.placeOnQuadrant(id, null);
            return;
        }
        const step = e.shiftKey ? 0.2 : 0.05;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
        if (!d)
            return;
        e.preventDefault();
        store.ui({ selected: [id], selectedEdge: null });
        store.placeOnQuadrant(id, { x: p.x + d[0]!, y: p.y + d[1]! });
    }
    const setAxis = (axis: 'x' | 'y', side: keyof AxisLabels, v: string) => store.setQuadrant({ [axis]: { ...map[axis], [side]: v } });
    const setName = (q: QuadrantIndex, v: string) => { const names = [...map.names] as QuadrantModel['names']; names[q] = v; store.setQuadrant({ names }); };
    function placeUnplaced(id: string) {
        const i = summary.placed.length;
        store.placeOnQuadrant(id, { x: ((i * 7) % 5 - 2) * 0.08, y: ((i * 3) % 5 - 2) * 0.08 });
        store.ui({ selected: [id], selectedEdge: null });
    }
    function noteInGap(q: QuadrantIndex) {
        const o = QUADRANT_ORDER[q]!;
        const id = store.addNote();
        store.patchNode(id, { title: `「${map.names[q]}」を狙う案`, body: `${quadrantMeaning(map, q)}。この象限に入るゲームの核は？` });
        store.placeOnQuadrant(id, { x: o.xs * 0.5, y: o.ys * 0.5 });
    }
    const shown = (id: string): MapPoint | undefined => drag?.id === id && drag.point ? drag.point : map.positions[id];
    const chip = (n: BoardNode, placed: boolean) => {
        const p = shown(n.id);
        const kind = kindOf(n, catalog);
        const sel = state.selected.includes(n.id);
        return <div key={n.id} className={`quad-chip ${kind} ${sel ? 'selected' : ''} ${drag?.id === n.id ? 'dragging' : ''}`} style={placed && p ? toPct(p) : undefined} role="button" tabIndex={0} aria-pressed={sel}
            aria-label={placed && p ? `${n.data.title}（${map.names[quadrantOf(p)]}）` : `${n.data.title}（未配置）`}
            onPointerDown={e => startDrag(e, n.id, !placed)} onPointerMove={moveDrag} onPointerUp={endDrag} onLostPointerCapture={endDrag} onKeyDown={e => placed ? onChipKey(e, n.id) : (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), placeUnplaced(n.id))}>
            <span className="quad-dot"/>{n.data.title.length > 18 ? n.data.title.slice(0, 17) + '…' : n.data.title}
        </div>;
    };
    const ghost = drag?.fromTray && drag.point ? byId.get(drag.id) : undefined;
    return <section className="board-area quadrant-view" aria-label="二軸四象限マップ">
        <div className="canvas-heading"><div className="eyebrow">TWO-AXIS POSITIONING MAP</div><h1>二軸四象限マップ</h1></div>
        <ViewSwitch /><MobileNav />
        <div className="quad-layout">
            <div className="quad-stage">
                <span className="quad-axis-label top">{map.y.positive} ↑</span>
                <span className="quad-axis-label bottom">↓ {map.y.negative}</span>
                <span className="quad-axis-label left">◀ {map.x.negative}</span>
                <span className="quad-axis-label right">{map.x.positive} ▶</span>
                <div className="quad-plane" ref={plane} role="group" aria-label={`二軸四象限マップ。横軸は${map.x.negative}から${map.x.positive}、縦軸は${map.y.negative}から${map.y.positive}。`}>
                    {QUADRANT_ORDER.map(o => <div key={o.index} className={`quad-cell q${o.index} ${summary.empty.includes(o.index) ? 'empty' : ''}`} style={{ '--quad-color': QUAD_COLORS[o.index] } as CSSProperties}>
                        <div className="quad-name"><strong>{map.names[o.index]}</strong><small>{quadrantMeaning(map, o.index)} · {summary.counts[o.index]}枚</small></div>
                        {summary.empty.includes(o.index) && <button className="quad-gap" onClick={() => noteInGap(o.index)}><Icon name="note"/>空白：ここを狙う付箋を置く</button>}
                    </div>)}
                    <div className="quad-axis x" aria-hidden="true"/><div className="quad-axis y" aria-hidden="true"/>
                    {summary.placed.map(p => chip(byId.get(p.nodeId)!, true))}
                    {ghost && <div className="quad-chip ghost" style={toPct(drag!.point!)} aria-hidden="true"><span className="quad-dot"/>{ghost.data.title.slice(0, 18)}</div>}
                    {!summary.placed.length && <div className="quad-empty-hint"><Icon name="quadrant"/><p>「未配置のカード」をドラッグして、<br />2つの軸のどこに当たるかを置いてみましょう。</p></div>}
                </div>
            </div>
            <aside className="quad-side" aria-label="四象限マップの設定">
                <div className="form-field"><label className="field-label" htmlFor="quad-preset">軸のセット <HelpPopover label="二軸四象限マップの使い方" placement="start" width={300}>{() => <><div className="help-pop-head"><div><div className="section-eyebrow">POSITIONING MAP</div><h3>二軸四象限マップ</h3></div></div><div className="help-pop-body"><p className="help-summary">好きな2つの軸を決め、ボードのカードを手で置いて比べる道具です。カードがない象限は、まだ誰も狙っていない空白かもしれません。</p><dl className="help-facts"><dt>使い方</dt><dd>軸のセットを選ぶか、軸の言葉を書き換える。カードをドラッグで配置。矢印キーで微調整、Deleteでマップから外す（カードは消えません）。</dd><dt>保存</dt><dd>ボードごとに保存され、JSON・Markdownにも出力されます。</dd><dt>注意</dt><dd>位置はあなたの判断です。データからの自動配置や評価ではありません。カイヨワの遊びの型は右パネルの「遊びの地図」で見られます。</dd></dl></div></>}</HelpPopover></label>
                    <select id="quad-preset" className="field-select" value={map.preset} onChange={e => store.setQuadrant({ preset: e.target.value })}>{QUADRANT_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}<option value={CUSTOM_PRESET} disabled={map.preset !== CUSTOM_PRESET}>カスタム（軸を書き換え中）</option></select>
                    {preset && <p className="hint-text">目的：{preset.purpose}</p>}</div>
                <div className="field-label">軸の言葉</div>
                <div className="quad-axes">
                    <span>横</span><LabelInput label="横軸の左" value={map.x.negative} onCommit={v => setAxis('x', 'negative', v)}/><span>→</span><LabelInput label="横軸の右" value={map.x.positive} onCommit={v => setAxis('x', 'positive', v)}/>
                    <span>縦</span><LabelInput label="縦軸の下" value={map.y.negative} onCommit={v => setAxis('y', 'negative', v)}/><span>→</span><LabelInput label="縦軸の上" value={map.y.positive} onCommit={v => setAxis('y', 'positive', v)}/>
                </div>
                <div className="field-label">象限の名前</div>
                <div className="quad-names">{[1, 0, 2, 3].map(i => { const q = i as QuadrantIndex; return <LabelInput key={q} label={`${QUADRANT_ORDER[q]!.position}の名前`} value={map.names[q]} onCommit={v => setName(q, v)}/>; })}</div>
                <div className="panel-divider"/>
                <div className="field-label">未配置のカード <span className="hint">{summary.unplaced.length}枚 · ドラッグかEnterで配置</span></div>
                <div className="quad-tray">{summary.unplaced.map(id => chip(byId.get(id)!, false))}{!summary.unplaced.length && <span className="hint-text">すべてのカードを配置しました。</span>}</div>
                {state.selected[0] && map.positions[state.selected[0]] && <div className="mix-actions"><button className="btn small" onClick={() => store.placeOnQuadrant(state.selected[0]!, null)}><Icon name="x"/>選択カードをマップから外す</button></div>}
            </aside>
        </div>
    </section>;
}
