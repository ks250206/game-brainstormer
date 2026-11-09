export type MaterialKind = 'tag' | 'mechanic';
export type NodeKind = 'material' | 'idea' | 'note' | 'frame';
export type Operator = 'translate' | 'constraint' | 'invert' | 'delay' | 'social';
export type Status = 'seed' | 'testing' | 'promising' | 'parked';
export type PlayType = 'agon' | 'alea' | 'mimicry' | 'ilinx';
export type PlayWeights = Record<PlayType, number>;
/** A point on the Caillois map. x: -1 will/control … +1 surrender; y: -1 make-believe/sensation … +1 rules. */
export interface PlayPoint {
    x: number;
    y: number;
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
        /** Manually pinned position on the Caillois play map (idea/note cards). */
        play?: PlayPoint;
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
    panel: 'lab' | 'inspect' | 'play';
    mobilePanel: 'none' | 'library' | 'lab';
    toast: string;
    canUndo: boolean;
    canRedo: boolean;
}
