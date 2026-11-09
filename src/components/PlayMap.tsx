import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import type { PlayPoint, PlayType } from '../core/types.ts';
import { PLAY_AXES, PLAY_SOURCE, PLAY_TYPES, playInfo, playProfile, quadrantOf, suggestForPlay, type PlayItem } from '../core/caillois.ts';
import { useWorkbench } from './context.tsx';
import { Icon } from './Icons.tsx';
import { HelpPopover, PlayBars } from './Help.tsx';

const SIZE = 300, PAD = 30, R = (SIZE - PAD * 2) / 2, C = SIZE / 2;
/** Points use 88% of the half-width so pure categories sit inside their corner, not on the frame. */
const INSET = 0.88, PR = R * INSET;
const toSvg = (p: PlayPoint) => ({ x: C + p.x * PR, y: C - p.y * PR });
const fromSvg = (x: number, y: number): PlayPoint => ({ x: Math.max(-1, Math.min(1, (x - C) / PR)), y: Math.max(-1, Math.min(1, (C - y) / PR)) });
const inside = (v: number) => Math.max(PAD + 6, Math.min(SIZE - PAD - 6, v));
/** Spread cards that share the same point so each stays clickable (display only, not data). */
function spread(items: PlayItem[]) {
    const seen = new Map<string, number>();
    return items.map(item => {
        const key = `${item.point.x},${item.point.y}`;
        const k = seen.get(key) ?? 0;
        seen.set(key, k + 1);
        const p = toSvg(item.point);
        if (!k)
            return { item, ...p };
        const angle = k * 2.399, dist = 7 + 3 * Math.sqrt(k);
        return { item, x: inside(p.x + Math.cos(angle) * dist), y: inside(p.y + Math.sin(angle) * dist) };
    });
}
function QuadrantHelp({ type }: {
    type: PlayType;
}) {
    const p = playInfo(type);
    return <HelpPopover label={`${p.label}（${p.meaning}）の説明`} placement="start" width={300}>{() => <>
        <div className="help-pop-head"><span className="play-swatch" style={{ '--play-color': p.color } as CSSProperties}/><div><div className="section-eyebrow">{p.latin.toUpperCase()} · CAILLOIS</div><h3>{p.label}（{p.meaning}）</h3></div></div>
        <div className="help-pop-body"><p className="help-summary">{p.description}</p><dl className="help-facts"><dt>設計の問い</dt><dd>{p.designPrompt}</dd><dt>代表例</dt><dd><ul className="example-list">{p.examples.map(e => <li key={e}>{e}</li>)}</ul></dd></dl></div>
    </>}</HelpPopover>;
}
export function PlayMap() {
    const { store, state, board, catalog } = useWorkbench();
    const profile = useMemo(() => playProfile(catalog, board), [catalog, board]);
    const [drag, setDrag] = useState<{ id: string; point: PlayPoint; moved: boolean } | null>(null);
    const [seed, setSeed] = useState(0);
    const svg = useRef<SVGSVGElement>(null);
    const used = board.nodes.flatMap(n => n.data.materialId ? [n.data.materialId] : []);
    const focus: PlayType = profile.gaps[0] ?? (profile.dominant ? PLAY_TYPES[(PLAY_TYPES.findIndex(p => p.id === profile.dominant) + 3) % 4]!.id : 'ilinx');
    const [target, setTarget] = useState<PlayType | null>(null);
    const suggestType = target ?? focus;
    const suggestions = suggestForPlay(catalog, suggestType, [...used, ...state.tray], 6, seed);
    const selected = board.nodes.find(n => n.id === state.selected[0]);
    const selectedItem = profile.items.find(i => i.nodeId === selected?.id);
    const movable = (kind: string) => kind === 'idea' || kind === 'note';
    function pointFromEvent(e: PointerEvent): PlayPoint | null {
        const el = svg.current;
        if (!el)
            return null;
        const r = el.getBoundingClientRect();
        return fromSvg((e.clientX - r.left) * SIZE / r.width, (e.clientY - r.top) * SIZE / r.height);
    }
    const committed = useRef<object | null>(null);
    function finishDrag() {
        // pointerup and lostpointercapture can both arrive for one gesture; commit it once.
        if (drag && committed.current !== drag) {
            committed.current = drag;
            if (drag.moved)
                store.pinPlay(drag.id, drag.point);
        }
        setDrag(null);
    }
    function onKey(e: KeyboardEvent, item: PlayItem) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            store.ui({ selected: [item.nodeId], selectedEdge: null });
            return;
        }
        const step = e.shiftKey ? 0.25 : 0.1;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
        if (!d || !movable(item.kind))
            return;
        e.preventDefault();
        if (!state.selected.includes(item.nodeId))
            store.ui({ selected: [item.nodeId], selectedEdge: null });
        store.pinPlay(item.nodeId, { x: item.point.x + d[0]!, y: item.point.y + d[1]! });
    }
    const points = spread(profile.items.map(i => drag && drag.id === i.nodeId ? { ...i, point: drag.point } : i));
    return <div className="play-map-panel">
        <p className="inspector-kicker">ROGER CAILLOIS · 遊びの4分類</p>
        <p className="play-intro">ボード上の素材と仮説を、カイヨワの「競争・運・模倣・眩暈」の地図に置きます。偏りと空白から、次に混ぜる素材を探しましょう。</p>
        <div className="play-map-frame">
            <svg ref={svg} className="play-map" viewBox={`0 0 ${SIZE} ${SIZE}`} role="group" aria-label="カイヨワの遊びの地図。横軸は意志から委ねるへ、縦軸は虚構からルールへ。" onPointerMove={e => { if (!drag) return; const p = pointFromEvent(e); if (p) setDrag({ id: drag.id, point: p, moved: true }); }} onPointerUp={finishDrag} onPointerCancel={() => setDrag(null)} onLostPointerCapture={finishDrag}>
                {PLAY_TYPES.map(p => <rect key={p.id} className="play-quadrant" x={p.qx < 0 ? PAD : C} y={p.qy > 0 ? PAD : C} width={R} height={R} style={{ '--play-color': p.color } as CSSProperties}/>)}
                <line className="play-axis" x1={PAD} y1={C} x2={SIZE - PAD} y2={C}/><line className="play-axis" x1={C} y1={PAD} x2={C} y2={SIZE - PAD}/>
                <text className="play-axis-label" x={C + 5} y={PAD + 12}>{PLAY_AXES.y.positive}</text>
                <text className="play-axis-label" x={C + 5} y={SIZE - PAD - 6}>{PLAY_AXES.y.negative}</text>
                <text className="play-axis-label" x={PAD + 5} y={C - 6}>{PLAY_AXES.x.negative}</text>
                <text className="play-axis-label" x={SIZE - PAD - 5} y={C - 6} textAnchor="end">{PLAY_AXES.x.positive}</text>
                {PLAY_TYPES.map(p => <text key={p.id} className="play-quadrant-label" style={{ '--play-color': p.color } as CSSProperties} x={p.qx < 0 ? PAD : SIZE - PAD} y={p.qy > 0 ? PAD - 10 : SIZE - PAD + 20} textAnchor={p.qx < 0 ? 'start' : 'end'}>{p.label}<tspan className="sub" dx="5">{p.meaning} {Math.round(profile.share[p.id] * 100)}%</tspan></text>)}
                {profile.centroid && <g className="play-centroid" transform={`translate(${toSvg(profile.centroid).x} ${toSvg(profile.centroid).y})`} aria-hidden="true"><circle r="9"/><path d="M-13 0h26 M0 -13v26"/></g>}
                {points.map(({ item, x, y }) => { const isSel = state.selected.includes(item.nodeId); const cls = item.kind === 'material' ? item.materialKind : item.kind; return <g key={item.nodeId} className={`play-point ${cls} ${isSel ? 'selected' : ''} ${item.pinned ? 'pinned' : ''} ${movable(item.kind) ? 'movable' : ''}`} transform={`translate(${x} ${y})`} tabIndex={0} role="button" aria-label={`${item.label}（${playInfo(quadrantOf(item.point)).label}寄り${item.pinned ? '・手動配置' : ''}）`} aria-pressed={isSel} onKeyDown={e => onKey(e, item)} onPointerDown={e => { store.ui({ selected: [item.nodeId], selectedEdge: null }); if (movable(item.kind)) { e.preventDefault(); (e.currentTarget.ownerSVGElement ?? e.currentTarget as unknown as Element).setPointerCapture?.(e.pointerId); setDrag({ id: item.nodeId, point: item.point, moved: false }); } }}>
                    <title>{item.label}</title>
                    <circle className="hit" r="12"/>
                    {item.kind === 'idea' ? <path className="mark" d="M0 -8L8 0L0 8L-8 0Z"/> : item.kind === 'note' ? <rect className="mark" x="-6" y="-6" width="12" height="12" rx="2"/> : <circle className="mark" r={isSel ? 6.5 : 5}/>}
                    {(isSel || item.kind === 'idea') && <text className="point-label" y={-12} textAnchor={x < C - 60 ? 'start' : x > C + 60 ? 'end' : 'middle'} x={x < C - 60 ? -6 : x > C + 60 ? 6 : 0}>{item.label.length > 14 ? item.label.slice(0, 13) + '…' : item.label}</text>}
                </g>; })}
            </svg>
            <div className="play-map-help">{PLAY_TYPES.map(p => <span key={p.id} className="play-chip" style={{ '--play-color': p.color } as CSSProperties}><span className="play-swatch"/>{p.label}<QuadrantHelp type={p.id}/></span>)}</div>
        </div>
        <div className="play-legend" aria-hidden="true"><span><i className="dot tag"/>タグ</span><span><i className="dot mechanic"/>メカニクス</span><span><i className="dot idea"/>仮説</span><span><i className="dot note"/>付箋</span><span><i className="dot centroid"/>重心</span></div>
        {!profile.items.length && <div className="lab-tip"><h3><Icon name="quadrant"/>まだ地図に置けるカードがありません</h3><p>タグやメカニクスをボードに追加すると、遊びの型の偏りが見えてきます。</p></div>}
        <div className="panel-divider"/>
        <div className="field-label">選択中のカード</div>
        {selected && selectedItem ? <div className="play-selected"><strong>{selected.data.title}</strong><span>{playInfo(quadrantOf(selectedItem.point)).label}（{playInfo(quadrantOf(selectedItem.point)).meaning}）の象限{selectedItem.pinned ? ' · 手動で配置' : selected.type === 'idea' ? ' · 素材から自動配置' : ''}</span>{!selectedItem.pinned && <PlayBars weights={selectedItem.weights}/>}{movable(selected.type) && <div className="mix-actions">{selectedItem.pinned ? <button className="btn small" onClick={() => store.pinPlay(selected.id, null)}>自動の位置に戻す</button> : <span className="hint-text">点をドラッグ、または矢印キーで狙いの位置へ</span>}</div>}</div>
            : selected && movable(selected.type) ? <div className="play-selected"><strong>{selected.data.title}</strong><span>この{selected.type === 'note' ? '付箋' : '仮説'}はまだ地図にありません。</span><div className="mix-actions"><button className="btn small" onClick={() => store.pinPlay(selected.id, { x: 0, y: 0 })}><Icon name="quadrant"/>地図の中央に置く</button></div></div>
                : <p className="hint-text">ボードか地図の点を選ぶと、遊びの型を確認できます。仮説と付箋は地図上で動かして「狙い」を置けます。</p>}
        <div className="panel-divider"/>
        <div className="field-label">空白から混ぜる <span className="hint">{profile.gaps.length ? `空き: ${profile.gaps.map(g => playInfo(g).label).join('・')}` : '偏りは少なめ'}</span></div>
        <div className="operator-list play-targets" role="radiogroup" aria-label="提案する遊びの型">{PLAY_TYPES.map(p => <button key={p.id} role="radio" aria-checked={suggestType === p.id} className={`operator ${suggestType === p.id ? 'active' : ''}`} style={{ '--play-color': p.color } as CSSProperties} onClick={() => { setTarget(p.id); setSeed(0); }}>{p.label}</button>)}</div>
        <p className="operator-description">{playInfo(suggestType).designPrompt}</p>
        <div className="suggestion-list">{suggestions.map(m => <div key={m.id} className="suggestion-row"><span className={`material-glyph ${m.kind}`}><Icon name={m.kind === 'tag' ? 'tag' : 'book'}/></span><button className="library-label" style={{ textAlign: 'left', padding: 0 }} title={m.summary} onClick={() => store.toggleTray(m.id)}><strong>{m.label}</strong><small>{m.summary}</small></button><button className="item-add" aria-label={`${m.label}をボードに追加`} title="ボードに追加" onClick={() => store.addMaterial(m.id)}><Icon name="plus"/></button></div>)}</div>
        <div className="mix-actions"><button className="btn small subtle" onClick={() => setSeed(seed + 1)}><Icon name="shuffle"/>別の候補</button><button className="btn small subtle" onClick={() => { store.setTray([...state.tray, ...suggestions.slice(0, 2).map(m => m.id)]); store.ui({ panel: 'lab' }); }}><Icon name="flask"/>上位2件をラボへ</button></div>
        <div className="metadata play-source">{PLAY_SOURCE}<br />{PLAY_AXES.paidiaLudus}<br />位置は素材ごとの編集上の目安（0〜3）から計算しています。プレイヤー調査や評価ではありません。</div>
    </div>;
}
