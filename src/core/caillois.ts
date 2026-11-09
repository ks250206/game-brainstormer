/**
 * Roger Caillois' classification of play (Les Jeux et les Hommes, 1958), as he tabulated it:
 * four categories side by side — agon, alea, mimicry, ilinx — each spanning from paidia
 * (free, improvised play) to ludus (codified rules, skill and discipline).
 *
 * Materials carry editorial 0-3 weights per category and a 0-3 ludus degree. This is a
 * transparent design lens for brainstorming, not a measurement of players or markets.
 * Pure TypeScript: no DOM, React or network access. Unrelated to the user-defined
 * two-axis positioning map in quadrant.ts.
 */
import type { Board, BoardNode, Catalog, Material, PlayType, PlayWeights } from './types.ts';
import { material } from './engine.ts';

export interface PlayTypeInfo {
    id: PlayType;
    label: string;
    latin: string;
    meaning: string;
    description: string;
    designPrompt: string;
    /** Caillois' own illustrations at the paidia and ludus ends of the column. */
    paidia: string;
    ludus: string;
    examples: string[];
    color: string;
}
export const PLAY_TYPES: PlayTypeInfo[] = [
    { id: 'agon', label: 'アゴン', latin: 'Agon', meaning: '競争', description: '公平な条件のもとで、技量・判断・努力の差を競う遊び。勝敗の理由が自分にある。', designPrompt: '上達が見え、負けた理由を自分で説明できるか？', paidia: '規則のない駆けっこや取っ組み合い', ludus: 'スポーツ競技、チェスや囲碁', examples: ['チェス', 'Street Fighter 6', 'Celeste'], color: '#cc7359' },
    { id: 'alea', label: 'アレア', latin: 'Alea', meaning: '運', description: '自分では制御できない偶然に身を委ね、運命の結果を待つ遊び。誰にでも勝ち目がある。', designPrompt: '運の結果を受けて、次の選択が面白くなるか？', paidia: '数え歌の鬼決め、表か裏か', ludus: '賭け、ルーレット、宝くじ', examples: ['ルーレット', 'Balatro', 'すごろく'], color: '#a47a39' },
    { id: 'mimicry', label: 'ミミクリ', latin: 'Mimicry', meaning: '模倣', description: '別の誰か・何かになりきり、虚構の役割を演じる遊び。ごっこ遊びやロールプレイ。', designPrompt: 'プレイヤーは「誰」になり、その役割らしい選択ができるか？', paidia: 'ままごと、仮面や変装', ludus: '演劇、見世物芸術全般', examples: ['ままごと', 'The Sims 4', 'Papers, Please'], color: '#517fa7' },
    { id: 'ilinx', label: 'イリンクス', latin: 'Ilinx', meaning: '眩暈', description: '速さ・回転・落下などで知覚を揺さぶり、一時的な眩暈や陶酔を味わう遊び。', designPrompt: '身体感覚が揺さぶられる瞬間を、操作や演出で作れているか？', paidia: 'くるくる回る、ブランコ', ludus: '登山、スキー、空中ブランコ', examples: ['ジェットコースター', 'Rez Infinite', 'Thumper'], color: '#b16ca3' },
];
export const PAIDIA_LUDUS = {
    paidia: { label: 'パイディア', meaning: '即興・自由', description: '決まりの少ない、気ままで即興的な遊び。思いつきと発散が楽しさの中心。' },
    ludus: { label: 'ルドゥス', meaning: '規則・修練', description: '約束事や難しさを自ら引き受け、工夫と修練で上達していく遊び。' },
} as const;
export const PLAY_SOURCE = 'ロジェ・カイヨワ『遊びと人間』（Les Jeux et les Hommes, 1958）の分類表（4分類 × パイディア↔ルドゥス）に基づく編集上の解釈です。';

export function playInfo(id: PlayType): PlayTypeInfo { return PLAY_TYPES.find(p => p.id === id)!; }
export function totalWeight(w: PlayWeights): number { return w.agon + w.alea + w.mimicry + w.ilinx; }
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

export interface PlayItem {
    nodeId: string;
    label: string;
    kind: BoardNode['type'];
    materialKind?: Material['kind'];
    weights: PlayWeights;
    /** 0 = paidia … 3 = ludus. */
    ludus: number;
}
/**
 * A card's play character: a material's own weights, or for a hypothesis the sum of its
 * materials with a weight-averaged ludus degree. Notes and frames have none.
 */
export function nodePlay(c: Catalog, n: BoardNode): { weights: PlayWeights; ludus: number } | null {
    const ms: Material[] = n.type === 'material' && n.data.materialId ? [material(c, n.data.materialId)].filter((m): m is Material => !!m)
        : n.type === 'idea' && n.data.hypothesis ? n.data.hypothesis.materials.flatMap(id => { const m = material(c, id); return m ? [m] : []; }) : [];
    const weights = addWeights(ms.map(m => m.play));
    const t = totalWeight(weights);
    if (!t)
        return null;
    return { weights, ludus: round(ms.reduce((a, m) => a + m.ludus * totalWeight(m.play), 0) / t) };
}
export function playItems(c: Catalog, board: Board): PlayItem[] {
    return board.nodes.flatMap(n => {
        const p = nodePlay(c, n);
        if (!p)
            return [];
        const m = n.data.materialId ? material(c, n.data.materialId) : undefined;
        return [{ nodeId: n.id, label: n.data.title, kind: n.type, ...(m ? { materialKind: m.kind } : {}), ...p }];
    });
}
export interface PlayProfile {
    items: PlayItem[];
    /** Share of each category across the board, 0-1, summing to 1 (or all 0). */
    share: PlayWeights;
    /** Average ludus degree per category (weighted), null when the category is absent. */
    ludusBy: Record<PlayType, number | null>;
    /** Categories with less than `gapShare` of the board's play weight, weakest first. */
    gaps: PlayType[];
    dominant: PlayType | null;
}
export function playProfile(c: Catalog, board: Board, gapShare = 0.12): PlayProfile {
    const items = playItems(c, board);
    const sum = addWeights(items.map(i => i.weights));
    const t = totalWeight(sum);
    const share: PlayWeights = t ? { agon: round(sum.agon / t), alea: round(sum.alea / t), mimicry: round(sum.mimicry / t), ilinx: round(sum.ilinx / t) } : { agon: 0, alea: 0, mimicry: 0, ilinx: 0 };
    const ludusBy = Object.fromEntries(PLAY_TYPES.map(p => [p.id, sum[p.id] ? round(items.reduce((a, i) => a + i.ludus * i.weights[p.id], 0) / sum[p.id]) : null])) as Record<PlayType, number | null>;
    const gaps = t ? PLAY_TYPES.filter(p => share[p.id] < gapShare).sort((a, b) => share[a.id] - share[b.id]).map(p => p.id) : [];
    return { items, share, ludusBy, gaps, dominant: t ? dominant(sum) : null };
}
/**
 * Deterministic suggestions for a play category: strongest and purest materials first,
 * excluding ones already in use. Alternates tags and mechanics so both kinds appear.
 * `ludus` optionally prefers the paidia (0) or ludus (3) end of the column.
 */
export function suggestForPlay(c: Catalog, type: PlayType, excluded: string[] = [], limit = 6, seed = 0, ludus?: number): Material[] {
    const skip = new Set(excluded);
    const score = (m: Material) => m.play[type] * 10 - (totalWeight(m.play) - m.play[type]) * 3 - (ludus === undefined ? 0 : Math.abs(m.ludus - ludus) * 4);
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
