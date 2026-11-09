export type MaterialKind = 'tag' | 'mechanic';
export type NodeKind = 'material' | 'idea' | 'note' | 'frame';
export type Operator = 'translate' | 'constraint' | 'invert' | 'delay' | 'social';
export type Status = 'seed' | 'testing' | 'promising' | 'parked';
export type PlayType = 'agon' | 'alea' | 'mimicry' | 'ilinx';
export type PlayWeights = Record<PlayType, number>;
/** A point on a two-axis map, each coordinate in [-1, 1] (x: left → right, y: bottom → top). */
export interface MapPoint {
    x: number;
    y: number;
}
export interface AxisLabels {
    negative: string;
    positive: string;
}
/** A user-defined positioning map for one board. Independent of the Caillois lens. */
export interface QuadrantMap {
    preset: string;
    x: AxisLabels;
    y: AxisLabels;
    /** Quadrant names in order: top-right, top-left, bottom-left, bottom-right. */
    names: [string, string, string, string];
    positions: Record<string, MapPoint>;
}
export interface Cluster {
    id: string;
    label: string;
    en: string;
    icon: string;
    color: string;
    /** The design question this cluster answers. */
    question: string;
    description: string;
    subgroups: {
        id: string;
        label: string;
    }[];
}
export interface Material {
    id: string;
    kind: MaterialKind;
    label: string;
    alias: string;
    primaryCluster: string;
    clusters: string[];
    subgroup: string;
    description: string;
    /** Original editorial explanation shown in help popovers. */
    summary: string;
    /** Illustrative representative works chosen by the editor (may be empty). */
    examples: string[];
    /** Editorial Caillois weights, 0-3 each. */
    play: PlayWeights;
    /** Editorial paidia (0, free improvisation) ↔ ludus (3, codified rules) degree. */
    ludus: number;
    rank?: number;
    chapter?: string;
    chapterCode?: string;
    source: string;
}
export interface Fusion {
    id: string;
    tagId: string;
    mechanicId: string;
    conceptId: string;
    title: string;
    rule: string;
    example: string;
    mvp: string;
    risk: string;
    origin: string;
}
export interface Concept {
    id: string;
    title: string;
    materials: string[];
    rule: string;
    example: string;
    mvp: string;
    risk: string;
    novelty: string;
}
export interface Catalog {
    schemaVersion: number;
    meta: Record<string, unknown>;
    clusters: Cluster[];
    chapters: {
        id: string;
        label: string;
    }[];
    materials: Material[];
    fusions: Fusion[];
    concepts: Concept[];
}
export interface Hypothesis {
    title: string;
    rule: string;
    example: string;
    mvp: string;
    risk: string;
    question: string;
    materials: string[];
    operator: Operator;
    origin: string;
    sourceId?: string;
    baseId: string;
}
export interface Position {
    x: number;
    y: number;
}
export interface BoardNode {
    id: string;
    type: NodeKind;
    position: Position;
    width: number;
    height: number;
    data: {
        title: string;
        body: string;
        materialId?: string;
        tone: string;
        status?: Status;
        hypothesis?: Hypothesis;
        ratings?: {
            clarity: number;
            novelty: number;
            feasibility: number;
        };
    };
}
export interface BoardEdge {
    id: string;
    source: string;
    target: string;
    label: string;
}
export interface Viewport {
    x: number;
    y: number;
    zoom: number;
}
export interface Board {
    id: string;
    title: string;
    nodes: BoardNode[];
    edges: BoardEdge[];
    viewport: Viewport;
    updatedAt: string;
    /** Optional two-axis positioning map (additive to schemaVersion 1). */
    quadrant?: QuadrantMap;
}
export interface Recipe {
    id: string;
    title: string;
    materials: string[];
    operator: Operator;
    baseId: string;
}
export interface Workspace {
    schemaVersion: 1;
    activeBoardId: string;
    boards: Board[];
    favorites: string[];
    recipes: Recipe[];
}
export interface UIState {
    workspace: Workspace;
    selected: string[];
    selectedEdge: string | null;
    tray: string[];
    baseId: string;
    operator: Operator;
    variant: number;
    tab: 'tag' | 'mechanic' | 'concept' | 'favorite';
    cluster: string;
    query: string;
    chapter: string;
    tool: 'select' | 'pan' | 'connect';
    panel: 'lab' | 'inspect' | 'play';
    view: 'board' | 'quadrant';
    mobilePanel: 'none' | 'library' | 'lab';
    toast: string;
    canUndo: boolean;
    canRedo: boolean;
}
