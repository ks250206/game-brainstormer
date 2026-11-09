import { useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { PlayType } from '../core/types.ts';
import { PAIDIA_LUDUS, PLAY_SOURCE, PLAY_TYPES, dominant, playInfo, playProfile, suggestForPlay, type PlayItem } from '../core/caillois.ts';
import { useWorkbench } from './context.tsx';
import { Icon } from './Icons.tsx';
import { HelpPopover, PlayBars } from './Help.tsx';

/**
 * Component 1 — Caillois' map of play: his own table of four categories (columns),
 * each running from paidia (top) to ludus (bottom). Cards are placed from catalog data
 * only; this is an analysis lens, not a hand-made positioning map.
 */
const W = 300, LEFT = 30, TOP = 44, H = 230, COL = (W - LEFT) / 4, BOTTOM = TOP + H;
const colX = (i: number) => LEFT + COL * i;
const ludusY = (l: number) => TOP + 12 + (l / 3) * (H - 24);
/** Spread cards horizontally inside a column so equal values stay clickable (display only). */
const jitter = (i: number) => ((i * 37) % 9 - 4) * 5.2;
const LUDUS_LABEL = ['パイディア（即興）', 'やや即興', 'やや規則的', 'ルドゥス（規則）'];
const ludusText = (l: number) => LUDUS_LABEL[Math.max(0, Math.min(3, Math.round(l)))]!;

function ColumnHelp({ type }: {
    type: PlayType;
}) {
    const p = playInfo(type);
    return <HelpPopover label={`${p.label}（${p.meaning}）の説明`} placement="start" width={300}>{() => <>
        <div className="help-pop-head"><span className="play-swatch" style={{ '--play-color': p.color } as CSSProperties}/><div><div className="section-eyebrow">{p.latin.toUpperCase()} · CAILLOIS</div><h3>{p.label}（{p.meaning}）</h3></div></div>
        <div className="help-pop-body"><p className="help-summary">{p.description}</p><dl className="help-facts"><dt>設計の問い</dt><dd>{p.designPrompt}</dd><dt>パイディア</dt><dd>{p.paidia}</dd><dt>ルドゥス</dt><dd>{p.ludus}</dd><dt>ゲーム例</dt><dd><ul className="example-list">{p.examples.map(e => <li key={e}>{e}</li>)}</ul></dd></dl></div>
    </>}</HelpPopover>;
}
export function PlayMap() {
    const { store, state, board, catalog } = useWorkbench();
    const profile = useMemo(() => playProfile(catalog, board), [catalog, board]);
    const [seed, setSeed] = useState(0);
    const [target, setTarget] = useState<PlayType | null>(null);
    const [end, setEnd] = useState<'any' | 'paidia' | 'ludus'>('any');
    const used = board.nodes.flatMap(n => n.data.materialId ? [n.data.materialId] : []);
    const fallback: PlayType = profile.dominant ? PLAY_TYPES[(PLAY_TYPES.findIndex(p => p.id === profile.dominant) + 2) % 4]!.id : 'ilinx';
    const suggestType = target ?? profile.gaps[0] ?? fallback;
    const suggestions = suggestForPlay(catalog, suggestType, [...used, ...state.tray], 6, seed, end === 'paidia' ? 0 : end === 'ludus' ? 3 : undefined);
    const selected = board.nodes.find(n => n.id === state.selected[0]);
    const selectedItem = profile.items.find(i => i.nodeId === selected?.id);
    const select = (item: PlayItem) => store.ui({ selected: [item.nodeId], selectedEdge: null });
    const onKey = (e: KeyboardEvent, item: PlayItem) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(item); } };
    return <div className="play-map-panel">
        <p className="inspector-kicker">ROGER CAILLOIS · 遊びの地図</p>
        <p className="play-intro">カイヨワ『遊びと人間』の分類表です。4つの遊びの型を列に、各列を上の「パイディア（即興）」から下の「ルドゥス（規則）」へ並べ、ボードのカードを素材データから自動で置きます。</p>
        <div className="play-map-frame">
            <svg className="play-map" viewBox={`0 0 ${W} ${BOTTOM + 8}`} role="group" aria-label="カイヨワの遊びの地図。列はアゴン・アレア・ミミクリ・イリンクス、縦はパイディアからルドゥス。">
                {PLAY_TYPES.map((p, i) => { const share = profile.share[p.id]; const gap = profile.gaps.includes(p.id); return <g key={p.id} className={`play-column ${gap ? 'gap' : ''}`} style={{ '--play-color': p.color, '--play-share': String(0.05 + share * 0.35) } as CSSProperties}>
                    <rect className="play-column-bg" x={colX(i) + 2} y={TOP} width={COL - 4} height={H} rx="6"/>
                    <text className="play-column-label" x={colX(i) + COL / 2} y={16} textAnchor="middle">{p.label}</text>
                    <text className="play-column-sub" x={colX(i) + COL / 2} y={31} textAnchor="middle">{p.meaning} {Math.round(share * 100)}%</text>
                    {gap && <text className="play-gap-label" x={colX(i) + COL / 2} y={TOP + H / 2} textAnchor="middle">空白</text>}
                    {profile.ludusBy[p.id] !== null && <line className="play-ludus-avg" x1={colX(i) + 8} x2={colX(i) + COL - 8} y1={ludusY(profile.ludusBy[p.id]!)} y2={ludusY(profile.ludusBy[p.id]!)}><title>{`${p.label}の平均：${ludusText(profile.ludusBy[p.id]!)}`}</title></line>}
                </g>; })}
                <text className="play-axis-label" x={12} y={TOP + 4} textAnchor="end" transform={`rotate(-90 12 ${TOP + 4})`}>パイディア</text>
                <text className="play-axis-label" x={12} y={BOTTOM - 4} textAnchor="start" transform={`rotate(-90 12 ${BOTTOM - 4})`}>ルドゥス</text>
                <path className="play-axis-arrow" d={`M22 ${TOP + 6} V${BOTTOM - 6} M18 ${BOTTOM - 12} L22 ${BOTTOM - 6} L26 ${BOTTOM - 12}`}/>
                {profile.items.map((item, n) => { const dom = dominant(item.weights)!; const isSel = state.selected.includes(item.nodeId); const cls = item.kind === 'material' ? item.materialKind : item.kind; return PLAY_TYPES.map((p, i) => { const w = item.weights[p.id]; if (!w) return null; const main = p.id === dom; return <g key={item.nodeId + p.id} className={`play-point ${cls} ${main ? 'main' : 'sub'} ${isSel ? 'selected' : ''}`} transform={`translate(${colX(i) + COL / 2 + jitter(n)} ${ludusY(item.ludus)})`} {...(main ? { tabIndex: 0, role: 'button', 'aria-pressed': isSel, 'aria-label': `${item.label}（${playInfo(dom).label}・${ludusText(item.ludus)}）`, onKeyDown: (e: KeyboardEvent) => onKey(e, item) } : { 'aria-hidden': true })} onClick={() => select(item)}>
                    <title>{`${item.label}：${p.label} ${w}`}</title>
                    <circle className="hit" r="10"/>
                    {item.kind === 'idea' ? <path className="mark" d={`M0 ${-3 - w * 1.6}L${3 + w * 1.6} 0L0 ${3 + w * 1.6}L${-3 - w * 1.6} 0Z`}/> : <circle className="mark" r={2.5 + w * 1.4}/>}
                    {isSel && main && <text className="point-label" y={-12} textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'} x={i === 0 ? -6 : i === 3 ? 6 : 0}>{item.label.length > 12 ? item.label.slice(0, 11) + '…' : item.label}</text>}
                </g>; }); })}
            </svg>
            <div className="play-map-help">{PLAY_TYPES.map(p => <span key={p.id} className="play-chip" style={{ '--play-color': p.color } as CSSProperties}><span className="play-swatch"/>{p.label}<ColumnHelp type={p.id}/></span>)}</div>
        </div>
        <div className="play-legend" aria-hidden="true"><span><i className="dot tag"/>タグ</span><span><i className="dot mechanic"/>メカニクス</span><span><i className="dot idea"/>仮説</span><span><i className="dot sub"/>副次的な型</span><span><i className="dot avg"/>列の平均</span></div>
        {!profile.items.length && <div className="lab-tip"><h3><Icon name="spark"/>まだ地図に置けるカードがありません</h3><p>タグやメカニクスをボードに追加すると、遊びの型の偏りが見えてきます。付箋は対象外です。</p></div>}
        <div className="panel-divider"/>
        <div className="field-label">選択中のカード</div>
        {selected && selectedItem ? <div className="play-selected"><strong>{selected.data.title}</strong><span>{playInfo(dominant(selectedItem.weights)!).label}（{playInfo(dominant(selectedItem.weights)!).meaning}）が中心 · {ludusText(selectedItem.ludus)}{selected.type === 'idea' ? ' · 素材の合計から算出' : ''}</span><PlayBars weights={selectedItem.weights}/></div>
            : <p className="hint-text">{selected ? 'このカードは遊びの型を持ちません（付箋・フレーム、または道具系の素材）。' : 'ボードか地図の点を選ぶと、遊びの型を確認できます。'}</p>}
        <div className="panel-divider"/>
        <div className="field-label">空白から混ぜる <span className="hint">{profile.gaps.length ? `空き: ${profile.gaps.map(g => playInfo(g).label).join('・')}` : '偏りは少なめ'}</span></div>
        <div className="operator-list play-targets" role="radiogroup" aria-label="提案する遊びの型">{PLAY_TYPES.map(p => <button key={p.id} role="radio" aria-checked={suggestType === p.id} className={`operator ${suggestType === p.id ? 'active' : ''}`} style={{ '--play-color': p.color } as CSSProperties} onClick={() => { setTarget(p.id); setSeed(0); }}>{p.label}</button>)}</div>
        <div className="operator-list play-ends" role="radiogroup" aria-label="パイディアとルドゥスのどちら寄りを提案するか">{([['any', '指定なし'], ['paidia', 'パイディア寄り'], ['ludus', 'ルドゥス寄り']] as const).map(([id, label]) => <button key={id} role="radio" aria-checked={end === id} className={`operator ${end === id ? 'active' : ''}`} onClick={() => { setEnd(id); setSeed(0); }}>{label}</button>)}</div>
        <p className="operator-description">{playInfo(suggestType).designPrompt}</p>
        <div className="suggestion-list">{suggestions.map(m => <div key={m.id} className="suggestion-row"><span className={`material-glyph ${m.kind}`}><Icon name={m.kind === 'tag' ? 'tag' : 'book'}/></span><button className="library-label" style={{ textAlign: 'left', padding: 0 }} title={m.summary} onClick={() => store.toggleTray(m.id)}><strong>{m.label}</strong><small>{m.summary}</small></button><button className="item-add" aria-label={`${m.label}をボードに追加`} title="ボードに追加" onClick={() => store.addMaterial(m.id)}><Icon name="plus"/></button></div>)}</div>
        <div className="mix-actions"><button className="btn small subtle" onClick={() => setSeed(seed + 1)}><Icon name="shuffle"/>別の候補</button><button className="btn small subtle" onClick={() => { store.setTray([...state.tray, ...suggestions.slice(0, 2).map(m => m.id)]); store.ui({ panel: 'lab' }); }}><Icon name="flask"/>上位2件をラボへ</button></div>
        <div className="metadata play-source">{PLAY_SOURCE}<br />{PAIDIA_LUDUS.paidia.label}：{PAIDIA_LUDUS.paidia.description}<br />{PAIDIA_LUDUS.ludus.label}：{PAIDIA_LUDUS.ludus.description}<br />各素材の型（0〜3）と規則性（0〜3）は編集上の目安です。プレイヤー調査や評価ではありません。自分で軸を決めて配置したいときは「二軸四象限マップ」を使います。</div>
    </div>;
}
