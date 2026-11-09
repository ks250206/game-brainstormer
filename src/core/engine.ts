import type { Board, BoardNode, Catalog, Material, Hypothesis, Operator, Workspace, Position, Recipe } from './types.ts';
export const STORAGE_KEY = 'game-brainstormer.workspace.v1';
export const MAX_IMPORT_BYTES = 5000000;
export const OPERATORS: {
    id: Operator;
    label: string;
    short: string;
    description: string;
}[] = [
    { id: 'translate', label: '行動を置き換える', short: '置換', description: 'ひとつの行動に、別のゲームの役割を与える。' },
    { id: 'constraint', label: '制約を移植する', short: '制約', description: '使える手段・タイミング・情報を絞り、選択を生む。' },
    { id: 'invert', label: '報酬を反転する', short: '反転', description: '失敗・待機・損失を、次の機会や資源に変える。' },
    { id: 'delay', label: '時間をずらす', short: '時間差', description: '今の行動が、次の部屋・次の周回・他の時間へ届く。' },
    { id: 'social', label: '役割を交換する', short: '役割交換', description: '選ぶ人と実行する人、得する人と支払う人を分ける。' },
];
export function uid(prefix = 'n'): string { return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`; }
export function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
export function material(c: Catalog, id: string): Material | undefined { return c.materials.find(x => x.id === id); }
export function normalize(s: string): string { return s.normalize('NFKC').toLocaleLowerCase().trim(); }
export function searchMaterials(c: Catalog, opts: {
    kind?: string;
    cluster?: string;
    chapter?: string;
    query?: string;
    favorites?: string[];
} = {}): Material[] {
    const tokens = normalize(opts.query ?? '').split(/\s+/).filter(Boolean);
    return c.materials.filter(m => (!opts.kind || m.kind === opts.kind) && (!opts.cluster || opts.cluster === 'all' || m.clusters.includes(opts.cluster)) && (!opts.chapter || m.chapterCode === opts.chapter) && (!opts.favorites || opts.favorites.includes(m.id)) && tokens.every(t => normalize([m.label, m.alias, m.id, m.chapter, ...m.clusters.map(id => c.clusters.find(x => x.id === id)?.label ?? '')].join(' ')).includes(t)));
}
export function makeMaterialNode(c: Catalog, id: string, position: Position): BoardNode {
    const m = material(c, id);
    if (!m)
        throw new Error(`未知の素材: ${id}`);
    return { id: uid(), type: 'material', position, width: 230, height: 132, data: { title: m.label, body: m.kind === 'tag' ? m.alias || c.clusters.find(x => x.id === m.primaryCluster)?.label || 'Steam tag' : m.description, materialId: id, tone: m.kind === 'tag' ? 'lavender' : 'mint' } };
}
export function blankBoard(title = '新しい実験'): Board { return { id: uid('board'), title, nodes: [], edges: [], viewport: { x: 60, y: 50, zoom: 0.85 }, updatedAt: new Date().toISOString() }; }
export function initialWorkspace(c: Catalog): Workspace {
    const get = (label: string) => c.materials.find(x => x.label === label)?.id ?? c.materials[0]!.id;
    const a = makeMaterialNode(c, get('Precision Platformer'), { x: 50, y: 80 });
    a.id = 'seed-platformer';
    const b = makeMaterialNode(c, get('Automation'), { x: 50, y: 258 });
    b.id = 'seed-automation';
    const d = makeMaterialNode(c, 'MOV-10', { x: 340, y: 80 });
    d.id = 'seed-program';
    const e = makeMaterialNode(c, 'ACT-06', { x: 340, y: 258 });
    e.id = 'seed-queue';
    const hypothesis: Hypothesis = { title: '走った軌跡が、次の足場になる。', rule: '精密なジャンプ軌道を記録し、次の挑戦では自動搬送機として再生する。攻略する行動そのものが、次のコースを設計する。', example: '1周目は上のスイッチへ。2周目は前の自分が運ぶ足場に乗り、別の装置を動かす。', mvp: '1画面・記録2本・スイッチ3個。まず「待つ」より「跳ぶ」が楽しいかを確かめる。', risk: '再生待ちが増えると精密アクションのテンポを損なう。', question: '自分の動きを記録するために、わざと遠回りしたくなるか？', materials: [a.data.materialId!, b.data.materialId!, d.data.materialId!, e.data.materialId!], operator: 'translate', origin: '編集可能なスターター仮説', baseId: a.data.materialId! };
    const idea = makeIdeaNode(hypothesis, { x: 660, y: 110 });
    idea.id = 'seed-idea';
    const note: BoardNode = { id: 'seed-note', type: 'note', position: { x: 355, y: 485 }, width: 285, height: 144, data: { title: '最初に確かめること', body: '「前の自分を足場にする」だけでも楽しい？\n10秒のコースで試す。上達と設計がつながるか。', tone: 'yellow' } };
    const board: Board = { id: 'board-start', title: '精密プラットフォーマーの、その先', nodes: [a, b, d, e, idea, note], edges: [{ id: 'seed-e1', source: a.id, target: d.id, label: '操作を記録' }, { id: 'seed-e2', source: b.id, target: e.id, label: '自動化する' }, { id: 'seed-e3', source: d.id, target: idea.id, label: '組み合わせる' }, { id: 'seed-e4', source: e.id, target: idea.id, label: '次の挑戦へ' }], viewport: { x: 28, y: 26, zoom: 0.78 }, updatedAt: '2026-11-09T00:00:00.000Z' };
    return { schemaVersion: 1, activeBoardId: board.id, boards: [board], favorites: [a.data.materialId!, b.data.materialId!, 'MOV-10', 'ECO-07', 'MOV-12'], recipes: [] };
}
export function makeIdeaNode(h: Hypothesis, position: Position): BoardNode { return { id: uid('idea'), type: 'idea', position, width: 310, height: 310, data: { title: h.title, body: h.rule, tone: 'peach', status: 'seed', hypothesis: clone(h), ratings: { clarity: 0, novelty: 0, feasibility: 0 } } }; }
const verbs: Record<string, string> = { action: '跳ぶ・撃つ・操縦するなど、瞬間の操作をする', strategy: '配置と順序を計画し、相手を読む', puzzle: '情報を集めて仮説を確かめる', systems: '設備を組み、資源を運用する', progress: '獲得した能力や装備を組み替える', structure: '区間や周回をひとつ攻略する', story: '物語の選択をする', social: '他のプレイヤーと役割を調整する', world: '世界を探索し、発見する', presentation: '空間の見え方を切り替える', format: '短い課題に繰り返し挑む' };
const mechanisms: Record<string, {
    action: string;
    cost: string;
    test: string;
}> = {
    STR: { action: '実行役と受益者の役割を分ける', cost: '個人の利益と共通目標が一致しない', test: '同じ局面をソロと役割分担で比較する' },
    TRN: { action: '行動の順序と待ち時間を入れ替える', cost: '強い行動ほど次の機会が遅れる', test: '弱く速い行動と強く遅い行動の使い分けを観察する' },
    ACT: { action: '次に使える行動を選択・予約する', cost: 'いま選ぶ手段が次の選択肢を狭める', test: '2種類の能力だけで、選択に迷いが生まれるか確認する' },
    RES: { action: '成功の判定や結果の配分に変える', cost: '安全な成功と大きな利益の条件が異なる', test: '判定条件を画面で理解できるか確かめる' },
    VIC: { action: '到達以外の得点・勝利条件に結びつける', cost: '早く進むことと勝つことが一致しない', test: '最短経路と勝利条件を満たす経路が分かれるか確かめる' },
    UNC: { action: '情報を隠し、推測への賭けにする', cost: '情報を得るほど時間や資源が減る', test: '判断に必要な手掛かりを2つだけ提示する' },
    ECO: { action: '次に使う資源の生産・支払いに変える', cost: '今の便利さが後の負担になる', test: '資源1種類・支払い2箇所で、節約と投資が両立するか試す' },
    AUC: { action: '進路や能力を獲得する入札にする', cost: '勝っても支払い過多なら次で不利になる', test: '競る対象を1つに絞り、競らずに進む選択肢も用意する' },
    WPL: { action: '装置に働き手を配置・回収する手段にする', cost: '装置を動かすほど自由に動ける手が減る', test: '働き手2体と装置3つだけで再配置したくなるか試す' },
    MOV: { action: '次の移動経路や地形を変える命令にする', cost: 'いま通りやすい経路が、次も通りやすいとは限らない', test: '小さな地形1つを変えるだけで経路判断が変わるか試す' },
    ARC: { action: '足場や領域の支配権を変える', cost: '領域を広げるほど守る範囲も広がる', test: '支配領域を2つに絞り、相手の移動に反応したくなるか試す' },
    SET: { action: '特定の組み合わせを完成させる行為にする', cost: 'すぐ使う価値と揃える価値が競合する', test: '3種類の要素・2種類の完成形で収集順序を比較する' },
    CAR: { action: '手札を使い分ける決定にする', cost: '温存するほど次の手札が圧迫される', test: 'カード3枚だけで、使う・捨てる・残すの違いを試す' },
};
const specifics: Record<string, {
    rule: string;
    example: string;
    risk: string;
}> = {
    'ECO-07': { rule: '次の区間の行動回数を前借りできる。ただし到着すると、その分だけ使える行動が減る。', example: '今ここでダッシュを2回借りて安全に越えるか、難しい通常ルートで次の部屋の余力を残す。', risk: '返済後の状態でも必ず突破可能なルートを残す。' },
    'MOV-12': { rule: '着地した地点のエネルギーを、次の足場へ1個ずつ配り直す。分配された数が足場の高さになる。', example: '4個のある足場に着地し、その先4枚を順に持ち上げる。次に踏む順序で階段の形が変わる。', risk: '分配後の形が予測できないと、計画ではなく暗記になる。' },
    'ACT-10': { rule: '使用可能な能力を輪に並べ、着地のたびに次へ進める。必要な技を使うため、踏む足場を選ぶ。', example: '次がダッシュになるよう、遠回りして小さな足場を1回だけ踏む。', risk: '技の切り替えだけを待つ時間を作らない。' },
    'MOV-10': { rule: '実行した移動経路を命令として保存し、次の挑戦で装置の動作として再生する。', example: '最初に走ったルートが搬送機となり、2回目の自分をゴールまで運ぶ。', risk: '記録の準備時間が、操作の楽しさを上回らないようにする。' },
    'WPL-01': { rule: '精密に到達した装置へ分身を配置すると、その分身が装置を動かし続ける。回収すると装置は止まる。', example: '橋を動かす分身を残すか、回収して次の難所で使うかを決める。', risk: '必須配置が唯一の正解にならないよう複数の役割を用意する。' },
    'ECO-09': { rule: '使える足場や能力を二組に分け、相手が先に選ぶ。自分は残った側で攻略する。', example: '長い足場1枚と短い足場3枚をどう分ければ、どちらを取られても進めるか。', risk: '操作技能の差が分配の駆け引きを打ち消さないようにする。' },
    'AUC-14': { rule: '目標への到達精度を入札額にし、勝者が次の区間の条件を選ぶ。無理な入札には代償がある。', example: '中心への着地を狙うか、安全な端に着地して次に備えるかを選ぶ。', risk: '熟練者の独占を避けるため、落札にもコストを課す。' },
    'UNC-02': { rule: 'いつでも安全に確定できる報酬を、次の難所へ持ち越すと増える。失敗すると未確定分を失う。', example: 'いま戻って報酬を守るか、さらに狭い足場へ進んで倍率を上げるか。', risk: '失敗の損失が練習意欲を奪わないようにする。' },
};
export function makeHypotheses(c: Catalog, ids: string[], baseId: string, operator: Operator = 'translate', variant = 0): Hypothesis[] {
    const unique = [...new Set(ids)].filter(id => material(c, id));
    const ms = unique.map(id => material(c, id)!);
    const base = material(c, baseId) ?? ms.find(m => m.kind === 'tag');
    const tags = ms.filter(m => m.kind === 'tag');
    const mechanics = ms.filter(m => m.kind === 'mechanic');
    if (!base || tags.length === 0 || mechanics.length === 0)
        return [];
    const main = mechanics[Math.abs(variant) % mechanics.length]!;
    const system = mechanisms[main.chapterCode ?? 'ACT']!;
    const verb = verbs[base.primaryCluster] ?? verbs.puzzle!;
    const others = tags.filter(t => t.id !== base.id).map(t => t.label);
    const qualifiers = others.length ? `体験の条件は「${others.join(' × ')}」。` : '';
    const extra = mechanics.filter(m => m.id !== main.id).map(m => m.label);
    const constraint = extra.length ? `追加ルール「${extra.join(' / ')}」が、選択の順序・コスト・結果のどこを変えるかを1つ決める。` : '';
    const isPlatform = base.label.includes('Platformer');
    const specific = isPlatform ? specifics[main.id] : undefined;
    const effects: Record<Operator, {
        rule: string;
        question: string;
    }> = {
        translate: { rule: `「${verb}」という行動を、そのまま「${main.label}」の意思決定に変える。${system.action}。`, question: '別のミニゲームを挟まず、同じ操作ひとつで両方の判断が成立するか？' },
        constraint: { rule: `「${base.label}」の通常操作は保ち、「${main.label}」を通じて使える手段・順序・回数を制限する。`, question: '制約が操作の邪魔ではなく、選びたい二つの道を生んでいるか？' },
        invert: { rule: `「${base.label}」の失敗・損失を、「${main.label}」で次に使える資源や権利へ変換する。成功とは異なる選択肢を開く。`, question: 'わざと失敗するだけが最適にならず、上達する価値も残るか？' },
        delay: { rule: `「${base.label}」で今行った操作を、「${main.label}」に従って次の部屋・次の周回で解決する。`, question: '未来への準備をするために、いまの最短経路を変えたくなるか？' },
        social: { rule: `「${base.label}」の選択者と実行者を分け、「${main.label}」で交渉・委任・対立を作る。`, question: '相手の判断が自分の操作に影響し、会話や読み合いが必要になるか？' },
    };
    const effect = effects[operator];
    const out: Hypothesis[] = [];
    const exact = c.fusions.filter(f => unique.includes(f.tagId) && unique.includes(f.mechanicId));
    // Prior examples were developed specifically for precision platformers; do not silently transplant them into other genres.
    if (exact.length && isPlatform && operator === 'translate') {
        const uniqueExamples = Array.from(new Map(exact.map(x => [x.conceptId, x])).values());
        const f = uniqueExamples[Math.abs(variant) % uniqueExamples.length]!;
        out.push({ title: f.title, rule: f.rule, example: f.example, mvp: f.mvp, risk: f.risk, question: `この先行ブレストは1ペアを起点にしている。${qualifiers}${constraint} 他の選択素材も同じコアループに必要か？`, materials: unique, operator, origin: '既存のブレスト例（面白さは未検証）', sourceId: f.id, baseId: base.id });
    }
    out.push({ title: `${base.label} × ${main.label}`, rule: `${operator === 'translate' && specific ? specific.rule : effect.rule} ${qualifiers} ${constraint}`.trim(), example: specific && operator === 'translate' ? specific.example : `1. ${verb}。\n2. 「${main.label}」で結果を処理。\n3. ${system.cost}状況で、次の行動を選ぶ。`, mvp: system.test + '。1画面または1ラウンドで検証する。', risk: specific?.risk ?? `${system.cost}という判断が、説明の負荷や待機時間に埋もれないか。`, question: effect.question, materials: unique, operator, origin: 'ルールベースの発想用プロンプト（自動評価ではない）', baseId: base.id });
    const alt = OPERATORS[(OPERATORS.findIndex(x => x.id === operator) + 1 + Math.abs(variant) % 3) % OPERATORS.length]!;
    const next = effects[alt.id];
    out.push({ title: `別の角度：${alt.label}`, rule: next.rule + ` ${qualifiers} ${constraint}`, example: `同じ素材のまま「${OPERATORS.find(x => x.id === operator)!.short}」から「${alt.short}」へ変える。変わるのはルール1つだけにする。`, mvp: '元の案と変更案を同じ小さな場面で比べ、選択がどう変化したかを記録する。', risk: '制約・報酬・時間差を同時に変えると、何が効いたのか判断できない。', question: next.question, materials: unique, operator: alt.id, origin: '比較実験用の変形案', baseId: base.id });
    return out;
}
export function discover(c: Catalog, excluded: string[], baseId: string, seed = 0): string[] {
    const base = material(c, baseId);
    const eligible = c.materials.filter(m => !excluded.includes(m.id) && m.id !== baseId);
    const distant = eligible.filter(m => !base || m.primaryCluster !== base.primaryCluster);
    const tagPool = distant.filter(m => m.kind === 'tag' && !['format', 'presentation'].includes(m.primaryCluster));
    const mechPool = distant.filter(m => m.kind === 'mechanic');
    const pick = (arr: Material[], salt: number) => arr.length ? arr[((Math.abs(seed) + 1) * 37 + salt * 17) % arr.length]!.id : '';
    return [pick(tagPool, 1), pick(mechPool, 2)].filter(Boolean);
}
export function escapeXml(text: string): string { return text.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!)); }
export function bounds(nodes: BoardNode[]) { if (!nodes.length)
    return { x: 0, y: 0, width: 1000, height: 700 }; const x = Math.min(...nodes.map(n => n.position.x)), y = Math.min(...nodes.map(n => n.position.y)); return { x, y, width: Math.max(...nodes.map(n => n.position.x + n.width)) - x, height: Math.max(...nodes.map(n => n.position.y + n.height)) - y }; }
export function toMarkdown(board: Board, c: Catalog): string {
    const lines = [`# ${board.title}`, '', `更新: ${board.updatedAt}`, '', '> 本文はブレスト仮説です。新規性・市場性・面白さを検証した評価ではありません。', ''];
    for (const n of board.nodes) {
        if (n.type === 'frame')
            continue;
        lines.push(`## ${n.data.title}`, '');
        if (n.data.materialId) {
            const m = material(c, n.data.materialId);
            lines.push(`素材: ${m?.kind === 'tag' ? 'Steamタグ' : 'メカニクス'} / ${n.data.materialId}`, m?.source ?? '', '');
        }
        lines.push(n.data.body, '');
        const h = n.data.hypothesis;
        if (h)
            lines.push('### プレイの一場面', h.example, '', '### 最小の実験', h.mvp, '', '### 壊れそうなところ', h.risk, '', '### 検証する問い', h.question, '', `出発点: ${h.origin}`, '', `素材: ${h.materials.map(id => material(c, id)?.label ?? id).join(' × ')}`, '');
        if (n.data.status)
            lines.push(`状態: ${n.data.status}`, '');
        if (n.data.ratings)
            lines.push(`手動評価（0は未評価）: ${JSON.stringify(n.data.ratings)}`, '');
    }
    if (board.edges.length)
        lines.push('## 関係', '', ...board.edges.map(e => `- ${board.nodes.find(n => n.id === e.source)?.data.title} → ${board.nodes.find(n => n.id === e.target)?.data.title}：${e.label}`), '');
    return lines.join('\n');
}
export function toSvg(board: Board): string {
    const b = bounds(board.nodes), pad = 60;
    const w = Math.min(b.width + pad * 2, 16000), h = Math.min(b.height + pad * 2 + 50, 16000);
    const colors: Record<string, string> = { lavender: '#f0edff', mint: '#e9f6ef', peach: '#fff0e7', yellow: '#fff5bf', blue: '#e9f1ff' };
    const wrap = (s: string, len = 26) => { const chars = Array.from(s); const lines = []; while (chars.length)
        lines.push(chars.splice(0, len).join('')); return lines; };
    const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${b.x - pad} ${b.y - pad - 50} ${w} ${h}"><rect x="${b.x - pad}" y="${b.y - pad - 50}" width="${w}" height="${h}" fill="#f7f7f4"/><style>text{font-family:system-ui,sans-serif;fill:#283132}</style><text x="${b.x}" y="${b.y - 50}" font-size="21" font-weight="700">${escapeXml(board.title)}</text>`];
    for (const e of board.edges) {
        const a = board.nodes.find(n => n.id === e.source), z = board.nodes.find(n => n.id === e.target);
        if (!a || !z)
            continue;
        const x = a.position.x + a.width, y = a.position.y + a.height / 2, tx = z.position.x, ty = z.position.y + z.height / 2;
        parts.push(`<path d="M${x},${y} C${x + 70},${y} ${tx - 70},${ty} ${tx},${ty}" fill="none" stroke="#9d9bb8" stroke-width="2"/><text x="${(x + tx) / 2}" y="${(y + ty) / 2 - 8}" font-size="11">${escapeXml(e.label)}</text>`);
    }
    for (const n of [...board.nodes].sort((a, b) => (a.type === 'frame' ? -1 : 0) - (b.type === 'frame' ? -1 : 0))) {
        const { x, y } = n.position;
        parts.push(`<rect x="${x}" y="${y}" width="${n.width}" height="${n.height}" rx="14" fill="${n.type === 'frame' ? 'none' : colors[n.data.tone] ?? '#ffffff'}" stroke="${n.type === 'frame' ? '#b5b7bc' : '#d5d5df'}" ${n.type === 'frame' ? 'stroke-dasharray="6 5"' : ''}/>`);
        wrap(n.data.title, 20).slice(0, 2).forEach((line, i) => parts.push(`<text x="${x + 18}" y="${y + 32 + i * 24}" font-size="16" font-weight="700">${escapeXml(line)}</text>`));
        if (n.type !== 'frame')
            wrap(n.data.body, 27).slice(0, Math.max(1, Math.floor((n.height - 90) / 19))).forEach((line, i) => parts.push(`<text x="${x + 18}" y="${y + 85 + i * 19}" font-size="12">${escapeXml(line)}</text>`));
    }
    parts.push('</svg>');
    return parts.join('');
}
function record(x: unknown): x is Record<string, unknown> { return typeof x === 'object' && x !== null && !Array.isArray(x); }
function text(x: unknown, max = 8000): string { if (typeof x !== 'string' || x.length > max)
    throw new Error('文字列の形式または長さが不正です。'); return x; }
