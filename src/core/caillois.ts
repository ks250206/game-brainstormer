/**
 * Roger Caillois' four categories of play, placed on two axes.
 *
 *   x: -1 = will / control (agon, mimicry)  …  +1 = surrender to chance or sensation (alea, ilinx)
 *   y: +1 = rule-bound play (agon, alea)    …  -1 = make-believe / bodily sensation (mimicry, ilinx)
 *
 * Positions are derived from editorial 0-3 weights stored in the catalog. This is a
 * transparent design lens for brainstorming, not a measurement of players or markets.
 * Pure TypeScript: no DOM, React or network access.
 */
import type { Board, BoardNode, Catalog, Material, PlayPoint, PlayType, PlayWeights } from './types.ts';
import { material } from './engine.ts';

export interface PlayTypeInfo {
    id: PlayType;
    label: string;
    latin: string;
    meaning: string;
    description: string;
    designPrompt: string;
    examples: string[];
    color: string;
    /** Sign of the quadrant on each axis. */
    qx: -1 | 1;
    qy: -1 | 1;
}
export const PLAY_TYPES: PlayTypeInfo[] = [
    { id: 'agon', label: 'アゴン', latin: 'Agon', meaning: '競争', description: '公平な条件のもとで、技量・判断・努力の差を競う遊び。勝敗の理由が自分にある。', designPrompt: '上達が見え、負けた理由を自分で説明できるか？', examples: ['チェス', 'Street Fighter 6', 'Celeste'], color: '#cc7359', qx: -1, qy: 1 },
    { id: 'alea', label: 'アレア', latin: 'Alea', meaning: '運', description: '自分では制御できない偶然に身を委ね、運命の結果を待つ遊び。誰にでも勝ち目がある。', designPrompt: '運の結果を受けて、次の選択が面白くなるか？', examples: ['ルーレット', 'Balatro', 'すごろく'], color: '#a47a39', qx: 1, qy: 1 },
    { id: 'mimicry', label: 'ミミクリ', latin: 'Mimicry', meaning: '模倣', description: '別の誰か・何かになりきり、虚構の役割を演じる遊び。ごっこ遊びやロールプレイ。', designPrompt: 'プレイヤーは「誰」になり、その役割らしい選択ができるか？', examples: ['ままごと', 'The Sims 4', 'Papers, Please'], color: '#517fa7', qx: -1, qy: -1 },
    { id: 'ilinx', label: 'イリンクス', latin: 'Ilinx', meaning: '眩暈', description: '速さ・回転・落下などで知覚を揺さぶり、一時的な眩暈や陶酔を味わう遊び。', designPrompt: '身体感覚が揺さぶられる瞬間を、操作や演出で作れているか？', examples: ['ブランコ・ジェットコースター', 'Rez Infinite', 'Thumper'], color: '#b16ca3', qx: 1, qy: -1 },
];
export const PLAY_AXES = {
    x: { negative: '意志・制御', positive: '委ねる・偶然', description: '結果を自分の力で制御するか、偶然や感覚に身を委ねるか。' },
    y: { positive: 'ルール・数値', negative: '虚構・身体感覚', description: '明確な規則の中で遊ぶか、ごっこや感覚の中で遊ぶか。' },
    paidiaLudus: 'カイヨワはさらに、即興的で自由な「パイディア」から、規則と修練の「ルドゥス」までの度合いで遊びを捉えました。この地図の4象限は遊びの種類、パイディア／ルドゥスはそれぞれの遊び方の洗練度です。',
} as const;
export const PLAY_SOURCE = 'Roger Caillois『遊びと人間』（Les Jeux et les Hommes, 1958）の4分類を、発想用に2軸へ配置した編集上の解釈です。';

export function playInfo(id: PlayType): PlayTypeInfo { return PLAY_TYPES.find(p => p.id === id)!; }
export function totalWeight(w: PlayWeights): number { return w.agon + w.alea + w.mimicry + w.ilinx; }
/** Map weights to the 2-axis plane. Returns null when the material has no play character (e.g. software tools). */
export function playPoint(w: PlayWeights): PlayPoint | null {
    const t = totalWeight(w);
    if (!t)
        return null;
    return { x: round((w.alea + w.ilinx - w.agon - w.mimicry) / t), y: round((w.agon + w.alea - w.mimicry - w.ilinx) / t) };
}
export function quadrantOf(p: PlayPoint): PlayType {
    if (p.y >= 0)
        return p.x <= 0 ? 'agon' : 'alea';
    return p.x <= 0 ? 'mimicry' : 'ilinx';
}
/** The strongest category; ties resolve in Caillois' own order (agon, alea, mimicry, ilinx). */
export function dominant(w: PlayWeights): PlayType | null {
    if (!totalWeight(w))
        return null;
    return PLAY_TYPES.reduce((best, p) => w[p.id] > w[best.id] ? p : best, PLAY_TYPES[0]!).id;
}
export function addWeights(list: PlayWeights[]): PlayWeights {
    return list.reduce<PlayWeights>((a, w) => ({ agon: a.agon + w.agon, alea: a.alea + w.alea, mimicry: a.mimicry + w.mimicry, ilinx: a.ilinx + w.ilinx }), { agon: 0, alea: 0, mimicry: 0, ilinx: 0 });
}
function round(n: number): number { return Math.round(n * 1000) / 1000; }
export function clampPoint(p: PlayPoint): PlayPoint { return { x: round(Math.max(-1, Math.min(1, p.x))), y: round(Math.max(-1, Math.min(1, p.y))) }; }

