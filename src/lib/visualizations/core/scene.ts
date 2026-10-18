export type Scalar = string | number;
interface BasePanel {
    id: string;
    heading: string;
}
export interface ArrayPanel extends BasePanel {
    kind: 'array';
    values: Scalar[];
    keys?: string[];
    held?: { key: string; value: Scalar; label?: string; itemLabel?: string };
    active?: number[];
    labels?: string[];
    result?: number[];
}
export interface TablePanel extends BasePanel {
    kind: 'table';
    columns: string[];
    rows: Scalar[][];
    active?: [
        number,
        number
    ][];
}
export interface GraphNode {
    id: string;
    label: string;
    detail?: string;
    state?: 'active' | 'done' | 'muted' | 'red';
    x?: number;
    y?: number;
}
export interface GraphEdge {
    id: string;
    from: string;
    to: string;
    label?: string;
    state?: 'active' | 'done' | 'muted';
    directed?: boolean;
}
export interface GraphPanel extends BasePanel {
    kind: 'graph';
    width?: number;
    height?: number;
    nodes: GraphNode[];
    edges: GraphEdge[];
}
export interface StackPanel extends BasePanel {
    kind: 'stack';
    values: Scalar[];
    mode: 'stack' | 'queue';
}
export interface StringPanel extends BasePanel {
    kind: 'string';
    text: Scalar[];
    pattern?: Scalar[];
    offset?: number;
    active?: number[];
    matches?: number[];
}
export interface IntervalPanel extends BasePanel {
    kind: 'intervals';
    intervals: {
        start: number;
        end: number;
        label: string;
        state?: 'active' | 'done' | 'muted';
    }[];
}
export interface BoardPanel extends BasePanel {
    kind: 'board';
    size: number;
    pieces: [
        number,
        number
    ][];
    active?: [
        number,
        number
    ][];
}
export type Panel = ArrayPanel | TablePanel | GraphPanel | StackPanel | StringPanel | IntervalPanel | BoardPanel;
export interface LessonScene {
    panels: Panel[];
}
export const arrayPanel = (values: Scalar[], active: number[] = [], heading = 'Dữ liệu', id = 'array'): ArrayPanel => ({ kind: 'array', id, heading, values: [...values], active });
export const tablePanel = (columns: string[], rows: Scalar[][], heading = 'Trạng thái', id = 'table', active: [
    number,
    number
][] = []): TablePanel => ({ kind: 'table', id, heading, columns, rows, active });
export const stackPanel = (values: Scalar[], heading = 'Stack', mode: 'stack' | 'queue' = 'stack', id = 'stack'): StackPanel => ({ kind: 'stack', id, heading, values: [...values], mode });
export const stringPanel = (text: Scalar[], active: number[] = [], heading = 'Chuỗi', id = 'string'): StringPanel => ({ kind: 'string', id, heading, text, active });
