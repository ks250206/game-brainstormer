/**
 * Roger Caillois' four elements of play (Les Jeux et les Hommes, 1958): agon, alea, mimicry
 * and ilinx. They are not opposites or mutually exclusive classes — one game can be strong
 * in several at once (Caillois himself analysed their combinations). Each is therefore an
 * independent 0-3 intensity. Separately, the manner of play runs from paidia (free,
 * improvised) to ludus (codified rules, skill and discipline).
 *
 * Materials carry editorial 0-3 intensities per element and a 0-3 ludus degree. This is a
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
/**
 * Caillois discussed every pairing of the elements. These notes paraphrase his view; video
 * games routinely combine pairs he thought rare (e.g. racing = agon × ilinx).
 */
export const PLAY_PAIRS: { a: PlayType; b: PlayType; caillois: string; example: string }[] = [
    { a: 'agon', b: 'alea', caillois: '基本的な結びつき。規則のもとで、実力と運が釣り合う。', example: 'ポーカー、麻雀、Slay the Spire' },
    { a: 'mimicry', b: 'ilinx', caillois: '基本的な結びつき。仮面と陶酔、祭りやトランス。', example: '祭り、ホラーの没入体験、VR' },
    { a: 'agon', b: 'mimicry', caillois: '偶然的な結びつき。競技が見世物になり、観客は選手に自分を重ねる。', example: 'スポーツ観戦、プロレス、eスポーツ' },
    { a: 'alea', b: 'ilinx', caillois: '偶然的な結びつき。賭けの熱狂が陶酔に近づく。', example: 'ルーレット、ガチャ演出、Balatro' },
    { a: 'agon', b: 'ilinx', caillois: 'カイヨワは結びつきにくいとした組み合わせ。制御を競う遊びと、制御を手放す遊び。', example: 'レース、スピードラン、Thumper（ビデオゲームでは一般的）' },
    { a: 'alea', b: 'mimicry', caillois: 'カイヨワは結びつきにくいとした組み合わせ。運命に委ねることと、役を演じること。', example: 'TRPGのダイス、ローグライクの物語' },
];
export const PAIDIA_LUDUS = {
    paidia: { label: 'パイディア', meaning: '即興・自由', description: '決まりの少ない、気ままで即興的な遊び。思いつきと発散が楽しさの中心。' },
    ludus: { label: 'ルドゥス', meaning: '規則・修練', description: '約束事や難しさを自ら引き受け、工夫と修練で上達していく遊び。' },
} as const;
export const PLAY_SOURCE = 'ロジェ・カイヨワ『遊びと人間』（Les Jeux et les Hommes, 1958）の4要素とパイディア↔ルドゥスに基づく編集上の解釈です。4要素は相反する分類ではなく、ひとつの遊びに同時に含まれうる独立した性質として扱います。';

export function playInfo(id: PlayType): PlayTypeInfo { return PLAY_TYPES.find(p => p.id === id)!; }
export function totalWeight(w: PlayWeights): number { return w.agon + w.alea + w.mimicry + w.ilinx; }
/** Elements at or above `threshold` (default 2 = clearly present), strongest first. */
export function strongElements(w: PlayWeights, threshold = 2): PlayType[] {
    return PLAY_TYPES.filter(p => w[p.id] >= threshold).sort((a, b) => w[b.id] - w[a.id]).map(p => p.id);
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
 * A card's play character on the 0-3 scales: a material's own intensities, or for a
 * hypothesis the average of its materials (so a mix stays comparable to a single
 * material). Notes and frames have none.
 */
export function nodePlay(c: Catalog, n: BoardNode): { weights: PlayWeights; ludus: number } | null {
    const ms: Material[] = (n.type === 'material' && n.data.materialId ? [material(c, n.data.materialId)].filter((m): m is Material => !!m)
        : n.type === 'idea' && n.data.hypothesis ? n.data.hypothesis.materials.flatMap(id => { const m = material(c, id); return m ? [m] : []; }) : [])
        .filter(m => totalWeight(m.play) > 0);
    if (!ms.length)
        return null;
    const sum = addWeights(ms.map(m => m.play));
    const k = ms.length;
    return { weights: { agon: round(sum.agon / k), alea: round(sum.alea / k), mimicry: round(sum.mimicry / k), ilinx: round(sum.ilinx / k) }, ludus: round(ms.reduce((a, m) => a + m.ludus, 0) / k) };
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
    /** Average intensity of each element across the board's cards, 0-3, independent of each other. */
    level: PlayWeights;
    /** Number of cards in which each element is clearly present (≥ 2). */
    present: PlayWeights;
    /** Average paidia (0) … ludus (3) across cards, null when the board has no play cards. */
    ludus: number | null;
    /** Elements whose board average is below `weakBelow`, weakest first. */
    weak: PlayType[];
    /** For every pair of elements, how many cards are clearly strong in both at once. */
    pairs: { a: PlayType; b: PlayType; count: number }[];
}
export function playProfile(c: Catalog, board: Board, weakBelow = 1): PlayProfile {
    const items = playItems(c, board);
    const n = items.length;
    const sum = addWeights(items.map(i => i.weights));
    const level: PlayWeights = n ? { agon: round(sum.agon / n), alea: round(sum.alea / n), mimicry: round(sum.mimicry / n), ilinx: round(sum.ilinx / n) } : { agon: 0, alea: 0, mimicry: 0, ilinx: 0 };
    const present = Object.fromEntries(PLAY_TYPES.map(p => [p.id, items.filter(i => i.weights[p.id] >= 2).length])) as PlayWeights;
    const weak = n ? PLAY_TYPES.filter(p => level[p.id] < weakBelow).sort((a, b) => level[a.id] - level[b.id]).map(p => p.id) : [];
    const pairs = PLAY_PAIRS.map(({ a, b }) => ({ a, b, count: items.filter(i => i.weights[a] >= 2 && i.weights[b] >= 2).length }));
    return { items, level, present, ludus: n ? round(items.reduce((a, i) => a + i.ludus, 0) / n) : null, weak, pairs };
}
/**
 * Deterministic suggestions that strengthen one element: materials where it is strong (≥ 2),
 * strongest first, regardless of what else they contain, excluding ones already in use. Alternates tags and mechanics so both kinds appear.
 * `ludus` optionally prefers the paidia (0) or ludus (3) end of the column.
 */
export function suggestForPlay(c: Catalog, type: PlayType, excluded: string[] = [], limit = 6, seed = 0, ludus?: number): Material[] {
    const skip = new Set(excluded);
    const score = (m: Material) => m.play[type] * 10 - (ludus === undefined ? 0 : Math.abs(m.ludus - ludus) * 4);
    const ranked = (kind: Material['kind']) => c.materials
        .filter(m => m.kind === kind && !skip.has(m.id) && m.play[type] >= 2)
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
