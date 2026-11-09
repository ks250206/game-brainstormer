/**
 * A general two-axis, four-quadrant positioning map. The designer chooses the axes
 * (or a preset) and places board cards by hand; nothing is inferred from catalog data.
 * Pure TypeScript shared by renderers. Unrelated to the Caillois lens in caillois.ts.
 */
import type { AxisLabels, Board, MapPoint, QuadrantMap } from './types.ts';

export type QuadrantIndex = 0 | 1 | 2 | 3;
/** Order used everywhere: top-right, top-left, bottom-left, bottom-right (mathematical I–IV). */
export const QUADRANT_ORDER: { index: QuadrantIndex; position: string; xs: 1 | -1; ys: 1 | -1 }[] = [
    { index: 0, position: '右上', xs: 1, ys: 1 },
    { index: 1, position: '左上', xs: -1, ys: 1 },
    { index: 2, position: '左下', xs: -1, ys: -1 },
    { index: 3, position: '右下', xs: 1, ys: -1 },
];
export interface QuadrantPreset {
    id: string;
    label: string;
    purpose: string;
    x: AxisLabels;
    y: AxisLabels;
    names: [string, string, string, string];
}
export const QUADRANT_PRESETS: QuadrantPreset[] = [
    { id: 'priority', label: '新しさ × 試作しやすさ', purpose: 'アイデアの優先順位を決める', x: { negative: '馴染みがある', positive: '新しい' }, y: { negative: '試作しにくい', positive: '試作しやすい' }, names: ['すぐ試す', '手堅い小品', '見送り候補', '大きな賭け'] },
    { id: 'audience', label: 'カジュアル↔ハードコア × ソロ↔みんなで', purpose: '狙うプレイヤー層を決める', x: { negative: 'ひとりで', positive: 'みんなで' }, y: { negative: 'カジュアル', positive: 'ハードコア' }, names: ['競技・協力の熱狂', '孤高の挑戦', 'ひとりの癒し', 'わいわい遊ぶ'] },
    { id: 'session', label: 'プレイ時間 × 判断の重さ', purpose: '1回の遊びの手触りを決める', x: { negative: '短い', positive: '長い' }, y: { negative: '反射で遊ぶ', positive: 'じっくり考える' }, names: ['腰を据えた戦略', '短い詰め将棋', '1分の爽快感', '没頭する反復'] },
    { id: 'freedom', label: '一本道↔自由 × 落ち着く↔緊張', purpose: '体験の設計方針を決める', x: { negative: '一本道', positive: '自由' }, y: { negative: '落ち着く', positive: '緊張する' }, names: ['自由なサバイバル', '演出されたスリル', '物語に浸る', '箱庭でのんびり'] },
    { id: 'tone', label: 'システム↔物語 × 現実↔幻想', purpose: '作品の味付けと競合の空白を探す', x: { negative: 'システム重視', positive: '物語重視' }, y: { negative: '現実的', positive: '幻想的' }, names: ['幻想の物語', '幻想の箱庭', '現実のシミュレーション', '現実のドラマ'] },
];
export const CUSTOM_PRESET = 'custom';
export function presetById(id: string): QuadrantPreset | undefined { return QUADRANT_PRESETS.find(p => p.id === id); }
export function defaultQuadrant(presetId = QUADRANT_PRESETS[0]!.id): QuadrantMap {
    const p = presetById(presetId) ?? QUADRANT_PRESETS[0]!;
    return { preset: p.id, x: { ...p.x }, y: { ...p.y }, names: [...p.names], positions: {} };
}
/** Switch preset, keeping the cards where they are. */
export function applyPreset(map: QuadrantMap, presetId: string): QuadrantMap {
    const p = presetById(presetId);
    return p ? { ...map, preset: p.id, x: { ...p.x }, y: { ...p.y }, names: [...p.names] } : map;
}
export function clampPoint(p: MapPoint): MapPoint {
    const c = (v: number) => Math.round(Math.max(-1, Math.min(1, v)) * 1000) / 1000;
    return { x: c(p.x), y: c(p.y) };
}
/** Points exactly on an axis belong to the right / upper side. */
export function quadrantOf(p: MapPoint): QuadrantIndex {
    if (p.y >= 0)
        return p.x >= 0 ? 0 : 1;
    return p.x < 0 ? 2 : 3;
}
/** Human-readable meaning of a quadrant from the axis labels, e.g. "新しい × 試作しやすい". */
export function quadrantMeaning(map: QuadrantMap, q: QuadrantIndex): string {
    const o = QUADRANT_ORDER[q]!;
    return `${o.xs > 0 ? map.x.positive : map.x.negative} × ${o.ys > 0 ? map.y.positive : map.y.negative}`;
}
export interface QuadrantSummary {
    placed: { nodeId: string; point: MapPoint; quadrant: QuadrantIndex }[];
    unplaced: string[];
    counts: [number, number, number, number];
    /** Quadrants with no cards — the open space a positioning map is drawn to reveal. */
    empty: QuadrantIndex[];
}
export function quadrantSummary(board: Board): QuadrantSummary {
    const map = board.quadrant;
    const cards = board.nodes.filter(n => n.type !== 'frame');
    const placed = cards.flatMap(n => { const p = map?.positions[n.id]; return p ? [{ nodeId: n.id, point: p, quadrant: quadrantOf(p) }] : []; });
    const counts: [number, number, number, number] = [0, 0, 0, 0];
    for (const p of placed)
        counts[p.quadrant]++;
    return { placed, unplaced: cards.filter(n => !map?.positions[n.id]).map(n => n.id), counts, empty: placed.length ? QUADRANT_ORDER.filter(o => !counts[o.index]).map(o => o.index) : [] };
}
/** Drop positions for cards that no longer exist (or became frames). */
export function prunePositions(board: Board): Board {
    if (!board.quadrant)
        return board;
    const keep = new Set(board.nodes.filter(n => n.type !== 'frame').map(n => n.id));
    const positions = Object.fromEntries(Object.entries(board.quadrant.positions).filter(([id]) => keep.has(id)));
    return Object.keys(positions).length === Object.keys(board.quadrant.positions).length ? board : { ...board, quadrant: { ...board.quadrant, positions } };
}
