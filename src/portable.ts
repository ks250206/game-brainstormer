/** Dependency-free renderer. The main application uses Astryx + React Flow.
 * This renderer shares the exact catalog, state and hypothesis engine, but deliberately
 * uses native DOM/SVG so the companion single-file edition works without a network. */
import type { Catalog, BoardNode, Hypothesis, Operator, Position, UIState } from './core/types.ts';
import { WorkbenchStore } from './core/store.ts';
import { ICONS } from './core/icons.ts';
import { material, searchMaterials, OPERATORS, makeHypotheses, discover, bounds, toMarkdown, toSvg, escapeXml, MAX_IMPORT_BYTES } from './core/engine.ts';
declare const CATALOG_DATA: Catalog;
const portableStore = new WorkbenchStore(CATALOG_DATA);
const portableRoot = document.getElementById('root')!;
const esc = escapeXml;
let generated: Hypothesis[] = [];
let generatingSignature = '';
let blockedStorage = false;
let storageStatus = 'このブラウザに保存';
let saveTimer: ReturnType<typeof setTimeout>;
let toastTimer: ReturnType<typeof setTimeout>;
let lastToast = '';
let lastCardClick = { id: '', time: 0 };
let pendingConnection: string | null = null;
let lastWorkspace = portableStore.getSnapshot().workspace;
let gesture: null | {
    mode: 'node' | 'pan' | 'box';
    x: number;
    y: number;
    origin: Position;
    zoom: number;
    positions: Record<string, Position>;
    moved: boolean;
    add: boolean;
    selection: string[];
} = null;
let boxRect: {
    x: number;
    y: number;
    w: number;
    h: number;
} | null = null;
const STATUSTEXT: Record<string, string> = { seed: '仮説の種', testing: '試作中', promising: '有望', parked: '保留' };
function ico(name: string) { return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name] ?? ICONS.spark}"/></svg>`; }
function action(name: string, label: string, icon = '', cls = 'btn', id = '', disabled = false) { return `<button type="button" class="${cls}" data-action="${name}" data-id="${esc(id)}" title="${esc(label)}" aria-label="${esc(label)}" ${disabled ? 'disabled' : ''}>${icon ? ico(icon) : ''}${cls.includes('icon-btn') ? '' : `<span>${esc(label)}</span>`}</button>`; }
function pstate() { return portableStore.getSnapshot(); }
function sourceName(id: string) { return material(CATALOG_DATA, id)?.label ?? id; }
function tagSignature(s: UIState) { return JSON.stringify([s.tray, s.baseId, s.operator]); }
function readFocus() { const el = document.activeElement as HTMLInputElement; return el && el.dataset.bind ? { bind: el.dataset.bind, id: el.dataset.id, start: el.selectionStart, end: el.selectionEnd } : null; }
function restoreFocus(f: ReturnType<typeof readFocus>) { if (!f)
    return; const el = [...portableRoot.querySelectorAll<HTMLInputElement>('[data-bind]')].find(e => e.dataset.bind === f.bind && e.dataset.id === f.id); if (el) {
    el.focus({ preventScroll: true });
    try {
        el.setSelectionRange(f.start, f.end);
    }
    catch { /* select/range has no text selection. */ }
} }
function renderHeader() { const s = pstate(); return `<header class="app-header"><div class="brand"><span class="brand-mark">${ico('brand')}</span><div><div class="brand-title">Game Brainstormer</div><small>A PLAYGROUND FOR WHAT IF</small></div></div><div class="header-divider"></div><div class="header-title"><select class="board-switch" data-bind="board" aria-label="ボードを切り替える">${s.workspace.boards.map(b => `<option value="${esc(b.id)}" ${b.id === s.workspace.activeBoardId ? 'selected' : ''}>${esc(b.title)}</option>`).join('')}</select>${action('rename', 'ボードの名前を変更', 'chevron', 'icon-btn')}${action('new-board', '新しいボード', 'plus', 'icon-btn')}</div><div class="header-actions"><span class="portable-label" title="オフライン・単体HTML版">PORTABLE</span><span class="save-status ${blockedStorage ? 'error' : ''}"><span class="save-dot"></span>${esc(storageStatus)}</span>${action('import', '読み込む', 'upload')}<details class="export-menu"><summary class="btn">${ico('download')}<span>書き出す</span>${ico('chevron')}</summary><div class="menu-pop">${action('export-json', 'ワークスペース JSON', 'save')}${action('export-md', '企画メモ Markdown', 'note')}${action('export-svg', 'ボード画像 SVG', 'board')}</div></details>${action('help', '使い方とデータについて', 'info', 'icon-btn')}</div></header>`; }
function renderRibbon() { const s = pstate(); return `<nav class="tabs-bar" aria-label="ライブラリの種類">${[['tag', 'tag', 'タグ・素材', 429], ['mechanic', 'book', 'メカニクス', 203], ['concept', 'spark', '先行ブレスト', 45], ['favorite', 'star', 'お気に入り', s.workspace.favorites.length]].map(([id, i, l, c]) => `<button class="tab ${s.tab === id ? 'active' : ''}" data-action="tab" data-id="${id}" aria-pressed="${s.tab === id}">${ico(String(i))}${l}<span class="count-badge">${c}</span></button>`).join('')}<div class="tabs-spacer"></div><span class="quiet-label">組み合わせから、ゲームの種を見つける。</span></nav><div class="ribbon" role="toolbar" aria-label="意味クラスタ">${[{ id: 'all', label: 'すべて', icon: 'grid', color: '#8d85a7' }, ...CATALOG_DATA.clusters].map((c, i) => `${i === 1 ? '<div class="ribbon-separator"></div>' : ''}<button class="cluster-tile ${s.cluster === c.id ? 'active' : ''}" style="--cluster-color:${c.color}" data-action="cluster" data-id="${c.id}" aria-pressed="${s.cluster === c.id}"><span class="cluster-icon">${ico(c.icon)}</span><span class="cluster-label">${c.label}<span class="cluster-count">${CATALOG_DATA.materials.filter(m => (s.tab === 'mechanic' ? m.kind === 'mechanic' : m.kind === 'tag') && (c.id === 'all' || m.clusters.includes(c.id))).length}</span></span></button>`).join('')}</div><div class="formula-bar"><span class="formula-symbol">ƒx</span><span class="formula-label">MIX</span><div class="formula-items">${s.tray.slice(0, 4).map((id, i) => `${i ? '<span class="formula-times">×</span>' : ''}<span class="formula-chip">${esc(sourceName(id))}</span>`).join('')}${s.tray.length > 4 ? `<span class="quiet-label">+${s.tray.length - 4}</span>` : ''}${!s.tray.length ? '<span class="quiet-label">タグ × メカニクス → 新しい遊び</span>' : ''}</div>${action('mix-selected', '選択を素材にする', '', 'btn small subtle', '', !s.selected.length)}${action('open-lab', '組み合わせを考える', 'flask', 'btn small')}</div>`; }
function renderLibrary() {
    const s = pstate(), c = CATALOG_DATA.clusters.find(x => x.id === s.cluster);
    const ms = searchMaterials(CATALOG_DATA, { kind: s.tab === 'favorite' ? undefined : s.tab, cluster: s.cluster, chapter: s.chapter, query: s.query, ...(s.tab === 'favorite' ? { favorites: s.workspace.favorites } : {}) });
    const cs = CATALOG_DATA.concepts.filter(c => (s.cluster === 'all' || c.materials.some(id => material(CATALOG_DATA, id)?.clusters.includes(s.cluster))) && [c.title, c.rule, ...c.materials.map(sourceName)].join(' ').toLowerCase().includes(s.query.toLowerCase()));
    const count = s.tab === 'concept' ? cs.length : ms.length;
    return `<aside class="library" aria-label="素材ライブラリ"><div class="library-heading"><button class="icon-btn drawer-close" data-action="mobile" data-id="none" aria-label="素材パネルを閉じる">${ico('x')}</button><div class="section-eyebrow">MATERIAL LIBRARY</div><h2>${s.tab === 'concept' ? '先行ブレスト' : c?.label ?? 'すべての素材'}<span class="section-count">${count}</span></h2></div><div class="search-box">${ico('search')}<input type="search" data-bind="query" aria-label="素材を検索" placeholder="タグ・日本語・IDで検索" value="${esc(s.query)}"/></div>${s.tab === 'mechanic' ? `<select class="filter-select" data-bind="chapter" aria-label="書籍の章で絞り込む"><option value="">すべての章（意味クラスタを横断）</option>${CATALOG_DATA.chapters.map(c => `<option value="${c.id}" ${c.id === s.chapter ? 'selected' : ''}>${c.id} · ${c.label}</option>`).join('')}</select>` : ''}<div class="library-help">ドラッグで配置 · ＋で追加<br>素材名をクリックするとラボに入ります</div><div class="library-list">${s.tab === 'concept' ? cs.map(c => `<article class="concept-row"><div class="section-eyebrow">${esc(c.id)} · PRIOR EXPLORATION</div><h3>${esc(c.title)}</h3><p>${esc(c.rule)}</p>${action('concept', 'ボードに展開', 'plus', 'btn small', c.id)}</article>`).join('') : ms.map(m => `<div class="library-item ${s.tray.includes(m.id) ? 'in-mix' : ''}" draggable="true" data-material="${esc(m.id)}"><span class="material-glyph ${m.kind}">${ico(m.kind === 'tag' ? 'tag' : 'book')}</span><button class="library-label" style="text-align:left;padding:0" data-action="toggle-material" data-id="${esc(m.id)}" title="${esc(m.alias + '\n' + m.description)}"><strong>${esc(m.label)}</strong><small>${m.kind === 'tag' ? `${m.rank} · ${CATALOG_DATA.clusters.find(c => c.id === m.primaryCluster)?.label}` : `${m.id} · ${m.chapter}`}</small></button><button class="item-star ${s.workspace.favorites.includes(m.id) ? 'active' : ''}" data-action="favorite" data-id="${esc(m.id)}" aria-label="${esc(m.label)}をお気に入りに切り替え">${ico('star')}</button><button class="item-add" data-action="add-material" data-id="${esc(m.id)}" aria-label="${esc(m.label)}をボードに追加">${ico('plus')}</button></div>`).join('')}${!count ? `<div class="no-results">該当する素材がありません。<br>「すべて」の分類でも検索できます。${action('clear-filter', '分類を解除', '', 'btn small')}</div>` : ''}</div><div class="library-footer"><strong>429 Steam tags + 203 mechanics</strong><br>意味ベースの編集分類 · 複数カテゴリ対応<br>順位は既存データの適用頻度。売上ではありません。</div></aside>`;
}
function renderCard(n: BoardNode) { const s = pstate(), m = n.data.materialId ? material(CATALOG_DATA, n.data.materialId) : undefined; return `<article class="board-node node-${n.type} ${esc(n.data.tone)} ${s.selected.includes(n.id) ? 'selected' : ''}" data-node="${esc(n.id)}" style="left:${n.position.x}px;top:${n.position.y}px;width:${n.width}px;height:${n.height}px;${n.type === 'frame' ? 'z-index:0' : ''}" tabindex="0" aria-label="${esc(n.data.title)}">${n.type === 'frame' ? `<div class="node-title">${esc(n.data.title)}</div>` : `<button class="node-port left" data-port="${esc(n.id)}" title="カードを接続" aria-label="${esc(n.data.title)}の接続端子"></button><div class="node-eyebrow">${ico(n.type === 'material' ? (m?.kind === 'tag' ? 'tag' : 'book') : n.type === 'idea' ? 'spark' : 'note')}${n.type === 'material' ? (m?.kind === 'tag' ? 'STEAM TAG' : esc(m?.id ?? '')) : n.type === 'idea' ? 'WORKING HYPOTHESIS' : 'LAB NOTE'}</div><div class="node-title">${esc(n.data.title)}</div><div class="node-description">${esc(n.data.body)}</div>${n.type === 'idea' ? `<div class="node-divider"></div><div class="node-foot"><span class="status-pill ${n.data.status}"><span class="status-dot"></span>${STATUSTEXT[n.data.status ?? 'seed']}</span><span>ダブルクリックで編集 ↗</span></div>` : ''}<button class="node-port right" data-port="${esc(n.id)}" title="カードを接続" aria-label="${esc(n.data.title)}から接続"></button>`}</article>`; }
function renderWorld() { const b = portableStore.board(), s = pstate(); return `<svg class="wire-layer" aria-label="カードの関係"><defs><marker id="arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="#b4a9c6"/></marker></defs>${b.edges.map(e => { const a = b.nodes.find(n => n.id === e.source)!, z = b.nodes.find(n => n.id === e.target)!; const x1 = a.position.x + a.width, y1 = a.position.y + a.height / 2, x2 = z.position.x, y2 = z.position.y + z.height / 2, k = Math.max(55, Math.abs(x2 - x1) * .45); return `<g><path data-edge="${esc(e.id)}" class="wire ${e.id === s.selectedEdge ? 'selected' : ''}" d="M ${x1} ${y1} C ${x1 + k} ${y1}, ${x2 - k} ${y2}, ${x2} ${y2}" marker-end="url(#arrowhead)"/><text data-edge="${esc(e.id)}" class="wire-label" x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 9}" text-anchor="middle">${esc(e.label)}</text></g>`; }).join('')}</svg>${b.nodes.map(renderCard).join('')}`; }
function renderTools() { const s = pstate(); return `<div class="board-tools" role="toolbar" aria-label="ホワイトボードのツール">${action('tool', '選択 (V)', 'pointer', `icon-btn ${s.tool === 'select' ? 'active' : ''}`, 'select')}${action('tool', '移動 (H)', 'hand', `icon-btn ${s.tool === 'pan' ? 'active' : ''}`, 'pan')}<div class="tool-divider"></div>${action('note', '付箋を追加 (N)', 'note', 'icon-btn')}${action('tool', '接続：2枚を順にクリック', 'link', `icon-btn ${s.tool === 'connect' ? 'active' : ''}`, 'connect')}${action('frame', '選択を比較フレームで囲む', 'frame', 'icon-btn')}${action('arrange', 'カードを整列', 'grid', 'icon-btn secondary-tool')}<div class="tool-divider"></div>${action('undo', '元に戻す (Ctrl/⌘ Z)', 'undo', 'icon-btn', '', !s.canUndo)}${action('redo', 'やり直す (Ctrl/⌘ Shift Z)', 'redo', 'icon-btn secondary-tool', '', !s.canRedo)}</div>`; }
function renderMinimap() { const b = portableStore.board(), bb = bounds(b.nodes); return `<svg class="mini-map" data-action="fit" role="button" aria-label="全体を表示" viewBox="${bb.x - 40} ${bb.y - 40} ${bb.width + 80} ${bb.height + 80}">${b.nodes.map(n => `<rect x="${n.position.x}" y="${n.position.y}" width="${n.width}" height="${n.height}" rx="12" fill="${n.type === 'idea' ? '#edcfb7' : n.type === 'note' ? '#f1e2a8' : '#ded7ef'}" opacity="${n.type === 'frame' ? .25 : 1}"/>`).join('')}</svg>`; }
function renderBoard() { const b = portableStore.board(), s = pstate(); return `<section class="board-area" aria-label="ブレストのホワイトボード"><div class="canvas-heading"><div class="eyebrow">YOUR NEXT GAME STARTS HERE</div><h1>つないで、ずらして、化学反応を。</h1></div><div class="board-chip">無限キャンバス · ローカル保存</div><nav class="mobile-nav" aria-label="パネル切り替え">${['library', 'none', 'lab'].map((id, i) => `<button data-action="mobile" data-id="${id}" class="${s.mobilePanel === id ? 'active' : ''}">${['素材', 'ボード', 'ラボ'][i]}</button>`).join('')}</nav><div class="canvas" aria-label="素材カードの接続と配置" style="cursor:${s.tool === 'pan' ? 'grab' : s.tool === 'connect' ? 'crosshair' : 'default'}"><div class="canvas-world" style="transform:translate(${b.viewport.x}px,${b.viewport.y}px) scale(${b.viewport.zoom})">${renderWorld()}</div></div>${!b.nodes.length ? `<div class="empty-board">${ico('flask')}<h3>まだない遊びを、ここから。</h3><p>リボンで素材を選んで追加。<br>タグとメカニクスをつないでみよう。</p></div>` : ''}${s.selected.length ? `<div class="selection-actions"><span>${s.selected.length} 枚選択</span>${action('mix-selected', '素材にする', 'flask', 'btn small')}${action('duplicate', '選択カードを複製', 'copy', 'icon-btn')}${action('delete', '選択カードを削除', 'trash', 'icon-btn')}</div>` : ''}${renderTools()}<div class="zoom-controls">${action('zoom-out', '縮小', 'minus', 'icon-btn')}<span class="zoom-value">${Math.round(b.viewport.zoom * 100)}%</span>${action('zoom-in', '拡大', 'plus', 'icon-btn')}${action('fit', '全体を表示', 'fit', 'icon-btn')}</div>${renderMinimap()}</section>`; }
function renderField(label: string, value: string, bind: string, id: string, lines = 1) { return `<label class="form-field"><span class="field-label">${esc(label)}</span>${lines > 1 ? `<textarea maxlength="8000" class="field-textarea" rows="${lines}" data-bind="${bind}" data-id="${esc(id)}">${esc(value)}</textarea>` : `<input maxlength="300" class="field-input" value="${esc(value)}" data-bind="${bind}" data-id="${esc(id)}"/>`}</label>`; }
function renderInspector() { const s = pstate(), b = portableStore.board(), edge = b.edges.find(e => e.id === s.selectedEdge), n = b.nodes.find(n => s.selected.includes(n.id)); if (edge)
    return `<p class="inspector-kicker">RELATIONSHIP · 接続を編集</p>${renderField('関係の名前', edge.label, 'edge', edge.id)}${action('delete', 'この接続を削除', 'trash', 'btn small danger')}`; if (!n)
    return '<div class="lab-tip"><h3>カードを選択してください</h3><p>ダブルクリックで編集。接続線をクリックすると、関係の名前も変えられます。</p></div>'; const h = n.data.hypothesis, m = n.data.materialId ? material(CATALOG_DATA, n.data.materialId) : undefined; return `<p class="inspector-kicker">${n.type === 'idea' ? 'WORKING HYPOTHESIS' : 'EDIT CARD'} · ${s.selected.length} 枚選択</p>${renderField('タイトル', n.data.title, 'node-title', n.id)}${renderField(n.type === 'idea' ? 'ゲームの中心ルール' : 'メモ', n.data.body, 'node-body', n.id, 4)}${h ? `${renderField('1プレイの具体例', h.example, 'hyp-example', n.id, 3)}${renderField('最小の試作', h.mvp, 'hyp-mvp', n.id, 3)}${renderField('懸念・壊れそうな点', h.risk, 'hyp-risk', n.id, 3)}${renderField('検証する問い', h.question, 'hyp-question', n.id, 3)}<label class="form-field"><span class="field-label">ステータス</span><select class="field-select" data-bind="node-status" data-id="${esc(n.id)}">${Object.entries(STATUSTEXT).map(([id, l]) => `<option value="${id}" ${n.data.status === id ? 'selected' : ''}>${l}</option>`).join('')}</select></label><span class="field-label">自分の評価（0 = 未評価）</span>${[['clarity', '明快さ'], ['novelty', '新しさ'], ['feasibility', '試作しやすさ']].map(([id, l]) => `<label class="rating-row">${l}<input type="range" min="0" max="5" step="1" value="${n.data.ratings?.[id as 'clarity'] ?? 0}" data-bind="rating-${id}" data-id="${esc(n.id)}"/><span>${n.data.ratings?.[id as 'clarity'] ?? 0}</span></label>`).join('')}<p class="method-note">評価は人が記録する値です。市場性の予測ではありません。</p>` : ''}${m ? `<div class="metadata"><strong>${esc(m.id)} · ${m.kind === 'tag' ? 'Steam tag' : esc(m.chapter ?? '')}</strong><br>${esc(m.alias)}<br>${m.clusters.map(id => CATALOG_DATA.clusters.find(c => c.id === id)?.label).join(' / ')}<br><a href="${esc(m.source)}" target="_blank" rel="noopener noreferrer">出典を開く ↗</a></div>` : ''}<div class="mix-actions">${action('duplicate', '複製', 'copy', 'btn small')}${action('delete', '削除', 'trash', 'btn small danger')}</div>`; }
