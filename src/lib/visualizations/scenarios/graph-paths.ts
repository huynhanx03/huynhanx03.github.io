import { definitions } from '../catalog/graph-paths.mjs';
import { mountFamily, emit, type Builder } from '../core/scenario';
import { parseGraph, adjacency, parseInteger as num, requireCondition } from '../core/input';
import { graphPanel, DSU } from '../core/graph';
import { arrayPanel, tablePanel, stackPanel, type Panel } from '../core/scene';
const builders: Record<string, Builder> = {};
for (const id of Object.keys(definitions))
    builders[id] = (v, r) => {
        const tree = id.startsWith('tree-');
        const unweighted = ['graph-adjacency', 'bfs', 'dfs'].includes(id) || tree;
        const directed = ['dag-shortest-path', 'dijkstra', 'bellman-ford', 'floyd-warshall'].includes(id);
        const g = parseGraph(v.n, v.edges, directed, !unweighted), adj = adjacency(g), source = num(v.source ?? v.root ?? '0', 0, g.n - 1);
        const done: number[] = [], edgeDone: string[] = [];
        const draw = (msg: string, nodes: number[] = [], edges: string[] = [], details: Record<number, string> = {}, extra: Panel[] = []) => emit(r, [graphPanel(g, nodes, edges, details, done, edgeDone), ...extra], msg, {}, 'Đồ thị');
        draw('Khởi tạo đồ thị; thứ tự kề ổn định theo ID.');
        if (tree) {
            requireCondition(g.edges.length === g.n - 1 && !g.edges.some(e => e.u === e.v), 'Input phải là cây.');
            const children: number[][] = Array.from({ length: g.n }, () => []), seen = new Set<number>();
            const orient = (u: number, p: number) => { r.consume(); requireCondition(!seen.has(u), 'Input chứa chu trình.'); seen.add(u); for (const { to } of adj[u])
                if (to !== p) {
                    children[u].push(to);
                    orient(to, u);
                } };
            orient(source, -1);
            requireCondition(seen.size === g.n && children.every(c => c.length <= 2), 'Cần cây nhị phân liên thông.');
            const output: number[] = [], stack: number[] = [];
            const visit = (u: number) => { output.push(u); done.push(u); draw(`Xuất đỉnh ${u}.`, [u], [], {}, [arrayPanel(output, [], 'Thứ tự', 'out'), stackPanel(stack)]); };
            if (id === 'tree-level-order') {
                const q = [source];
                while (q.length) {
                    r.consume();
                    const u = q.shift()!;
                    visit(u);
                    q.push(...children[u]);
                    draw('Thêm các con vào queue.', [u], [], {}, [stackPanel(q, 'Queue', 'queue')]);
                }
            }
            else {
                const dfs = (u: number) => { r.consume(); stack.push(u); draw(`Gọi vào ${u}.`, [u], [], {}, [stackPanel(stack)]); if (id === 'tree-preorder')
                    visit(u); if (children[u][0] !== undefined)
                    dfs(children[u][0]); if (id === 'tree-inorder')
                    visit(u); if (children[u][1] !== undefined)
                    dfs(children[u][1]); if (id === 'tree-postorder')
                    visit(u); stack.pop(); };
                dfs(source);
            }
            return { output: output.join(', ') };
        }
        if (id === 'graph-adjacency') {
            const matrix = Array.from({ length: g.n }, () => Array(g.n).fill(0));
            for (const e of g.edges) {
                matrix[e.u][e.v]++;
                matrix[e.v][e.u]++;
                draw(`Ghi cạnh ${e.u}–${e.v}.`, [e.u, e.v], [e.id], {}, [tablePanel(['u', ...Array.from({ length: g.n }, (_, i) => String(i))], matrix.map((row, i) => [i, ...row]), 'Số cạnh trong ma trận', 'matrix')]);
            }
            draw('Danh sách kề và ma trận biểu diễn cùng đồ thị.', [], [], {}, [tablePanel(['u', 'Kề'], adj.map((row, i) => [i, row.map(x => x.to).join(', ')]))]);
            return { output: `${g.edges.length} cạnh` };
        }
        if (id === 'bfs' || id === 'dfs') {
            const visited = Array(g.n).fill(false), dist = Array(g.n).fill(-1), parent = Array(g.n).fill(-1), output: number[] = [], frontier: number[] = [];
            const show = (msg: string, u: number, edge: string[] = []) => draw(msg, [u], edge, Object.fromEntries(dist.map((d, i) => [i, `d=${d}`])), [stackPanel(frontier, id === 'bfs' ? 'Queue' : 'Call stack', id === 'bfs' ? 'queue' : 'stack'), arrayPanel(parent, [], 'Parent', 'parent')]);
            visited[source] = true;
            dist[source] = 0;
            if (id === 'bfs') {
                frontier.push(source);
                show('Đánh dấu source ngay khi enqueue.', source);
                while (frontier.length) {
                    r.consume();
                    const u = frontier.shift()!;
                    output.push(u);
                    done.push(u);
                    show(`Dequeue ${u}.`, u);
                    for (const { to, edge } of adj[u]) {
                        show(`Xét cạnh tới ${to}.`, u, [edge.id]);
                        if (!visited[to]) {
                            visited[to] = true;
                            dist[to] = dist[u] + 1;
                            parent[to] = u;
                            frontier.push(to);
                            edgeDone.push(edge.id);
                            show(`Phát hiện ${to}, enqueue một lần.`, to, [edge.id]);
                        }
                    }
                }
            }
            else {
                const dfs = (u: number) => { r.consume(); frontier.push(u); visited[u] = true; output.push(u); show(`Enter ${u}.`, u); for (const { to, edge } of adj[u])
                    if (!visited[to]) {
                        dist[to] = dist[u] + 1;
                        parent[to] = u;
                        edgeDone.push(edge.id);
                        dfs(to);
                    } done.push(u); frontier.pop(); show(`Exit ${u}.`, u); };
                dfs(source);
            }
            draw('Duyệt xong thành phần chứa source.', [], [], {}, [arrayPanel(output, [], 'Thứ tự', 'out'), arrayPanel(dist, [], 'Khoảng cách / độ sâu', 'dist')]);
            return { output: output.join(', '), summary: 'Đỉnh không tới được giữ dist=-1.' };
        }
        if (['kruskal', 'prim', 'mst-cut'].includes(id)) {
            const dsu = new DSU(g.n), selected: string[] = [];
            let cost = 0;
            const add = (edge: typeof g.edges[number]) => { selected.push(edge.id); edgeDone.push(edge.id); cost += edge.w; dsu.union(edge.u, edge.v); draw(`Chọn cạnh ${edge.u}–${edge.v}, weight=${edge.w}.`, [edge.u, edge.v], [edge.id], {}, [tablePanel(['tổng trọng số'], [[cost]])]); };
            if (id === 'kruskal') {
                for (const e of [...g.edges].sort((a, b) => a.w - b.w || a.id.localeCompare(b.id))) {
                    r.consume();
                    draw(`Xét cạnh ${e.id} theo trọng số.`, [e.u, e.v], [e.id]);
                    if (dsu.find(e.u) !== dsu.find(e.v))
                        add(e);
                    else
                        draw('Bỏ cạnh vì tạo chu trình.', [e.u, e.v], [e.id]);
                }
            }
            else {
                const seen = new Set<number>();
                for (let root = 0; root < g.n; root++)
                    if (!seen.has(root)) {
                        seen.add(root);
                        done.push(root);
                        while (true) {
                            r.consume();
                            const candidates = g.edges.filter(e => seen.has(e.u) !== seen.has(e.v)).sort((a, b) => a.w - b.w || a.id.localeCompare(b.id));
                            if (!candidates.length)
                                break;
                            const e = candidates[0];
                            draw('Cạnh nhẹ nhất băng qua lát cắt hiện tại.', [...seen], [e.id]);
                            const fresh = seen.has(e.u) ? e.v : e.u;
                            seen.add(fresh);
                            done.push(fresh);
                            add(e);
                        }
                    }
            }
            draw('Hoàn tất minimum spanning forest.', [], [], {}, [arrayPanel(selected, [], 'Cạnh đã chọn')]);
            return { output: String(cost), summary: selected.length === g.n - 1 ? 'Đồ thị liên thông: đây là MST.' : 'Đồ thị không liên thông: đây là rừng khung nhỏ nhất.' };
        }
        const dist = Array(g.n).fill(Infinity), parent = Array(g.n).fill(-1);
        dist[source] = 0;
        const show = (msg: string, u: number[] = [], e: string[] = [], extra: Panel[] = []) => draw(msg, u, e, Object.fromEntries(dist.map((d, i) => [i, Number.isFinite(d) ? String(d) : '∞'])), [arrayPanel(parent, [], 'Parent', 'parent'), ...extra]);
        if (id === 'floyd-warshall') {
            const d = Array.from({ length: g.n }, (_, i) => Array.from({ length: g.n }, (_, j) => i === j ? 0 : Infinity));
            for (const e of g.edges)
                d[e.u][e.v] = Math.min(d[e.u][e.v], e.w);
            const matrix = (i: number, j: number) => tablePanel(['i/j', ...Array.from({ length: g.n }, (_, x) => String(x))], d.map((row, x) => [x, ...row.map(v => v === Infinity ? '∞' : v)]), 'Khoảng cách', 'matrix', [[i, j + 1]]);
            show('Ma trận ban đầu.', [], [], [matrix(0, 0)]);
            for (let k = 0; k < g.n; k++)
                for (let i = 0; i < g.n; i++)
                    for (let j = 0; j < g.n; j++) {
                        r.consume();
                        if (d[i][k] !== Infinity && d[k][j] !== Infinity && d[i][k] + d[k][j] < d[i][j]) {
                            d[i][j] = d[i][k] + d[k][j];
                            dist.splice(0, g.n, ...d[source]);
                            show(`Đi qua k=${k} cải thiện ${i}→${j}.`, [i, k, j], [], [matrix(i, j)]);
                        }
                    }
            const negative = Array.from({ length: g.n }, (_, i) => i).filter(i => d[i][i] < 0);
            const affected = (i: number, j: number) => negative.some(k => d[i][k] !== Infinity && d[k][j] !== Infinity);
            const output = d[source].map((x, j) => affected(source, j) ? '−∞' : x === Infinity ? '∞' : String(x));
            show('Hoàn tất; −∞ là cặp chịu ảnh hưởng chu trình âm.', [], [], [tablePanel(['i/j', ...Array.from({ length: g.n }, (_, x) => String(x))], d.map((row, i) => [i, ...row.map((x, j) => affected(i, j) ? '−∞' : x === Infinity ? '∞' : x)]), 'Kết quả', 'matrix')]);
            return { output: output.join(', ') };
        }
        const relax = (u: number, to: number, w: number, edge: string) => { r.consume(); if (dist[u] !== Infinity && dist[u] + w < dist[to]) {
            dist[to] = dist[u] + w;
            parent[to] = u;
            show(`Relax ${u}→${to}, dist=${dist[to]}.`, [u, to], [edge]);
            return true;
        } return false; };
        if (id === 'dag-shortest-path') {
            const indegree = Array(g.n).fill(0);
            g.edges.forEach(e => indegree[e.v]++);
            const q = indegree.map((x, i) => x === 0 ? i : -1).filter(x => x >= 0), order: number[] = [];
            while (q.length) {
                const u = q.shift()!;
                order.push(u);
                for (const { to } of adj[u])
                    if (--indegree[to] === 0)
                        q.push(to);
            }
            requireCondition(order.length === g.n, 'DAG không được chứa chu trình.');
            show('Topo đã kiểm tra.', [], [], [arrayPanel(order, [], 'Topo', 'topo')]);
            for (const u of order)
                for (const { to, edge } of adj[u])
                    relax(u, to, edge.w, edge.id);
        }
        else if (id === 'dijkstra') {
            requireCondition(g.edges.every(e => e.w >= 0), 'Dijkstra không nhận cạnh âm.');
            const settled = Array(g.n).fill(false);
            for (let step = 0; step < g.n; step++) {
                let u = -1;
                for (let i = 0; i < g.n; i++)
                    if (!settled[i] && (u < 0 || dist[i] < dist[u]))
                        u = i;
                if (u < 0 || dist[u] === Infinity)
                    break;
                settled[u] = true;
                done.push(u);
                show(`Chốt đỉnh ${u} có dist nhỏ nhất.`, [u]);
                for (const { to, edge } of adj[u])
                    relax(u, to, edge.w, edge.id);
            }
        }
        else {
            for (let pass = 1; pass < g.n; pass++) {
                let changed = false;
                for (const e of g.edges)
                    changed = relax(e.u, e.v, e.w, e.id) || changed;
                show(`Xong lượt ${pass}.`);
                if (!changed)
                    break;
            }
            const affected = new Set<number>();
            for (const e of g.edges)
                if (dist[e.u] !== Infinity && dist[e.u] + e.w < dist[e.v])
                    affected.add(e.v);
            const q = [...affected];
            while (q.length) {
                r.consume();
                const u = q.shift()!;
                for (const { to } of adj[u])
                    if (!affected.has(to)) {
                        affected.add(to);
                        q.push(to);
                    }
            }
            if (affected.size) {
                show('Phát hiện chu trình âm tới được từ source.', [...affected]);
                return { output: dist.map((x, i) => affected.has(i) ? '−∞' : x === Infinity ? '∞' : String(x)).join(', '), summary: 'Các đỉnh −∞ không có khoảng cách ngắn nhất hữu hạn.' };
            }
        }
        show('Hoàn tất đường đi ngắn nhất.');
        return { output: dist.map(x => x === Infinity ? '∞' : String(x)).join(', ') };
    };
export const mountScenarioById = (id: string, root: HTMLElement) => mountFamily(id, root, definitions, builders);
