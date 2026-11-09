import { useState, type CSSProperties, type ReactNode } from 'react';
import { Popover } from '@astryxdesign/core/Popover';
import type { Cluster, Material } from '../core/types.ts';
import { PLAY_TYPES, playInfo, strongElements, totalWeight } from '../core/caillois.ts';
import { useWorkbench } from './context.tsx';
import { Icon } from './Icons.tsx';

type Placement = 'above' | 'below' | 'start' | 'end';
/**
 * A "?" button that opens an Astryx Popover. Content mounts only while open, so long
 * lists can render one help button per row without mounting hundreds of hidden panels.
 */
export function HelpPopover({ label, placement = 'end', width = 320, className = '', children }: {
    label: string;
    placement?: Placement;
    width?: number;
    className?: string;
    children: () => ReactNode;
}) {
    const [open, setOpen] = useState(false);
    return <Popover label={label} isOpen={open} onOpenChange={setOpen} placement={placement} width={width} padding={0} content={open ? <div className="help-pop">{children()}</div> : null}>
        <button type="button" className={`help-btn ${className}`} aria-label={label} title={label}><Icon name="help"/></button>
    </Popover>;
}
export function PlayBars({ weights }: {
    weights: Material['play'];
}) {
    return <div className="play-bars" aria-label="カイヨワの遊びの4要素（それぞれ独立した0〜3の目安）">{PLAY_TYPES.map(p => <div key={p.id} className="play-bar" style={{ '--play-color': p.color } as CSSProperties}><span>{p.label}<small>{p.meaning}</small></span><span className="play-track" aria-hidden="true"><span style={{ width: `${(weights[p.id] / 3) * 100}%` }}/></span><b>{weights[p.id]}</b></div>)}</div>;
}
export function MaterialDetails({ m }: {
    m: Material;
}) {
    const { catalog } = useWorkbench();
    const primary = catalog.clusters.find(c => c.id === m.primaryCluster);
    const sub = primary?.subgroups.find(s => s.id === m.subgroup);
    const others = m.clusters.filter(c => c !== m.primaryCluster).map(c => catalog.clusters.find(x => x.id === c)?.label).filter(Boolean);
    const strong = strongElements(m.play);
    return <>
        <div className="help-pop-head"><span className={`material-glyph ${m.kind}`}><Icon name={m.kind === 'tag' ? 'tag' : 'book'}/></span><div><div className="section-eyebrow">{m.kind === 'tag' ? `STEAM TAG #${m.rank}` : `${m.id} · ${m.chapter}`}</div><h3>{m.label}</h3></div></div>
        <div className="help-pop-body">
            <p className="help-summary">{m.summary}</p>
            <dl className="help-facts">
                <dt>分類</dt><dd>{primary?.label}{m.kind === 'tag' && sub ? ` › ${sub.label}` : ''}{others.length ? <small> ／ 関連: {others.join('・')}</small> : null}</dd>
                <dt>代表例</dt><dd>{m.examples.length ? <ul className="example-list">{m.examples.map(e => <li key={e}>{e}</li>)}</ul> : <span className="muted-text">記載なし</span>}</dd>
                {m.kind === 'mechanic' && <><dt>応用案</dt><dd>{m.description}</dd></>}
                <dt>遊びの要素</dt><dd>{totalWeight(m.play) ? <>{strong.length ? `強い要素：${strong.map(t => playInfo(t).label).join('・')}` : '強い要素なし'}<PlayBars weights={m.play}/></> : <span className="muted-text">遊びの要素には直接影響しない素材</span>}</dd>
            </dl>
            <p className="help-note">説明・代表例・遊びの型はこのアプリの編集注釈です。{m.kind === 'tag' ? 'Steam公式の定義やランキングではありません。' : '書籍本文の定義の転載ではありません。'}<a href={m.source} target="_blank" rel="noreferrer">出典 ↗</a></p>
        </div>
    </>;
}
export function MaterialHelp({ m, placement = 'end' }: {
    m: Material;
    placement?: Placement;
}) {
    return <HelpPopover label={`${m.label}の説明`} placement={placement}>{() => <MaterialDetails m={m}/>}</HelpPopover>;
}
export function ClusterHelp({ cluster, placement = 'end' }: {
    cluster: Cluster;
    placement?: Placement;
}) {
    const { catalog } = useWorkbench();
    return <HelpPopover label={`分類「${cluster.label}」の説明`} placement={placement}>{() => <>
        <div className="help-pop-head"><span className="cluster-icon" style={{ '--cluster-color': cluster.color } as CSSProperties}><Icon name={cluster.icon}/></span><div><div className="section-eyebrow">{cluster.en.toUpperCase()} · DESIGN QUESTION</div><h3>{cluster.question}</h3></div></div>
        <div className="help-pop-body"><p className="help-summary">{cluster.description}</p>
            <dl className="help-facts"><dt>小分類</dt><dd><ul className="example-list">{cluster.subgroups.map(s => { const n = catalog.materials.filter(m => m.subgroup === s.id).length; return <li key={s.id}>{s.label} <small>{n}</small></li>; })}</ul></dd>
                <dt>メカニクス</dt><dd>{catalog.materials.filter(m => m.kind === 'mechanic' && m.clusters.includes(cluster.id)).length}件（書籍の章は別の絞り込み）</dd></dl>
            <p className="help-note">ゲーム制作で最初に決める問いごとの編集分類です。素材は主分類1つと、必要に応じて関連分類を持ちます。</p></div>
    </>}</HelpPopover>;
}