function renderLab() { const s = pstate(); const ms = s.tray.map(id => material(CATALOG_DATA, id)!).filter(Boolean); const ready = ms.some(m => m.kind === 'tag') && ms.some(m => m.kind === 'mechanic'); return `<aside class="lab" aria-label="組み合わせラボ"><div class="lab-header"><button class="icon-btn drawer-close" data-action="mobile" data-id="none" aria-label="ラボパネルを閉じる">${ico('x')}</button><div class="section-eyebrow">COMBINATION LAB</div><h2>${ico('flask')}化学反応を探す</h2><p>タグを足すだけでなく、遊びの意味を変える。</p><div class="panel-tabs"><button data-action="panel" data-id="lab" class="${s.panel === 'lab' ? 'active' : ''}">組み合わせ</button><button data-action="panel" data-id="inspect" class="${s.panel === 'inspect' ? 'active' : ''}">カードを編集</button></div></div><div class="lab-content">${s.panel === 'inspect' ? renderInspector() : `<label class="form-field"><span class="field-label">01 &nbsp; 土台になるゲーム</span><select class="field-select" aria-label="土台になるゲーム" data-bind="base">${CATALOG_DATA.materials.filter(m => m.kind === 'tag').map(m => `<option value="${m.id}" ${m.id === s.baseId ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select></label><span class="field-label">02 &nbsp; 混ぜる素材 <small> ${ms.length}/12</small></span><div class="mix-tray">${ms.map(m => `<span class="mix-token ${m.kind}">${ico(m.kind === 'tag' ? 'tag' : 'book')}<span>${esc(m.label)}</span><button data-action="toggle-material" data-id="${m.id}" aria-label="${esc(m.label)}を素材から除く">${ico('x')}</button></span>`).join('')}${!ms.length ? '<p class="tray-placeholder">左の素材名をクリック。<br>タグとメカニクスを1つずつ入れてみよう。</p>' : ''}</div><div class="mix-actions">${action('discover', '遠い素材を混ぜる', 'shuffle', 'btn small')}${action('save-recipe', '保存', 'star', 'btn small', '', !ms.length)}${action('clear-tray', 'クリア', '', 'btn small subtle', '', !ms.length)}</div><div class="panel-divider"></div><span class="field-label">03 &nbsp; 化学反応の起こし方</span><div class="operator-list">${OPERATORS.map(o => `<button class="operator ${s.operator === o.id ? 'active' : ''}" data-action="operator" data-id="${o.id}" aria-pressed="${s.operator === o.id}">${o.label}</button>`).join('')}</div><p class="operator-description">${OPERATORS.find(o => o.id === s.operator)?.description}</p>${action('react', 'この組み合わせを考える', 'spark', 'btn primary reaction-button', '', !ready)}<p class="method-note">既存500例 + ルールベースの発想支援<br>生成AI・自動採点ではありません。</p>${generated.map((h, i) => `<article class="hypothesis-card"><div class="section-eyebrow">HYPOTHESIS ${String(i + 1).padStart(2, '0')}</div><h3>${esc(h.title)}</h3><p>${esc(h.rule)}</p><details><summary>具体例・懸念・検証する問い</summary><p>${esc(h.example)}</p><strong>最小試作</strong><p>${esc(h.mvp)}</p><strong>懸念点</strong><p>${esc(h.risk)}</p><strong>問い</strong><p>${esc(h.question)}</p></details><small>${esc(h.origin)}</small><br>${action('add-hypothesis', '仮説をボードに置く', 'plus', 'btn small', String(i))}</article>`).join('')}${generated.length ? action('variant', '違う組み合わせ方を試す', 'shuffle', 'btn small full') : ''}<div class="lab-tip"><h3>${ico('spark')}「面白さ」を、ひとつの問いに。</h3><p>何をする？ 何を迷う？ 何が変わる？<br>短いプレイ例を書けたら、10秒の試作で確かめよう。</p></div>${s.workspace.recipes.length ? `<div class="panel-divider"></div><span class="field-label">保存した組み合わせ</span>${s.workspace.recipes.slice(0, 15).map(r => `<button class="recipe-row" data-action="recipe" data-id="${esc(r.id)}">${esc(r.title)}</button>`).join('')}` : ''}`}</div></aside>`; }
function renderPortable() {
    if (gesture) {
        const w = portableRoot.querySelector<HTMLElement>('.canvas-world');
        const b = portableStore.board();
        if (w) {
            w.style.transform = `translate(${b.viewport.x}px,${b.viewport.y}px) scale(${b.viewport.zoom})`;
            if (gesture.mode === 'node')
                for (const n of b.nodes) {
                    const el = [...w.querySelectorAll<HTMLElement>('[data-node]')].find(x => x.dataset.node === n.id);
                    if (el) {
                        el.style.left = n.position.x + 'px';
                        el.style.top = n.position.y + 'px';
                    }
                }
        }
        return;
    }
    const s = pstate();
    if (tagSignature(s) !== generatingSignature) {
        generated = [];
        generatingSignature = tagSignature(s);
    }
    const f = readFocus();
    const positions = [...portableRoot.querySelectorAll<HTMLElement>('.library-list,.lab-content,.ribbon')].map(e => ({ cls: e.className, top: e.scrollTop, left: e.scrollLeft }));
    const b = portableStore.board();
    portableRoot.innerHTML = `<div class="app">${renderHeader()}${renderRibbon()}<main class="workspace ${s.mobilePanel === 'library' ? 'show-library' : ''} ${s.mobilePanel === 'lab' ? 'show-lab' : ''}">${renderLibrary()}${renderBoard()}${renderLab()}</main><footer class="board-footer"><span>${b.nodes.length} カード · ${b.edges.length} 接続</span><span class="footer-help">Shift + クリックで複数選択 · 中ボタンドラッグで移動 · Ctrl/⌘ + スクロールで拡大</span><span class="right">LOCAL-FIRST &nbsp; / &nbsp; MIT © 2026 ks250206</span></footer>${s.toast ? `<div class="toast" role="status">${esc(s.toast)}</div>` : ''}<input id="import-file" type="file" accept=".json,application/json" hidden/></div>`;
    for (const p of positions) {
        const el = portableRoot.querySelector<HTMLElement>('.' + p.cls.split(' ')[0]);
        if (el) {
            el.scrollTop = p.top;
            el.scrollLeft = p.left;
        }
    }
    restoreFocus(f);
    if (s.toast && s.toast !== lastToast) {
        lastToast = s.toast;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { lastToast = ''; portableStore.ui({ toast: '' }); }, 5000);
    }
}
function downloadFile(name: string, text: string, type: string) { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function canvasCenter(): Position { const el = portableRoot.querySelector('.canvas')!; const r = el.getBoundingClientRect(), v = portableStore.board().viewport; return { x: (r.width / 2 - v.x) / v.zoom - 100, y: (r.height / 2 - v.y) / v.zoom - 65 }; }
function zoomBy(factor: number, point?: Position) { const el = portableRoot.querySelector('.canvas')!; const r = el.getBoundingClientRect(), v = portableStore.board().viewport; const p = point ?? { x: r.width / 2, y: r.height / 2 }; const zoom = Math.max(.15, Math.min(2.5, v.zoom * factor)); portableStore.setViewport({ x: p.x - (p.x - v.x) * zoom / v.zoom, y: p.y - (p.y - v.y) * zoom / v.zoom, zoom }); }
function fitPortable() { const b = portableStore.board(), bb = bounds(b.nodes.filter(n => n.type !== 'frame')); const el = portableRoot.querySelector('.canvas')!; const r = el.getBoundingClientRect(); const zoom = Math.min(1.1, Math.max(.15, Math.min((r.width - 90) / (bb.width + 30), (r.height - 70) / (bb.height + 30)))); portableStore.setViewport({ x: (r.width - bb.width * zoom) / 2 - bb.x * zoom, y: (r.height - bb.height * zoom) / 2 - bb.y * zoom, zoom }); }
function showHelp() { const d = document.createElement('dialog'); d.className = 'help-native'; d.innerHTML = `<button class="icon-btn help-close" aria-label="閉じる">${ico('x')}</button><div class="section-eyebrow">GAME BRAINSTORMER / PORTABLE</div><h2>まだない遊びを、組み合わせから。</h2><h3>素材 → 関係 → 仮説 → 試作</h3><p>分類リボンからタグ・メカニクスを探し、＋またはドラッグで配置します。素材名をクリックするとラボに入り、操作・制約・時間などをずらした問いを提案します。自動で面白さを判定する機能ではありません。</p><h3>ホワイトボード</h3><p>カードはドラッグで移動、Shift + クリック／空白のドラッグで複数選択。ダブルクリックで編集。接続ツールで2枚を順にクリックして関係を作ります。フレームは視覚的な囲みで、子カードを一緒には移動しません。</p><p>V：選択 / H：移動 / N：付箋 / Delete：削除<br>Ctrl/⌘ Z：Undo / Ctrl/⌘ Shift Z：Redo / Ctrl/⌘ D：複製<br>中ボタンドラッグ：パン / Ctrl/⌘ + ホイール：ズーム</p><h3>データと保存</h3><p>Steamタグ429件・書籍目次のメカニクス203件・過去の融合案500件・企画例45件。タグは意味に基づく編集分類で、埋め込みモデルの自動クラスタリングではありません。順位は2026-10-11の既存データのタグ適用頻度であり、売上順位ではありません。書籍本文の転載ではありません。</p><p>ブラウザ内に自動保存します。JSONを定期的に書き出してください。読み込みは既存ボードを残して追加します。同時編集・クラウド同期はありません。</p><h3>2つの実行形式</h3><p>この単体HTML版は外部通信せずDOM/SVGで動作します。リポジトリのメイン実装はReact 19 + Astryx + React Flow + Vite PlusのSSGアプリです。</p>`; document.body.appendChild(d); d.querySelector('button')!.addEventListener('click', () => d.close()); d.addEventListener('close', () => d.remove()); d.showModal(); }
function runReaction(next = false) { const s = pstate(); if (next)
    portableStore.ui({ variant: s.variant + 1 }); const current = pstate(); generated = makeHypotheses(CATALOG_DATA, current.tray, current.baseId, current.operator, current.variant); generatingSignature = tagSignature(current); renderPortable(); if (generated.length) {
    const el = portableRoot.querySelector('.hypothesis-card');
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
} }
function portPick(id: string) { if (pendingConnection && pendingConnection !== id) {
    portableStore.connect(pendingConnection, id);
    pendingConnection = null;
    portableStore.ui({ tool: 'select', selected: [], toast: '関係をつなぎました' });
}
else {
    pendingConnection = id;
    portableStore.ui({ tool: 'connect', selected: [id], toast: '接続するもう1枚をクリックしてください' });
} }
portableRoot.addEventListener('click', e => {
    const el = (e.target as Element).closest<HTMLElement>('[data-action]');
    if (!el || el.hasAttribute('disabled'))
        return;
    const id = el.dataset.id ?? '', s = pstate();
    switch (el.dataset.action) {
        case 'tab':
            portableStore.ui({ tab: id as UIState['tab'], query: '', chapter: '' });
            break;
        case 'cluster':
            portableStore.ui({ cluster: id, query: '', mobilePanel: innerWidth < 700 ? 'library' : s.mobilePanel });
            break;
        case 'clear-filter':
            portableStore.ui({ cluster: 'all', chapter: '' });
            break;
        case 'toggle-material':
            portableStore.toggleTray(id);
            break;
        case 'add-material':
            portableStore.addMaterial(id, canvasCenter());
            break;
        case 'favorite':
            portableStore.favorite(id);
            break;
        case 'concept':
            portableStore.addConcept(id);
            fitPortable();
            break;
        case 'panel':
            portableStore.ui({ panel: id as 'lab' | 'inspect' });
            break;
        case 'mobile':
            portableStore.ui({ mobilePanel: id as UIState['mobilePanel'] });
            break;
        case 'open-lab':
            portableStore.ui({ panel: 'lab', mobilePanel: 'lab' });
            break;
        case 'mix-selected':
            portableStore.mixSelected();
            break;
        case 'operator':
            portableStore.ui({ operator: id as Operator, variant: 0 });
            break;
        case 'clear-tray':
            portableStore.setTray([]);
            break;
        case 'save-recipe':
            portableStore.saveRecipe();
            break;
        case 'recipe':
            portableStore.restoreRecipe(id);
            break;
        case 'discover': {
            const next = discover(CATALOG_DATA, s.tray, s.baseId, s.variant + 1);
            portableStore.setTray([s.baseId, ...next]);
            portableStore.ui({ variant: s.variant + 1 });
            break;
        }
        case 'react':
            runReaction();
            break;
        case 'variant':
            runReaction(true);
            break;
        case 'add-hypothesis':
            if (generated[Number(id)]) {
                portableStore.addIdea(generated[Number(id)]!);
                fitPortable();
            }
            break;
        case 'tool':
            pendingConnection = null;
            portableStore.ui({ tool: id as UIState['tool'], ...(id === 'connect' ? { selected: [] } : {}) });
            break;
        case 'note':
            portableStore.addNote(canvasCenter());
            break;
        case 'duplicate':
            portableStore.duplicateSelected();
            break;
        case 'delete':
            portableStore.deleteSelected();
            break;
        case 'frame':
            portableStore.frameSelection();
            break;
        case 'arrange':
            portableStore.arrange();
            fitPortable();
            break;
        case 'undo':
            portableStore.undo();
            break;
        case 'redo':
            portableStore.redo();
            break;
        case 'fit':
            fitPortable();
            break;
        case 'zoom-in':
            zoomBy(1.2);
            break;
        case 'zoom-out':
            zoomBy(1 / 1.2);
            break;
        case 'new-board':
            portableStore.newBoard();
            break;
        case 'rename': {
            const title = prompt('ボード名', portableStore.board().title);
            if (title)
                portableStore.renameBoard(title);
            break;
        }
        case 'export-json':
            downloadFile('game-brainstormer.workspace.json', JSON.stringify(s.workspace, null, 2), 'application/json');
            break;
        case 'export-md':
            downloadFile('game-ideas.md', toMarkdown(portableStore.board(), CATALOG_DATA), 'text/markdown;charset=utf-8');
            break;
        case 'export-svg':
            downloadFile('game-board.svg', toSvg(portableStore.board()), 'image/svg+xml;charset=utf-8');
            break;
        case 'import':
            (document.getElementById('import-file') as HTMLInputElement).click();
            break;
        case 'help':
            showHelp();
            break;
    }
});
portableRoot.addEventListener('input', e => { const el = e.target as HTMLInputElement; if (el.dataset.bind === 'query')
    portableStore.ui({ query: el.value }); });
portableRoot.addEventListener('change', async (e) => {
    const el = e.target as HTMLInputElement;
    const bind = el.dataset.bind, id = el.dataset.id;
    if (el.id === 'import-file') {
        try {
            const f = el.files?.[0];
            if (!f)
                return;
            if (f.size > MAX_IMPORT_BYTES)
                throw Error('5MB以下のJSONを選んでください。');
            portableStore.import(await f.text());
            fitPortable();
        }
        catch (err) {
            portableStore.ui({ toast: err instanceof Error ? err.message : '読み込みに失敗しました' });
        }
        return;
    }
    if (bind === 'board')
        portableStore.switchBoard(el.value);
    else if (bind === 'chapter')
        portableStore.ui({ chapter: el.value });
    else if (bind === 'base')
        portableStore.ui({ baseId: el.value });
    else if (bind === 'edge' && id)
        portableStore.patchEdge(id, el.value);
    else if (id && bind) {
        const n = portableStore.board().nodes.find(x => x.id === id);
        if (!n)
            return;
        if (bind === 'node-title')
            portableStore.patchNode(id, { title: el.value.slice(0, 300), ...(n.data.hypothesis ? { hypothesis: { ...n.data.hypothesis, title: el.value.slice(0, 300) } } : {}) });
        else if (bind === 'node-body')
            portableStore.patchNode(id, { body: el.value.slice(0, 8000), ...(n.data.hypothesis ? { hypothesis: { ...n.data.hypothesis, rule: el.value.slice(0, 8000) } } : {}) });
        else if (bind === 'node-status')
            portableStore.patchNode(id, { status: el.value as 'seed' });
        else if (bind.startsWith('hyp-') && n.data.hypothesis)
            portableStore.patchNode(id, { hypothesis: { ...n.data.hypothesis, [bind.slice(4)]: el.value.slice(0, 8000) } });
        else if (bind.startsWith('rating-'))
            portableStore.patchNode(id, { ratings: { clarity: 0, novelty: 0, feasibility: 0, ...n.data.ratings, [bind.slice(7)]: Number(el.value) } });
    }
});
portableRoot.addEventListener('dblclick', e => { const el = (e.target as Element).closest<HTMLElement>('[data-node]'); if (el)
    portableStore.ui({ selected: [el.dataset.node!], selectedEdge: null, panel: 'inspect', mobilePanel: innerWidth < 1000 ? 'lab' : pstate().mobilePanel }); });
portableRoot.addEventListener('dragstart', e => { const el = (e.target as Element).closest<HTMLElement>('[data-material]'); if (el && e.dataTransfer) {
    e.dataTransfer.setData('application/game-brainstormer-material', el.dataset.material!);
    e.dataTransfer.effectAllowed = 'copy';
} });
portableRoot.addEventListener('dragover', e => { if ((e.target as Element).closest('.canvas')) {
    e.preventDefault();
    if (e.dataTransfer)
        e.dataTransfer.dropEffect = 'copy';
} });
portableRoot.addEventListener('drop', e => { const canvas = (e.target as Element).closest('.canvas'); if (!canvas)
    return; e.preventDefault(); const id = e.dataTransfer?.getData('application/game-brainstormer-material'); if (!id || !material(CATALOG_DATA, id))
    return; const r = canvas.getBoundingClientRect(), v = portableStore.board().viewport; portableStore.addMaterial(id, { x: (e.clientX - r.left - v.x) / v.zoom, y: (e.clientY - r.top - v.y) / v.zoom }); });
portableRoot.addEventListener('pointerdown', e => {
    const target = e.target as Element, canvas = target.closest('.canvas');
    if (!canvas)
        return;
    const port = target.closest<HTMLElement>('[data-port]');
    if (port) {
        e.preventDefault();
        portPick(port.dataset.port!);
        return;
    }
    const edge = target.closest<SVGElement>('[data-edge]');
    if (edge) {
        portableStore.ui({ selected: [], selectedEdge: edge.dataset.edge!, panel: 'inspect' });
        return;
    }
    const card = target.closest<HTMLElement>('[data-node]'), s = pstate(), v = portableStore.board().viewport;
    if (s.tool === 'connect' && card) {
        e.preventDefault();
        portPick(card.dataset.node!);
        return;
    }
    if (e.button !== 0 && e.button !== 1)
        return;
    const pan = s.tool === 'pan' || e.button === 1;
    e.preventDefault();
    if (card && !pan) {
        const id = card.dataset.node!;
        const now = performance.now();
        if (lastCardClick.id === id && now - lastCardClick.time < 350) {
            lastCardClick = { id: '', time: 0 };
            portableStore.ui({ selected: [id], selectedEdge: null, panel: 'inspect', mobilePanel: innerWidth < 1000 ? 'lab' : s.mobilePanel });
            return;
        }
        lastCardClick = { id, time: now };
        if (e.shiftKey)
            portableStore.select(id, true);
        else if (!s.selected.includes(id))
            portableStore.select(id);
        const ss = pstate();
        const positions = Object.fromEntries(portableStore.board().nodes.filter(n => ss.selected.includes(n.id)).map(n => [n.id, { ...n.position }]));
        portableStore.beginGesture();
        gesture = { mode: 'node', x: e.clientX, y: e.clientY, origin: { x: v.x, y: v.y }, zoom: v.zoom, positions, moved: false, add: false, selection: [] };
    }
    else if (pan) {
        gesture = { mode: 'pan', x: e.clientX, y: e.clientY, origin: { x: v.x, y: v.y }, zoom: v.zoom, positions: {}, moved: false, add: false, selection: [] };
    }
    else {
        const r = canvas.getBoundingClientRect();
        gesture = { mode: 'box', x: e.clientX, y: e.clientY, origin: { x: e.clientX - r.left, y: e.clientY - r.top }, zoom: v.zoom, positions: {}, moved: false, add: e.shiftKey, selection: e.shiftKey ? [...s.selected] : [] };
        if (!e.shiftKey)
            portableStore.ui({ selected: [], selectedEdge: null });
    }
});
window.addEventListener('pointermove', e => {
    if (!gesture)
        return;
    const g = gesture, dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (Math.hypot(dx, dy) < 3 && !g.moved)
        return;
    g.moved = true;
    if (g.mode === 'node') {
        portableStore.moveNodes(Object.fromEntries(Object.entries(g.positions).map(([id, p]) => [id, { x: p.x + dx / g.zoom, y: p.y + dy / g.zoom }])));
    }
    else if (g.mode === 'pan')
        portableStore.setViewport({ x: g.origin.x + dx, y: g.origin.y + dy, zoom: g.zoom });
    else {
        boxRect = { x: Math.min(g.origin.x, g.origin.x + dx), y: Math.min(g.origin.y, g.origin.y + dy), w: Math.abs(dx), h: Math.abs(dy) };
        let box = portableRoot.querySelector<HTMLElement>('.portable-selection');
        if (!box) {
            box = document.createElement('div');
            box.className = 'portable-selection';
            portableRoot.querySelector('.canvas')!.appendChild(box);
        }
        Object.assign(box.style, { left: boxRect.x + 'px', top: boxRect.y + 'px', width: boxRect.w + 'px', height: boxRect.h + 'px' });
    }
});
function endPortableGesture() { if (!gesture)
    return; const g = gesture; gesture = null; if (g.mode === 'node')
    portableStore.endGesture(); if (g.mode === 'box') {
    const v = portableStore.board().viewport;
    const selected = boxRect && g.moved ? portableStore.board().nodes.filter(n => { const x = n.position.x * v.zoom + v.x, y = n.position.y * v.zoom + v.y; return n.type !== 'frame' && x + n.width * v.zoom >= boxRect!.x && x <= boxRect!.x + boxRect!.w && y + n.height * v.zoom >= boxRect!.y && y <= boxRect!.y + boxRect!.h; }).map(n => n.id) : [];
    portableStore.ui({ selected: [...new Set([...g.selection, ...selected])], selectedEdge: null });
} boxRect = null; renderPortable(); }
window.addEventListener('pointerup', endPortableGesture);
window.addEventListener('pointercancel', endPortableGesture);
portableRoot.addEventListener('wheel', e => { const canvas = (e.target as Element).closest('.canvas'); if (!canvas)
    return; e.preventDefault(); const r = canvas.getBoundingClientRect(); if (e.ctrlKey || e.metaKey)
    zoomBy(Math.exp(-e.deltaY * .004), { x: e.clientX - r.left, y: e.clientY - r.top });
else {
    const v = portableStore.board().viewport;
    portableStore.setViewport({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
} }, { passive: false });
window.addEventListener('keydown', e => { const el = e.target as Element; if (el.closest('input,textarea,select,[contenteditable],dialog'))
    return; const mod = e.ctrlKey || e.metaKey, key = e.key.toLowerCase(); if (mod && key === 'z') {
    e.preventDefault();
    e.shiftKey ? portableStore.redo() : portableStore.undo();
}
else if (mod && key === 'y') {
    e.preventDefault();
    portableStore.redo();
}
else if (mod && key === 'd') {
    e.preventDefault();
    portableStore.duplicateSelected();
}
else if (mod && key === 'a') {
    e.preventDefault();
    portableStore.ui({ selected: portableStore.board().nodes.filter(n => n.type !== 'frame').map(n => n.id) });
}
else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    portableStore.deleteSelected();
}
else if (!mod && key === 'n') {
    e.preventDefault();
    portableStore.addNote(canvasCenter());
}
else if (!mod && key === 'v')
    portableStore.ui({ tool: 'select' });
else if (!mod && key === 'h')
    portableStore.ui({ tool: 'pan' });
else if (e.key === 'Escape') {
    pendingConnection = null;
    portableStore.ui({ selected: [], selectedEdge: null, mobilePanel: 'none', tool: 'select' });
} });
try {
    portableStore.restore(localStorage);
}
catch (err) {
    blockedStorage = true;
    const denied = err instanceof DOMException && err.name === 'SecurityError';
    storageStatus = denied ? 'JSONで保存' : '保存の読込に失敗';
    portableStore.ui({ toast: denied ? 'このプレビューではブラウザ保存が制限されています。JSONで保存できます。' : '既存の保存データを保護しています。JSONを書き出し、ブラウザの保存領域を確認してください。' });
}
lastWorkspace = pstate().workspace;
portableStore.subscribe(() => { const w = pstate().workspace; if (w !== lastWorkspace) {
    lastWorkspace = w;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { if (blockedStorage)
        return; try {
        portableStore.persist(localStorage);
        storageStatus = 'このブラウザに保存';
    }
    catch {
        storageStatus = '保存できません・JSONを書き出してください';
        blockedStorage = true;
    } const label = portableRoot.querySelector('.save-status'); if (label) {
        label.innerHTML = `<span class="save-dot"></span>${esc(storageStatus)}`;
        label.classList.toggle('error', blockedStorage);
    } }, 200);
} renderPortable(); });
window.addEventListener('pagehide', () => { if (!blockedStorage)
    try {
        portableStore.persist(localStorage);
    }
    catch { /* Export remains available. */ } });
renderPortable();
