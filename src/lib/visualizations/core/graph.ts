import type { Graph } from './input';
import type { GraphPanel } from './scene';
export function graphPanel(g: Graph, activeNodes: number[] = [], activeEdges: string[] = [], details: Record<number, string> = {}, doneNodes: number[] = [], doneEdges: string[] = [], heading = 'Đồ thị', id = 'graph'): GraphPanel {
    return { kind: 'graph', id, heading, nodes: Array.from({ length: g.n }, (_, i) => ({ id: String(i), label: String(i), detail: details[i] ?? '', state: activeNodes.includes(i) ? 'active' : doneNodes.includes(i) ? 'done' : undefined })), edges: g.edges.map(e => ({ id: e.id, from: String(e.u), to: String(e.v), label: g.weighted ? String(e.w) : '', directed: g.directed, state: activeEdges.includes(e.id) ? 'active' : doneEdges.includes(e.id) ? 'done' : undefined })) };
}
export class DSU {
    parent: number[];
    size: number[];
    constructor(n: number) { this.parent = Array.from({ length: n }, (_, i) => i); this.size = Array(n).fill(1); }
    find(x: number): number { while (this.parent[x] !== x)
        x = this.parent[x]; return x; }
    union(a: number, b: number): boolean { a = this.find(a); b = this.find(b); if (a === b)
        return false; if (this.size[a] < this.size[b])
        [a, b] = [b, a]; this.parent[b] = a; this.size[a] += this.size[b]; return true; }
}
