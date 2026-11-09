import { useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { PlayType } from '../core/types.ts';
import { PAIDIA_LUDUS, PLAY_PAIRS, PLAY_SOURCE, PLAY_TYPES, playInfo, playProfile, strongElements, suggestForPlay, type PlayItem } from '../core/caillois.ts';
import { useWorkbench } from './context.tsx';
import { Icon } from './Icons.tsx';
import { HelpPopover, PlayBars } from './Help.tsx';

/**
 * Component 1 — Caillois' elements of play as four independent scales.
 * Agon, alea, mimicry and ilinx are not opposites: every card sits on all four tracks at
 * once (0-3 each), and the selected card is drawn as one line across them. The manner of
 * play (paidia ↔ ludus) is a separate fifth track. Positions come from catalog data only.
 */
const W = 300, LABEL = 74, X0 = LABEL + 8, X1 = W - 14, ROW = 50, TOP = 8;
const sx = (v: number) => X0 + (v / 3) * (X1 - X0);
const rowY = (i: number) => TOP + ROW * i + ROW / 2;
const LUDUS_ROW = PLAY_TYPES.length + 0.35;
const H = Math.ceil(rowY(LUDUS_ROW) + ROW / 2 + 14);
/** Spread cards vertically within a track so equal values stay clickable (display only). */
const jitter = (n: number) => ((n * 5) % 7 - 3) * 4.2;
const LUDUS_LABEL = ['パイディア（即興）', 'やや即興', 'やや規則的', 'ルドゥス（規則）'];
const ludusText = (l: number) => LUDUS_LABEL[Math.max(0, Math.min(3, Math.round(l)))]!;
const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

function ElementHelp({ type }: {
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
    const select = (item: PlayItem) => store.ui({ selected: [item.nodeId], selectedEdge: null });
    const onKey = (e: KeyboardEvent, item: PlayItem) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(item); } };
    const describe = (item: PlayItem) => { const s = strongElements(item.weights); return s.length ? s.map(t => `${playInfo(t).label}${fmt(item.weights[t])}`).join('・') : '強い要素なし'; };
    const selIndex = selectedItem ? profile.items.indexOf(selectedItem) : -1;
    return <div className="play-map-panel">
        <p className="inspector-kicker">ROGER CAILLOIS · 遊びの地図</p>
        <p className="play-intro">カイヨワの4要素（競争・運・模倣・眩暈）は<strong>相反する分類ではなく、同時に含まれうる独立した性質</strong>です。ボードのカードを4本の物差しすべてに置き、別の物差しで遊び方（パイディア↔ルドゥス）を見ます。</p>
        <div className="play-map-frame">
            <svg className="play-map" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="カイヨワの遊びの地図。アゴン・アレア・ミミクリ・イリンクスの独立した4本の物差しと、パイディアからルドゥスへの物差し。">
                {PLAY_TYPES.map((p, i) => { const y = rowY(i); const lv = profile.level[p.id]; return <g key={p.id} className={`play-track ${profile.weak.includes(p.id) ? 'weak' : ''}`} style={{ '--play-color': p.color } as CSSProperties}>
                    <rect className="play-track-bg" x={X0 - 6} y={y - ROW / 2 + 4} width={X1 - X0 + 12} height={ROW - 8} rx="7"/>
                    <text className="play-track-label" x={4} y={y - 3}>{p.label}</text>
                    <text className="play-track-sub" x={4} y={y + 11}>{p.meaning} · 平均{fmt(lv)}</text>
                    <line className="play-track-axis" x1={X0} x2={X1} y1={y} y2={y}/>
                    {[0, 1, 2, 3].map(t => <g key={t}><line className="play-tick" x1={sx(t)} x2={sx(t)} y1={y - 3} y2={y + 3}/>{i === 0 && <text className="play-tick-label" x={sx(t)} y={TOP + 2} textAnchor="middle">{t}</text>}</g>)}
                    {profile.items.length > 0 && <path className="play-level" d={`M${sx(lv)} ${y - ROW / 2 + 6} V${y + ROW / 2 - 6}`}><title>{`ボード平均 ${fmt(lv)}`}</title></path>}
                </g>; })}
                <g className="play-track ludus-track">
                    <rect className="play-track-bg" x={X0 - 6} y={rowY(LUDUS_ROW) - ROW / 2 + 4} width={X1 - X0 + 12} height={ROW - 8} rx="7"/>
                    <text className="play-track-label" x={4} y={rowY(LUDUS_ROW) - 3}>遊び方</text>
                    <text className="play-track-sub" x={4} y={rowY(LUDUS_ROW) + 11}>{profile.ludus === null ? '—' : ludusText(profile.ludus).replace(/（.*）/, '')}</text>
                    <line className="play-track-axis" x1={X0} x2={X1} y1={rowY(LUDUS_ROW)} y2={rowY(LUDUS_ROW)}/>
                    <text className="play-tick-label" x={X0} y={rowY(LUDUS_ROW) + ROW / 2 + 10} textAnchor="start">{PAIDIA_LUDUS.paidia.label}（即興）</text>
                    <text className="play-tick-label" x={X1} y={rowY(LUDUS_ROW) + ROW / 2 + 10} textAnchor="end">{PAIDIA_LUDUS.ludus.label}（規則）</text>
                    {profile.ludus !== null && <path className="play-level" d={`M${sx(profile.ludus)} ${rowY(LUDUS_ROW) - ROW / 2 + 6} V${rowY(LUDUS_ROW) + ROW / 2 - 6}`}/>}
                </g>
                {selectedItem && <polyline className="play-profile-line" points={PLAY_TYPES.map((p, i) => `${sx(selectedItem.weights[p.id])},${rowY(i) + jitter(selIndex)}`).join(' ')}/>}
                {profile.items.map((item, n) => { const isSel = state.selected.includes(item.nodeId); const cls = item.kind === 'material' ? item.materialKind : item.kind; const marks = [...PLAY_TYPES.map((p, i) => ({ key: p.id, x: sx(item.weights[p.id]), y: rowY(i), title: `${item.label}：${p.label} ${fmt(item.weights[p.id])}`, faint: item.weights[p.id] === 0 })), { key: 'ludus', x: sx(item.ludus), y: rowY(LUDUS_ROW), title: `${item.label}：${ludusText(item.ludus)}`, faint: false }];
                    return <g key={item.nodeId} className={`play-point ${cls} ${isSel ? 'selected' : ''}`} tabIndex={0} role="button" aria-pressed={isSel} aria-label={`${item.label}（${describe(item)}・${ludusText(item.ludus)}）`} onKeyDown={e => onKey(e, item)} onClick={() => select(item)}>
                        {marks.map(m => <g key={m.key} className={m.faint ? 'zero' : ''} transform={`translate(${m.x} ${m.y + jitter(n)})`}><title>{m.title}</title><circle className="hit" r="8"/>{item.kind === 'idea' ? <path className="mark" d="M0 -6L6 0L0 6L-6 0Z"/> : <circle className="mark" r={isSel ? 5.5 : 4.2}/>}</g>)}
                        {isSel && <text className="point-label" x={Math.min(Math.max(sx(item.weights.agon), X0 + 30), X1 - 30)} y={rowY(0) + jitter(n) - 9} textAnchor="middle">{item.label.length > 14 ? item.label.slice(0, 13) + '…' : item.label}</text>}
                    </g>; })}
            </svg>
            <div className="play-map-help">{PLAY_TYPES.map(p => <span key={p.id} className="play-chip" style={{ '--play-color': p.color } as CSSProperties}><span className="play-swatch"/>{p.label}<ElementHelp type={p.id}/></span>)}</div>
        </div>
        <div className="play-legend" aria-hidden="true"><span><i className="dot tag"/>タグ</span><span><i className="dot mechanic"/>メカニクス</span><span><i className="dot idea"/>仮説</span><span><i className="dot avg"/>ボード平均</span><span><i className="dot line"/>選択カードの断面</span></div>
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