export interface PlayItem {
    nodeId: string;
    label: string;
    kind: BoardNode['type'];
    materialKind?: Material['kind'];
    weights: PlayWeights;
    point: PlayPoint;
    /** True when the user placed the card by hand instead of deriving it from materials. */
    pinned: boolean;
}
/** Weights a card contributes: a material's own, or the sum of a hypothesis' materials. */
export function nodeWeights(c: Catalog, n: BoardNode): PlayWeights | null {
    if (n.type === 'material' && n.data.materialId)
        return material(c, n.data.materialId)?.play ?? null;
    if (n.type === 'idea' && n.data.hypothesis) {
        const ws = n.data.hypothesis.materials.flatMap(id => { const m = material(c, id); return m ? [m.play] : []; });
        const sum = addWeights(ws);
        return totalWeight(sum) ? sum : null;
    }
    return null;
}
export function playItems(c: Catalog, board: Board): PlayItem[] {
    const out: PlayItem[] = [];
    for (const n of board.nodes) {
        if (n.type === 'frame')
            continue;
        const w = nodeWeights(c, n);
        const derived = w ? playPoint(w) : null;
        const point = n.data.play ?? derived;
        if (!point)
            continue;
        const m = n.data.materialId ? material(c, n.data.materialId) : undefined;
        out.push({ nodeId: n.id, label: n.data.title, kind: n.type, ...(m ? { materialKind: m.kind } : {}), weights: w ?? weightsFromPoint(point), point, pinned: !!n.data.play });
    }
    return out;
}
/** Approximate weights for a hand-placed card so it can take part in the balance summary. */
export function weightsFromPoint(p: PlayPoint): PlayWeights {
    const right = (p.x + 1) / 2, top = (p.y + 1) / 2;
    return { agon: round((1 - right) * top * 3), alea: round(right * top * 3), mimicry: round((1 - right) * (1 - top) * 3), ilinx: round(right * (1 - top) * 3) };
}
export interface PlayProfile {
    items: PlayItem[];
    /** Share of each category across the board, 0-1, summing to 1 (or all 0). */
    share: PlayWeights;
    centroid: PlayPoint | null;
    /** Categories with less than `gapShare` of the board's play weight, weakest first. */
    gaps: PlayType[];
    dominant: PlayType | null;
}
export function playProfile(c: Catalog, board: Board, gapShare = 0.12): PlayProfile {
    const items = playItems(c, board);
    const sum = addWeights(items.map(i => i.weights));
    const t = totalWeight(sum);
    const share: PlayWeights = t ? { agon: round(sum.agon / t), alea: round(sum.alea / t), mimicry: round(sum.mimicry / t), ilinx: round(sum.ilinx / t) } : { agon: 0, alea: 0, mimicry: 0, ilinx: 0 };
    const centroid = items.length ? clampPoint({ x: items.reduce((a, i) => a + i.point.x, 0) / items.length, y: items.reduce((a, i) => a + i.point.y, 0) / items.length }) : null;
    const gaps = t ? PLAY_TYPES.filter(p => share[p.id] < gapShare).sort((a, b) => share[a.id] - share[b.id]).map(p => p.id) : [];
    return { items, share, centroid, gaps, dominant: t ? dominant(sum) : null };
}
/**
 * Deterministic suggestions for a play category: strongest and purest materials first,
 * excluding ones already in use. Alternates tags and mechanics so both kinds appear.
 */
export function suggestForPlay(c: Catalog, type: PlayType, excluded: string[] = [], limit = 6, seed = 0): Material[] {
    const skip = new Set(excluded);
    const score = (m: Material) => m.play[type] * 10 - (totalWeight(m.play) - m.play[type]) * 3;
    const ranked = (kind: Material['kind']) => c.materials
        .filter(m => m.kind === kind && !skip.has(m.id) && m.play[type] >= 2 && dominant(m.play) === type)
        .sort((a, b) => score(b) - score(a) || (a.rank ?? 999) - (b.rank ?? 999) || a.id.localeCompare(b.id));
    const rotate = <T>(xs: T[]) => { if (!xs.length) return xs; const k = Math.abs(seed) % xs.length; return [...xs.slice(k), ...xs.slice(0, k)]; };
    // Rotate within the strongest pool so "another suggestion" changes the list without randomness.
    const tags = rotate(ranked('tag').slice(0, 24)), mechs = rotate(ranked('mechanic').slice(0, 24));
    const out: Material[] = [];
    for (let i = 0; out.length < limit && (i < tags.length || i < mechs.length); i++) {
        if (tags[i]) out.push(tags[i]!);
        if (out.length < limit && mechs[i]) out.push(mechs[i]!);
    }
    return out;
}
