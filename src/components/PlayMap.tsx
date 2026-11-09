import { useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { PlayType } from '../core/types.ts';
import { PAIDIA_LUDUS, PLAY_PAIRS, PLAY_SOURCE, PLAY_TYPES, playInfo, playProfile, strongElements, suggestForPlay, type PlayItem } from '../core/caillois.ts';
import { useWorkbench } from './context.tsx';
import { Icon } from './Icons.tsx';
import { HelpPopover, PlayBars } from './Help.tsx';

/**
 * Component 1 — Caillois' map of play, laid out like his table: four columns (agon, alea,
 * mimicry, ilinx), each running from paidia (top) to ludus (bottom).
 * The elements are independent, not exclusive classes: a card appears in every column
 * where it has any intensity (marker size = 0-3 strength), and the selected card is
 * linked across columns. Column tint follows the board's average strength of that element.
 * Positions come from catalog data only; nothing is stored.
 */
const W = 300, LEFT = 30, TOP = 44, H = 230, COL = (W - LEFT) / 4, BOTTOM = TOP + H;
const colX = (i: number) => LEFT + COL * i;
const ludusY = (l: number) => TOP + 12 + (l / 3) * (H - 24);
/** Spread cards horizontally inside a column so equal values stay clickable (display only). */
const jitter = (i: number) => ((i * 37) % 9 - 4) * 5.2;
const LUDUS_LABEL = ['パイディア（即興）', 'やや即興', 'やや規則的', 'ルドゥス（規則）'];
const ludusText = (l: number) => LUDUS_LABEL[Math.max(0, Math.min(3, Math.round(l)))]!;
const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
const radius = (w: number) => 2 + w * 1.6;

function ColumnHelp({ type }: {
    type: PlayType;
}) {
    const p = playInfo(type);
    return <HelpPopover label={`${p.label}（${p.meaning}）の説明`} placement="start" width={300}>{() => <>
        <div className="help-pop-head"><span className="play-swatch" style={{ '--play-color': p.color } as CSSProperties}/><div><div className="section-eyebrow">{p.latin.toUpperCase()} · CAILLOIS</div><h3>{p.label}（{p.meaning}）</h3></div></div>
        <div className="help-pop-body"><p className="help-summary">{p.description}</p><dl className="help-facts"><dt>設計の問い</dt><dd>{p.designPrompt}</dd><dt>パイディア</dt><dd>{p.paidia}</dd><dt>ルドゥス</dt><dd>{p.ludus}</dd><dt>ゲーム例</dt><dd><ul className="example-list">{p.examples.map(e => <li key={e}>{e}</li>)}</ul></dd></dl>
            <p className="help-note">他の3要素と相反するものではありません。ひとつのゲームに同時に強く含まれてよい性質です。</p></div>
    </>}</HelpPopover>;
}
export function PlayMap() {
    const { store, state, board, catalog } = useWorkbench();
    const profile = useMemo(() => playProfile(catalog, board), [catalog, board]);
    const [seed, setSeed] = useState(0);
    const [target, setTarget] = useState<PlayType | null>(null);
    const [end, setEnd] = useState<'any' | 'paidia' | 'ludus'>('any');
    const used = board.nodes.flatMap(n => n.data.materialId ? [n.data.materialId] : []);
    const weakest = [...PLAY_TYPES].sort((a, b) => profile.level[a.id] - profile.level[b.id])[0]!.id;
    const suggestType = target ?? profile.weak[0] ?? weakest;
    const suggestions = suggestForPlay(catalog, suggestType, [...used, ...state.tray], 6, seed, end === 'paidia' ? 0 : end === 'ludus' ? 3 : undefined);
    const selected = board.nodes.find(n => n.id === state.selected[0]);
    const selectedItem = profile.items.find(i => i.nodeId === selected?.id);
    const selIndex = selectedItem ? profile.items.indexOf(selectedItem) : -1;
    const select = (item: PlayItem) => store.ui({ selected: [item.nodeId], selectedEdge: null });
    const onKey = (e: KeyboardEvent, item: PlayItem) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(item); } };
    const describe = (item: PlayItem) => { const s = strongElements(item.weights); return s.length ? s.map(t => `${playInfo(t).label}${fmt(item.weights[t])}`).join('・') : '強い要素なし'; };
    const selectedCols = selectedItem ? PLAY_TYPES.map((p, i) => ({ i, w: selectedItem.weights[p.id] })).filter(c => c.w > 0) : [];
    return <div className="play-map-panel">
        <p className="inspector-kicker">ROGER CAILLOIS · 遊びの地図</p>
        <p className="play-intro">カイヨワ『遊びと人間』の分類表です。4つの要素を列に、各列を上の「パイディア（即興）」から下の「ルドゥス（規則）」へ並べます。4要素は<strong>相反せず同時に含まれうる</strong>ので、カードは強さのある列すべてに置かれます（点の大きさ＝強さ）。</p>
        <div className="play-map-frame">
            <svg className="play-map" viewBox={`0 0 ${W} ${BOTTOM + 8}`} role="group" aria-label="カイヨワの遊びの地図。列はアゴン・アレア・ミミクリ・イリンクス、縦はパイディアからルドゥス。カードは強さのある列すべてに表示。">
                {PLAY_TYPES.map((p, i) => { const lv = profile.level[p.id]; const weak = profile.weak.includes(p.id); return <g key={p.id} className={`play-column ${weak ? 'gap' : ''}`} style={{ '--play-color': p.color, '--play-share': String(0.05 + (lv / 3) * 0.4) } as CSSProperties}>
                    <rect className="play-column-bg" x={colX(i) + 2} y={TOP} width={COL - 4} height={H} rx="6"/>
                    <text className="play-column-label" x={colX(i) + COL / 2} y={16} textAnchor="middle">{p.label}</text>
                    <text className="play-column-sub" x={colX(i) + COL / 2} y={31} textAnchor="middle">{p.meaning} · 平均{fmt(lv)}</text>
                    {weak && <text className="play-gap-label" x={colX(i) + COL / 2} y={TOP + H / 2} textAnchor="middle">弱い</text>}
                    {profile.ludusBy[p.id] !== null && <line className="play-ludus-avg" x1={colX(i) + 8} x2={colX(i) + COL - 8} y1={ludusY(profile.ludusBy[p.id]!)} y2={ludusY(profile.ludusBy[p.id]!)}><title>{`${p.label}を含むカードの遊び方の平均：${ludusText(profile.ludusBy[p.id]!)}`}</title></line>}
                </g>; })}
                <text className="play-axis-label" x={12} y={TOP + 4} textAnchor="end" transform={`rotate(-90 12 ${TOP + 4})`}>パイディア</text>
                <text className="play-axis-label" x={12} y={BOTTOM - 4} textAnchor="start" transform={`rotate(-90 12 ${BOTTOM - 4})`}>ルドゥス</text>
                <path className="play-axis-arrow" d={`M22 ${TOP + 6} V${BOTTOM - 6} M18 ${BOTTOM - 12} L22 ${BOTTOM - 6} L26 ${BOTTOM - 12}`}/>
                {selectedItem && selectedCols.length > 1 && <polyline className="play-profile-line" points={selectedCols.map(c => `${colX(c.i) + COL / 2 + jitter(selIndex)},${ludusY(selectedItem.ludus)}`).join(' ')}/>}
                {profile.items.map((item, n) => { const isSel = state.selected.includes(item.nodeId); const cls = item.kind === 'material' ? item.materialKind : item.kind; const cols = PLAY_TYPES.map((p, i) => ({ p, i, w: item.weights[p.id] })).filter(c => c.w > 0);
                    return <g key={item.nodeId} className={`play-point ${cls} ${isSel ? 'selected' : ''}`} tabIndex={0} role="button" aria-pressed={isSel} aria-label={`${item.label}（${describe(item)}・${ludusText(item.ludus)}）`} onKeyDown={e => onKey(e, item)} onClick={() => select(item)}>
                        {cols.map(({ p, i, w }) => { const r = radius(w); return <g key={p.id} transform={`translate(${colX(i) + COL / 2 + jitter(n)} ${ludusY(item.ludus)})`}>
                            <title>{`${item.label}：${p.label} ${fmt(w)}`}</title><circle className="hit" r={Math.max(9, r + 3)}/>
                            {item.kind === 'idea' ? <path className="mark" d={`M0 ${-r - 1}L${r + 1} 0L0 ${r + 1}L${-r - 1} 0Z`}/> : <circle className="mark" r={r}/>}
                        </g>; })}
                        {isSel && cols[0] && <text className="point-label" x={colX(cols[0].i) + COL / 2 + jitter(n) + (cols[0].i === 3 ? 6 : -6)} y={ludusY(item.ludus) - radius(cols[0].w) - 6} textAnchor={cols[0].i >= 2 ? 'end' : 'start'}>{item.label.length > 14 ? item.label.slice(0, 13) + '…' : item.label}</text>}
                    </g>; })}
            </svg>
            <div className="play-map-help">{PLAY_TYPES.map(p => <span key={p.id} className="play-chip" style={{ '--play-color': p.color } as CSSProperties}><span className="play-swatch"/>{p.label}<ColumnHelp type={p.id}/></span>)}</div>
        </div>
        <div className="play-legend" aria-hidden="true"><span><i className="dot tag"/>タグ</span><span><i className="dot mechanic"/>メカニクス</span><span><i className="dot idea"/>仮説</span><span><i className="dot size"/>大きさ＝強さ</span><span><i className="dot avg"/>列の平均</span><span><i className="dot line"/>選択カードのつながり</span></div>
        {!profile.items.length && <div className="lab-tip"><h3><Icon name="spark"/>まだ地図に置けるカードがありません</h3><p>タグやメカニクスをボードに追加すると、4要素の強さが見えてきます。付箋は対象外です。</p></div>}
        <div className="panel-divider"/>
        <div className="field-label">選択中のカード</div>
        {selected && selectedItem ? <div className="play-selected"><strong>{selected.data.title}</strong><span>強い要素：{describe(selectedItem)} · {ludusText(selectedItem.ludus)}{selected.type === 'idea' ? ' · 素材の平均' : ''}</span><PlayBars weights={selectedItem.weights}/></div>
            : <p className="hint-text">{selected ? 'このカードは遊びの要素を持ちません（付箋・フレーム、または道具系の素材）。' : 'ボードか地図の点を選ぶと、4要素の強さを同時に確認できます。'}</p>}
        <div className="panel-divider"/>
        <div className="field-label">組み合わせ <span className="hint">2要素とも2以上のカード数</span></div>
        <ul className="play-pairs">{PLAY_PAIRS.map(pair => { const count = profile.pairs.find(x => x.a === pair.a && x.b === pair.b)?.count ?? 0; const a = playInfo(pair.a), b = playInfo(pair.b); return <li key={pair.a + pair.b} className={count ? 'has' : ''}><span className="pair-name"><i style={{ background: a.color }}/>{a.label} × <i style={{ background: b.color }}/>{b.label}</span><b>{count}枚</b><small>{pair.caillois}<br />例：{pair.example}</small></li>; })}</ul>
        <div className="panel-divider"/>
        <div className="field-label">弱い要素を足す <span className="hint">{profile.weak.length ? `平均1未満: ${profile.weak.map(g => playInfo(g).label).join('・')}` : 'どの要素もそれなりにある'}</span></div>
        <div className="operator-list play-targets" role="radiogroup" aria-label="強めたい要素">{PLAY_TYPES.map(p => <button key={p.id} role="radio" aria-checked={suggestType === p.id} className={`operator ${suggestType === p.id ? 'active' : ''}`} style={{ '--play-color': p.color } as CSSProperties} onClick={() => { setTarget(p.id); setSeed(0); }}>{p.label}</button>)}</div>
        <div className="operator-list play-ends" role="radiogroup" aria-label="パイディアとルドゥスのどちら寄りを提案するか">{([['any', '指定なし'], ['paidia', 'パイディア寄り'], ['ludus', 'ルドゥス寄り']] as const).map(([id, label]) => <button key={id} role="radio" aria-checked={end === id} className={`operator ${end === id ? 'active' : ''}`} onClick={() => { setEnd(id); setSeed(0); }}>{label}</button>)}</div>
        <p className="operator-description">{playInfo(suggestType).designPrompt} 今ある要素を消さずに、{playInfo(suggestType).label}を重ねる素材です。</p>
        <div className="suggestion-list">{suggestions.map(m => <div key={m.id} className="suggestion-row"><span className={`material-glyph ${m.kind}`}><Icon name={m.kind === 'tag' ? 'tag' : 'book'}/></span><button className="library-label" style={{ textAlign: 'left', padding: 0 }} title={m.summary} onClick={() => store.toggleTray(m.id)}><strong>{m.label}</strong><small>{m.summary}</small></button><button className="item-add" aria-label={`${m.label}をボードに追加`} title="ボードに追加" onClick={() => store.addMaterial(m.id)}><Icon name="plus"/></button></div>)}</div>
        <div className="mix-actions"><button className="btn small subtle" onClick={() => setSeed(seed + 1)}><Icon name="shuffle"/>別の候補</button><button className="btn small subtle" onClick={() => { store.setTray([...state.tray, ...suggestions.slice(0, 2).map(m => m.id)]); store.ui({ panel: 'lab' }); }}><Icon name="flask"/>上位2件をラボへ</button></div>
        <div className="metadata play-source">{PLAY_SOURCE}<br />{PAIDIA_LUDUS.paidia.label}：{PAIDIA_LUDUS.paidia.description}<br />{PAIDIA_LUDUS.ludus.label}：{PAIDIA_LUDUS.ludus.description}<br />強さ（0〜3）と規則性（0〜3）は編集上の目安で、プレイヤー調査や評価ではありません。自分で軸を決めて配置したいときは「二軸四象限マップ」を使います。</div>
    </div>;
}
