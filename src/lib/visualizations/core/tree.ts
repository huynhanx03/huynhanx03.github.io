import type { GraphPanel } from './scene';
export interface TreeNode {
    key: number;
    left: TreeNode | null;
    right: TreeNode | null;
    parent: TreeNode | null;
    color: 'red' | 'black';
    height: number;
}
export const node = (key: number, parent: TreeNode | null = null): TreeNode => ({ key, left: null, right: null, parent, color: 'red', height: 1 });
export function binaryTreePanel(root: TreeNode | null, active: number[] = [], heading = 'Cây tìm kiếm'): GraphPanel {
    const all: {
        node: TreeNode;
        depth: number;
        rank: number;
    }[] = [];
    let order = 0;
    const actualHeights = new Map<TreeNode, number>();
    const compute = (n: TreeNode | null): number => { if (!n)
        return 0; const h = 1 + Math.max(compute(n.left), compute(n.right)); actualHeights.set(n, h); return h; };
    compute(root);
    const walk = (n: TreeNode | null, d: number) => { if (!n)
        return; walk(n.left, d + 1); all.push({ node: n, depth: d, rank: order++ }); walk(n.right, d + 1); };
    walk(root, 0);
    const maxDepth = Math.max(1, ...all.map(x => x.depth));
    return { kind: 'graph', id: 'tree', heading, nodes: all.map(({ node: n, depth, rank }) => ({ id: String(n.key), label: String(n.key), detail: `h=${actualHeights.get(n)}${heading === 'Red-black tree' ? n.color === 'red' ? ' · Đỏ' : ' · Đen' : ''}`, state: active.includes(n.key) ? 'active' : n.color === 'red' ? 'red' : undefined, x: 35 + rank / Math.max(1, all.length - 1) * 370, y: 30 + depth / maxDepth * 230 })), edges: all.flatMap(({ node: n }) => [n.left, n.right].filter((x): x is TreeNode => x !== null).map(c => ({ id: `${n.key}:${c.key}`, from: String(n.key), to: String(c.key), directed: true }))) };
}
export function inorder(root: TreeNode | null): number[] { return root ? [...inorder(root.left), root.key, ...inorder(root.right)] : []; }
export const height = (n: TreeNode | null) => n?.height ?? 0;
export const updateHeight = (n: TreeNode) => { n.height = 1 + Math.max(height(n.left), height(n.right)); };