function num(x: unknown, lo: number, hi: number): number { if (typeof x !== 'number' || !Number.isFinite(x) || x < lo || x > hi)
    throw new Error('数値が範囲外です。'); return x; }
function list(x: unknown, max: number): unknown[] { if (!Array.isArray(x) || x.length > max)
    throw new Error('配列の形式または件数が不正です。'); return x; }
function ids(x: unknown, c: Catalog, max = 40): string[] { return list(x, max).map(v => { const s = text(v, 100); if (!material(c, s))
    throw new Error(`未知の素材ID: ${s}`); return s; }); }
function op(x: unknown): Operator { if (!OPERATORS.some(o => o.id === x))
    throw new Error('不正な変換演算子です。'); return x as Operator; }
function hypothesis(x: unknown, c: Catalog): Hypothesis { if (!record(x))
    throw new Error('仮説データが不正です。'); return { title: text(x.title, 300), rule: text(x.rule), example: text(x.example), mvp: text(x.mvp), risk: text(x.risk), question: text(x.question), materials: ids(x.materials, c), operator: op(x.operator), origin: text(x.origin, 300), baseId: ids([x.baseId], c)[0]!, ...(x.sourceId ? { sourceId: text(x.sourceId, 100) } : {}) }; }
/** Strict whitelist validation. Imported HTML is always treated as text, never executed. */
export function parseWorkspace(json: string, c: Catalog): Workspace {
    if (new TextEncoder().encode(json).length > MAX_IMPORT_BYTES)
        throw new Error('ファイルが大きすぎます（上限5 MB）。');
    const raw: unknown = JSON.parse(json);
    if (!record(raw) || raw.schemaVersion !== 1)
        throw new Error('対応していないボード形式です（schemaVersion: 1 が必要）。');
    const boards: Board[] = list(raw.boards, 40).map(b => {
        if (!record(b) || !record(b.viewport))
            throw new Error('ボードの形式が不正です。');
        const nodes: BoardNode[] = list(b.nodes, 1000).map(n => {
            if (!record(n) || !record(n.position) || !record(n.data) || !['material', 'note', 'idea', 'frame'].includes(String(n.type)))
                throw new Error('ノードの形式が不正です。');
            const d = n.data;
            const tone = text(d.tone, 20);
            if (!['lavender', 'mint', 'peach', 'yellow', 'blue'].includes(tone))
                throw new Error('不正なカード色です。');
            const data: BoardNode['data'] = { title: text(d.title, 300), body: text(d.body), tone };
            if (n.type === 'material') {
                data.materialId = ids([d.materialId], c)[0]!;
            }
            if (d.status !== undefined) {
                if (!['seed', 'testing', 'promising', 'parked'].includes(String(d.status)))
                    throw new Error('不正なステータスです。');
                data.status = d.status as BoardNode['data']['status'];
            }
            if (d.hypothesis !== undefined)
                data.hypothesis = hypothesis(d.hypothesis, c);
            if (d.ratings !== undefined) {
                if (!record(d.ratings))
                    throw new Error('評価が不正です。');
                data.ratings = { clarity: num(d.ratings.clarity, 0, 5), novelty: num(d.ratings.novelty, 0, 5), feasibility: num(d.ratings.feasibility, 0, 5) };
            }
            // Optional and additive: documents written before the play map still parse unchanged.
            if (d.play !== undefined) {
                if (!record(d.play) || (n.type !== 'idea' && n.type !== 'note'))
                    throw new Error('遊びの地図の位置が不正です。');
                data.play = { x: num(d.play.x, -1, 1), y: num(d.play.y, -1, 1) };
            }
            return { id: text(n.id, 100), type: n.type as BoardNode['type'], position: { x: num(n.position.x, -1e6, 1e6), y: num(n.position.y, -1e6, 1e6) }, width: num(n.width, 40, 10000), height: num(n.height, 40, 10000), data };
        });
        const known = new Set(nodes.map(n => n.id));
        if (known.size !== nodes.length)
            throw new Error('ノードIDが重複しています。');
        const edges = list(b.edges, 2000).map(e => { if (!record(e))
            throw new Error('接続が不正です。'); const source = text(e.source, 100), target = text(e.target, 100); if (!known.has(source) || !known.has(target) || source === target)
            throw new Error('接続先が存在しないか、自己接続です。'); return { id: text(e.id, 100), source, target, label: text(e.label, 200) }; });
        if (new Set(edges.map(e => e.id)).size !== edges.length)
            throw new Error('接続IDが重複しています。');
        return { id: text(b.id, 100), title: text(b.title, 300), nodes, edges, viewport: { x: num(b.viewport.x, -1e7, 1e7), y: num(b.viewport.y, -1e7, 1e7), zoom: num(b.viewport.zoom, 0.1, 4) }, updatedAt: text(b.updatedAt, 100) };
    });
    if (!boards.length || new Set(boards.map(b => b.id)).size !== boards.length)
        throw new Error('ボードが空、またはIDが重複しています。');
    const active = text(raw.activeBoardId, 100);
    if (!boards.some(b => b.id === active))
        throw new Error('アクティブなボードが存在しません。');
    const recipes: Recipe[] = list(raw.recipes ?? [], 200).map(r => { if (!record(r))
        throw new Error('レシピが不正です。'); return { id: text(r.id, 100), title: text(r.title, 300), materials: ids(r.materials, c), operator: op(r.operator), baseId: ids([r.baseId], c)[0]! }; });
    return { schemaVersion: 1, activeBoardId: active, boards, favorites: ids(raw.favorites ?? [], c, 1000), recipes };
}
