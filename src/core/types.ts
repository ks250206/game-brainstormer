export type MaterialKind = 'tag' | 'mechanic';
export type NodeKind = 'material' | 'idea' | 'note' | 'frame';
export type Operator = 'translate' | 'constraint' | 'invert' | 'delay' | 'social';
export type Status = 'seed' | 'testing' | 'promising' | 'parked';
export interface Cluster {
    id: string;
    label: string;
    en: string;
    icon: string;
    color: string;
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
    panel: 'lab' | 'inspect';
    mobilePanel: 'none' | 'library' | 'lab';
    toast: string;
    canUndo: boolean;
    canRedo: boolean;
}
