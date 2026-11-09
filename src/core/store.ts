import type { Board, BoardNode, Catalog, Hypothesis, PlayPoint, Position, UIState, Viewport, Workspace } from './types.ts';
import { uid, clone, initialWorkspace, blankBoard, makeMaterialNode, makeIdeaNode, material, bounds, parseWorkspace, STORAGE_KEY } from './engine.ts';
export class WorkbenchStore {
    private state: UIState;
    private listeners = new Set<() => void>();
    private past: Workspace[] = [];
    private future: Workspace[] = [];
    private gesture: Workspace | null = null;
    readonly catalog: Catalog;
    constructor(catalog: Catalog) { this.catalog = catalog; const workspace = initialWorkspace(catalog); const ids = workspace.boards[0]!.nodes.flatMap(n => n.data.materialId ? [n.data.materialId] : []); this.state = { workspace, selected: [], selectedEdge: null, tray: ids, baseId: ids[0]!, operator: 'translate', variant: 0, tab: 'tag', cluster: 'action', query: '', chapter: '', tool: 'select', panel: 'lab', mobilePanel: 'none', toast: '', canUndo: false, canRedo: false }; }
    getSnapshot = (): UIState => this.state;
    subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
    private emit() { this.state = { ...this.state, canUndo: this.past.length > 0, canRedo: this.future.length > 0 }; for (const l of this.listeners)
        l(); }
    ui(patch: Partial<Omit<UIState, 'workspace' | 'canUndo' | 'canRedo'>>) { this.state = { ...this.state, ...patch }; this.emit(); }
    board(): Board { return this.state.workspace.boards.find(b => b.id === this.state.workspace.activeBoardId)!; }
    private history() { this.past.push(clone(this.state.workspace)); if (this.past.length > 50)
        this.past.shift(); this.future = []; }
    commit(workspace: Workspace, record = true) { if (record)
        this.history(); this.state = { ...this.state, workspace }; this.emit(); }
    updateBoard(update: (b: Board) => Board, record = true) { const old = this.board(); const next = { ...update(clone(old)), updatedAt: new Date().toISOString() }; this.commit({ ...this.state.workspace, boards: this.state.workspace.boards.map(b => b.id === old.id ? next : b) }, record); }
    undo() { const w = this.past.pop(); if (!w)
        return; this.future.push(clone(this.state.workspace)); this.state = { ...this.state, workspace: w, selected: [], selectedEdge: null }; this.emit(); }
    redo() { const w = this.future.pop(); if (!w)
        return; this.past.push(clone(this.state.workspace)); this.state = { ...this.state, workspace: w, selected: [], selectedEdge: null }; this.emit(); }
    beginGesture() { if (!this.gesture)
        this.gesture = clone(this.state.workspace); }
    endGesture() { if (this.gesture && JSON.stringify(this.gesture.boards) !== JSON.stringify(this.state.workspace.boards)) {
        this.past.push(this.gesture);
        if (this.past.length > 50)
            this.past.shift();
        this.future = [];
    } this.gesture = null; this.emit(); }
    addMaterial(id: string, position?: Position) { const n = makeMaterialNode(this.catalog, id, position ?? { x: 80 + (this.board().nodes.length % 4) * 55, y: 120 + (this.board().nodes.length % 5) * 55 }); this.updateBoard(b => ({ ...b, nodes: [...b.nodes, n] })); this.ui({ selected: [n.id], selectedEdge: null }); return n.id; }
    addNote(position: Position = { x: 250, y: 180 }) { const n: BoardNode = { id: uid('note'), type: 'note', position, width: 270, height: 170, data: { title: 'ひとつの問い', body: 'この組み合わせで、プレイヤーの選択はどう変わる？', tone: 'yellow' } }; this.updateBoard(b => ({ ...b, nodes: [...b.nodes, n] })); this.ui({ selected: [n.id], selectedEdge: null, panel: 'inspect' }); }
    addIdea(h: Hypothesis, position?: Position) { const b = this.board(), bb = bounds(b.nodes.filter(n => n.type !== 'frame')); const n = makeIdeaNode(h, position ?? { x: bb.x + bb.width + 100, y: bb.y + 50 }); const sources = b.nodes.filter(x => x.data.materialId && h.materials.includes(x.data.materialId)); this.updateBoard(b => ({ ...b, nodes: [...b.nodes, n], edges: [...b.edges, ...sources.map(s => ({ id: uid('edge'), source: s.id, target: n.id, label: '素材にする' }))] })); this.ui({ selected: [n.id], selectedEdge: null, panel: 'inspect', toast: '仮説をボードに追加しました' }); return n.id; }
    addConcept(id: string) { const c = this.catalog.concepts.find(x => x.id === id); if (!c)
        return; const bb = bounds(this.board().nodes); const baseId = this.catalog.materials.find(m => m.label === 'Precision Platformer')!.id; const hs: Hypothesis = { ...c, operator: 'translate', origin: '既存のブレスト例（精密プラットフォーマー向け）', baseId, question: c.novelty }; const x = bb.x + bb.width + 110, y = bb.y; const ns = c.materials.map((mid, i) => makeMaterialNode(this.catalog, mid, { x: x + Math.floor(i / 3) * 275, y: y + (i % 3) * 170 })); const idea = makeIdeaNode(hs, { x: x + Math.ceil(ns.length / 3) * 275 + 30, y: y + 80 }); this.updateBoard(b => ({ ...b, nodes: [...b.nodes, ...ns, idea], edges: [...b.edges, ...ns.map(s => ({ id: uid('edge'), source: s.id, target: idea.id, label: '融合する' }))] })); this.ui({ selected: [idea.id], panel: 'inspect', selectedEdge: null, toast: '先行ブレストを展開しました' }); }
    patchNode(id: string, patch: Partial<BoardNode['data']>) { this.updateBoard(b => ({ ...b, nodes: b.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n) })); }
    /** Pin an idea/note card on the Caillois map, or pass null to return to the derived position. */
    pinPlay(id: string, point: PlayPoint | null) { const n = this.board().nodes.find(x => x.id === id); if (!n || (n.type !== 'idea' && n.type !== 'note'))
        return; this.updateBoard(b => ({ ...b, nodes: b.nodes.map(x => { if (x.id !== id)
            return x; const data = { ...x.data }; if (point)
            data.play = { x: Math.max(-1, Math.min(1, point.x)), y: Math.max(-1, Math.min(1, point.y)) };
        else
            delete data.play; return { ...x, data }; }) })); }
    moveNodes(positions: Record<string, Position>) { this.updateBoard(b => ({ ...b, nodes: b.nodes.map(n => positions[n.id] ? { ...n, position: positions[n.id]! } : n) }), false); }
    setViewport(viewport: Viewport) { this.updateBoard(b => ({ ...b, viewport }), false); }
    select(id: string, add = false) { const prev = this.state.selected; this.ui({ selected: add ? (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) : [id], selectedEdge: null }); }
    connect(source: string, target: string) { const b = this.board(); if (source === target || !b.nodes.some(n => n.id === source) || !b.nodes.some(n => n.id === target) || b.edges.some(e => e.source === source && e.target === target))
        return; this.updateBoard(b => ({ ...b, edges: [...b.edges, { id: uid('edge'), source, target, label: '関係' }] })); }
    patchEdge(id: string, label: string) { this.updateBoard(b => ({ ...b, edges: b.edges.map(e => e.id === id ? { ...e, label: label.slice(0, 200) } : e) })); }
    deleteSelected() { const ids = this.state.selected, eid = this.state.selectedEdge; if (!ids.length && !eid)
        return; this.updateBoard(b => ({ ...b, nodes: b.nodes.filter(n => !ids.includes(n.id)), edges: b.edges.filter(e => e.id !== eid && !ids.includes(e.source) && !ids.includes(e.target)) })); this.ui({ selected: [], selectedEdge: null }); }
    duplicateSelected() { const selection = this.board().nodes.filter(n => this.state.selected.includes(n.id)); if (!selection.length)
        return; const remap = new Map(selection.map(n => [n.id, uid(n.type)])); const ns = selection.map(n => ({ ...clone(n), id: remap.get(n.id)!, position: { x: n.position.x + 50, y: n.position.y + 50 } })); const es = this.board().edges.filter(e => remap.has(e.source) && remap.has(e.target)).map(e => ({ ...e, id: uid('edge'), source: remap.get(e.source)!, target: remap.get(e.target)! })); this.updateBoard(b => ({ ...b, nodes: [...b.nodes, ...ns], edges: [...b.edges, ...es] })); this.ui({ selected: ns.map(n => n.id) }); }
    frameSelection() { const ns = this.board().nodes.filter(n => this.state.selected.includes(n.id) && n.type !== 'frame'); if (!ns.length) {
        this.ui({ toast: '囲むカードを先に選択してください' });
        return;
    } const bb = bounds(ns); const n: BoardNode = { id: uid('frame'), type: 'frame', position: { x: bb.x - 30, y: bb.y - 55 }, width: bb.width + 60, height: bb.height + 85, data: { title: '実験グループ', body: '', tone: 'blue' } }; this.updateBoard(b => ({ ...b, nodes: [n, ...b.nodes] })); this.ui({ selected: [n.id], panel: 'inspect' }); }
    arrange() { this.updateBoard(b => { let i = 0; return { ...b, nodes: b.nodes.map(n => n.type === 'frame' ? n : { ...n, position: { x: 60 + (i % 3) * 360, y: 60 + Math.floor(i++ / 3) * 370 } }) }; }); }
    mixSelected() { const ids = this.board().nodes.filter(n => this.state.selected.includes(n.id)).flatMap(n => n.data.materialId ? [n.data.materialId] : (n.data.hypothesis?.materials ?? [])); this.setTray([...this.state.tray, ...ids]); this.ui({ panel: 'lab', mobilePanel: 'lab' }); }
    setTray(ids: string[]) { this.ui({ tray: [...new Set(ids)].filter(id => material(this.catalog, id)).slice(0, 12), variant: 0 }); }
    toggleTray(id: string) { this.setTray(this.state.tray.includes(id) ? this.state.tray.filter(x => x !== id) : [...this.state.tray, id]); }
    favorite(id: string) { const f = this.state.workspace.favorites; this.commit({ ...this.state.workspace, favorites: f.includes(id) ? f.filter(x => x !== id) : [...f, id] }, false); }
    saveRecipe() { if (!this.state.tray.length)
        return; const r = { id: uid('recipe'), title: this.state.tray.map(id => material(this.catalog, id)?.label).join(' × ').slice(0, 300), materials: [...this.state.tray], operator: this.state.operator, baseId: this.state.baseId }; this.commit({ ...this.state.workspace, recipes: [r, ...this.state.workspace.recipes].slice(0, 200) }); this.ui({ toast: '組み合わせを保存しました' }); }
    restoreRecipe(id: string) { const r = this.state.workspace.recipes.find(x => x.id === id); if (r)
        this.ui({ tray: r.materials, operator: r.operator, baseId: r.baseId, panel: 'lab', variant: 0 }); }
    newBoard(title = '新しい実験') { const b = blankBoard(title); this.commit({ ...this.state.workspace, boards: [...this.state.workspace.boards, b], activeBoardId: b.id }); this.ui({ selected: [], selectedEdge: null, tray: [], panel: 'lab' }); }
    switchBoard(id: string) { if (!this.state.workspace.boards.some(b => b.id === id))
        return; this.commit({ ...this.state.workspace, activeBoardId: id }, false); this.ui({ selected: [], selectedEdge: null }); }
    renameBoard(title: string) { if (title.trim())
        this.updateBoard(b => ({ ...b, title: title.trim().slice(0, 300) })); }
    import(json: string) { const w = parseWorkspace(json, this.catalog); const boardIds = new Map(w.boards.map(b => [b.id, uid('import')])); const boards = w.boards.map(b => ({ ...b, id: boardIds.get(b.id)! })); if (this.state.workspace.boards.length + boards.length > 40)
        throw new Error('ボードは40件までです。'); this.commit({ ...this.state.workspace, boards: [...this.state.workspace.boards, ...boards], activeBoardId: boardIds.get(w.activeBoardId)!, favorites: [...new Set([...this.state.workspace.favorites, ...w.favorites])], recipes: [...this.state.workspace.recipes, ...w.recipes.map(r => ({ ...r, id: uid('recipe') }))].slice(0, 200) }); this.ui({ selected: [], selectedEdge: null, toast: '元のボードを残して読み込みました' }); }
    restore(storage: Pick<Storage, 'getItem'>) { const json = storage.getItem(STORAGE_KEY); if (!json)
        return; const w = parseWorkspace(json, this.catalog); this.commit(w, false); this.past = []; this.future = []; this.emit(); }
    persist(storage: Pick<Storage, 'setItem'>) { storage.setItem(STORAGE_KEY, JSON.stringify(this.state.workspace)); }
}
