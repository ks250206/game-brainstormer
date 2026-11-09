import { memo, useState, useRef } from 'react';
import { ReactFlow, ReactFlowProvider, Handle, Position, MiniMap, SelectionMode, type Node, type NodeProps, type NodeChange, type ReactFlowInstance } from '@xyflow/react';
import type { BoardNode, NodeKind, Position as Point } from '../core/types.ts';
import { material } from '../core/engine.ts';
import { useWorkbench } from './context.tsx';
import { Icon } from './Icons.tsx';
type CardData = BoardNode['data'] & {
    kind: NodeKind;
} & Record<string, unknown>;
type FlowNode = Node<CardData, 'card'>;
const STATUSES: Record<string, string> = { seed: '仮説の種', testing: '試作中', promising: '有望', parked: '保留' };
const FlowCard = memo(function FlowCard({ data, selected }: NodeProps<FlowNode>) {
    const { catalog } = useWorkbench();
    const m = data.materialId ? material(catalog, data.materialId) : undefined;
    return <article className={`board-node node-${data.kind} ${data.tone} ${selected ? 'selected' : ''}`}>
  {data.kind !== 'frame' && <Handle type="target" position={Position.Left}/>}
  {data.kind === 'frame' ? <div className="node-title">{data.title}</div> : <>
   <div className="node-eyebrow"><Icon name={data.kind === 'material' ? (m?.kind === 'tag' ? 'tag' : 'book') : data.kind === 'idea' ? 'spark' : 'note'}/>{data.kind === 'material' ? (m?.kind === 'tag' ? 'STEAM TAG' : m?.id) : data.kind === 'idea' ? 'WORKING HYPOTHESIS' : 'LAB NOTE'}</div>
   <div className="node-title">{data.title}</div><div className="node-description">{data.body}</div>
   {data.kind === 'idea' && <><div className="node-divider"/><div className="node-foot"><span className={`status-pill ${data.status}`}><span className="status-dot"/>{STATUSES[data.status ?? 'seed']}</span><span>ダブルクリックで編集 ↗</span></div></>}
  </>}
  {data.kind !== 'frame' && <Handle type="source" position={Position.Right}/>}
 </article>;
});
const nodeTypes = { card: FlowCard };
function Tool({ name, label, onClick, active = false, disabled = false, secondary = false }: {
    name: string;
    label: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    secondary?: boolean;
}) { return <button className={`icon-btn ${active ? 'active' : ''} ${secondary ? 'secondary-tool' : ''}`} aria-label={label} title={label} onClick={onClick} disabled={disabled}><Icon name={name}/></button>; }
function BoardInner() {
    const { store, state, board } = useWorkbench();
    const [flow, setFlow] = useState<ReactFlowInstance<FlowNode> | null>(null);
    const connecting = useRef<string | null>(null);
    const nodes: FlowNode[] = board.nodes.map(n => ({ id: n.id, type: 'card', position: n.position, data: { ...n.data, kind: n.type }, width: n.width, height: n.height, style: { width: n.width, height: n.height }, selected: state.selected.includes(n.id), zIndex: n.type === 'frame' ? 0 : 1 }));
    const edges = board.edges.map(e => ({ ...e, selected: e.id === state.selectedEdge, type: 'smoothstep', labelStyle: { fontSize: 10 }, labelBgPadding: [6, 4] as [
            number,
            number
        ], labelBgBorderRadius: 5 }));
    function center(): Point { const rect = document.querySelector('.react-flow-host')?.getBoundingClientRect(); return rect && flow ? flow.screenToFlowPosition({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }) : { x: 200, y: 150 }; }
    function changes(changes: NodeChange<FlowNode>[]) { const positions: Record<string, Point> = {}; let selected = [...state.selected]; for (const c of changes) {
        if (c.type === 'position' && c.position)
            positions[c.id] = c.position;
        if (c.type === 'select')
            selected = c.selected ? [...new Set([...selected, c.id])] : selected.filter(x => x !== c.id);
    } if (Object.keys(positions).length)
        store.moveNodes(positions); if (JSON.stringify(selected) !== JSON.stringify(state.selected))
        store.ui({ selected }); }
    return <section className="board-area" aria-label="ブレストのホワイトボード">
  <div className="canvas-heading"><div className="eyebrow">YOUR NEXT GAME STARTS HERE</div><h1>つないで、ずらして、化学反応を。</h1></div><div className="board-chip">無限キャンバス · ローカル保存</div>
  <nav className="mobile-nav" aria-label="パネル切り替え"><button onClick={() => store.ui({ mobilePanel: state.mobilePanel === 'library' ? 'none' : 'library' })}>素材</button><button onClick={() => store.ui({ mobilePanel: 'none' })}>ボード</button><button onClick={() => store.ui({ mobilePanel: state.mobilePanel === 'lab' ? 'none' : 'lab' })}>ラボ</button></nav>
  <div className="react-flow-host" onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }} onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('application/game-brainstormer-material'); if (id && flow) {
        try {
            store.addMaterial(id, flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }));
        }
        catch { /* Invalid foreign drag payload is ignored. */ }
    } }}>
  <ReactFlow<FlowNode> key={board.id} nodes={nodes} edges={edges} nodeTypes={nodeTypes} viewport={board.viewport} onInit={setFlow} onNodesChange={changes} onNodeDragStart={() => store.beginGesture()} onNodeDragStop={() => store.endGesture()} onViewportChange={v => store.setViewport(v)} onConnect={c => { if (c.source && c.target)
        store.connect(c.source, c.target); }} onPaneClick={() => store.ui({ selected: [], selectedEdge: null })} onEdgeClick={(_, e) => store.ui({ selectedEdge: e.id, selected: [], panel: 'inspect' })} onNodeDoubleClick={(_, n) => store.ui({ selected: [n.id], selectedEdge: null, panel: 'inspect', mobilePanel: window.innerWidth < 1000 ? 'lab' : 'none' })} onNodeClick={(_, n) => { if (state.tool === 'connect') {
        if (connecting.current && connecting.current !== n.id) {
            store.connect(connecting.current, n.id);
            connecting.current = null;
            store.ui({ selected: [], tool: 'select' });
        }
        else {
            connecting.current = n.id;
            store.ui({ selected: [n.id] });
        }
    } }} minZoom={0.15} maxZoom={2.5} panOnScroll panOnDrag={state.tool === 'pan' ? [0, 1, 2] : [1, 2]} selectionOnDrag={state.tool === 'select'} selectionMode={SelectionMode.Partial} multiSelectionKeyCode="Shift" deleteKeyCode={null} nodesConnectable nodesDraggable={state.tool !== 'pan'} zoomOnDoubleClick={false} aria-label="素材カードの接続と配置">
   <MiniMap position="bottom-right" style={{ width: 115, height: 73, bottom: 45 }} nodeColor={n => n.data.kind === 'idea' ? '#edcfb7' : n.data.kind === 'note' ? '#f1e2a8' : '#ded7ef'} maskColor="#f8f6fc99" pannable zoomable/>
  </ReactFlow></div>
  {!board.nodes.length && <div className="empty-board"><Icon name="flask"/><h3>まだない遊びを、ここから。</h3><p>リボンで素材を選んで追加。<br />タグとメカニクスをつないでみよう。</p></div>}
  {state.selected.length > 0 && <div className="selection-actions"><span>{state.selected.length} 枚選択</span><button className="btn small" onClick={() => store.mixSelected()}><Icon name="flask"/>素材にする</button><button className="icon-btn" title="複製" aria-label="選択カードを複製" onClick={() => store.duplicateSelected()}><Icon name="copy"/></button><button className="icon-btn" title="削除" aria-label="選択カードを削除" onClick={() => store.deleteSelected()}><Icon name="trash"/></button></div>}
  <div className="board-tools" role="toolbar" aria-label="ホワイトボードのツール"><Tool name="pointer" label="選択 (V)" active={state.tool === 'select'} onClick={() => store.ui({ tool: 'select' })}/><Tool name="hand" label="移動 (H)" active={state.tool === 'pan'} onClick={() => store.ui({ tool: 'pan' })}/><div className="tool-divider"/><Tool name="note" label="付箋を追加 (N)" onClick={() => store.addNote(center())}/><Tool name="link" label="接続：2枚を順にクリック" active={state.tool === 'connect'} onClick={() => { connecting.current = null; store.ui({ tool: 'connect', selected: [] }); }}/><Tool name="frame" label="選択を比較フレームで囲む" onClick={() => store.frameSelection()}/><Tool name="grid" label="カードを整列" onClick={() => store.arrange()} secondary/><div className="tool-divider"/><Tool name="undo" label="元に戻す (Ctrl/⌘ Z)" disabled={!state.canUndo} onClick={() => store.undo()}/><Tool name="redo" label="やり直す (Ctrl/⌘ Shift Z)" disabled={!state.canRedo} onClick={() => store.redo()} secondary/></div>
  <div className="zoom-controls"><Tool name="minus" label="縮小" onClick={() => flow?.zoomOut()}/><span className="zoom-value">{Math.round(board.viewport.zoom * 100)}%</span><Tool name="plus" label="拡大" onClick={() => flow?.zoomIn()}/><Tool name="fit" label="全体を表示" onClick={() => flow?.fitView({ padding: .18, duration: 250 })}/></div>
 </section>;
}
export function BoardCanvas() { return <ReactFlowProvider><BoardInner /></ReactFlowProvider>; }
