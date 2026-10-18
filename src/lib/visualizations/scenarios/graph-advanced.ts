import { definitions } from '../catalog/graph-advanced.mjs';
import { mountFamily, emit, type Builder } from '../core/scenario';
import { arrayPanel, tablePanel, stackPanel, type Panel } from '../core/scene';
import { parseGraph, adjacency, parseInteger as num, requireCondition, type Graph, type Edge } from '../core/input';
import { graphPanel } from '../core/graph';
const builders: Record<string, Builder> = {};
for (const id of Object.keys(definitions))
    builders[id] = (v, r) => {
        const flow = ['max-flow-augment', 'min-cut', 'min-cost-flow', 'matching-as-flow', 'min-cost-assignment'].includes(id), matching = ['bipartite-augment', 'matching-as-flow', 'min-cost-assignment'].includes(id);
        if (flow || matching) {
            let g: Graph;
            let source: number, target: number;
            if (matching) {
                const left = num(v.n, 1, 3), right = num(v.k, 1, 3), lines = v.edges.trim() ? v.edges.trim().split('\n') : [];
                requireCondition(lines.length <= 12, 'Tối đa 12 matching edges.');
                const pairs = lines.map((line, i) => { const p = line.trim().split(/\s+/); requireCondition(p.length === (id === 'min-cost-assignment' ? 3 : 2), `Cạnh matching dòng ${i + 1} sai số trường.`); return { u: num(p[0], 0, left - 1), v: num(p[1], 0, right - 1), cost: p[2] === undefined ? 0 : num(p[2], -20, 20), id: `m${i}` }; });
                if (id === 'bipartite-augment') {
                    const adj: number[][] = Array.from({ length: left }, () => []);
                    pairs.forEach(e => adj[e.u].push(e.v));
                    adj.forEach(a => a.sort((x, y) => x - y));
                    const owner = Array(right).fill(-1), used = Array(left).fill(false);
                    const draw = (msg: string, u = -1) => emit(r, [{ kind: 'graph', id: 'matching', heading: 'Bipartite matching', nodes: [...Array.from({ length: left }, (_, i) => ({ id: `L${i}`, label: `L${i}`, x: 80, y: 40 + i * 80, state: i === u ? 'active' as const : undefined })), ...Array.from({ length: right }, (_, i) => ({ id: `R${i}`, label: `R${i}`, x: 350, y: 40 + i * 80 }))], edges: pairs.map(e => ({ id: e.id, from: `L${e.u}`, to: `R${e.v}`, state: owner[e.v] === e.u ? 'done' : undefined })) }, arrayPanel(owner, [], 'Right owner', 'owner')], msg);
                    draw('Owner tất cả right=-1.');
                    const augment = (u: number): boolean => { r.consume(); if (used[u])
                        return false; used[u] = true; draw(`Tìm đường tăng từ L${u}.`, u); for (const w of adj[u]) {
                        if (owner[w] < 0 || augment(owner[w])) {
                            owner[w] = u;
                            draw(`Ghép L${u}–R${w}; các ghép cũ có thể đổi theo recursion.`, u);
                            return true;
                        }
                    } return false; };
                    let total = 0;
                    for (let u = 0; u < left; u++) {
                        used.fill(false);
                        if (augment(u))
                            total++;
                        draw(`Sau lần thử L${u}, size=${total}.`);
                    }
                    return { output: String(total) };
                }
                source = 0;
                target = left + right + 1;
                const edges: Edge[] = [];
                for (let i = 0; i < left; i++)
                    edges.push({ id: `s${i}`, u: 0, v: 1 + i, w: 1, capacity: 1, cost: 0 });
                for (const p of pairs)
                    edges.push({ id: p.id, u: p.u + 1, v: left + 1 + p.v, w: 1, capacity: 1, cost: p.cost });
                for (let i = 0; i < right; i++)
                    edges.push({ id: `t${i}`, u: left + 1 + i, v: target, w: 1, capacity: 1, cost: 0 });
                g = { n: target + 1, edges, directed: true };
            }
            else {
                const n = num(v.n, 1, 8);
                source = num(v.source, 0, n - 1);
                target = num(v.target, 0, n - 1);
                requireCondition(source !== target, 'Source và sink phải khác.');
                const lines = v.edges.trim() ? v.edges.trim().split('\n') : [];
                requireCondition(lines.length <= 30, 'Tối đa 30 edges.');
                const costMode = id === 'min-cost-flow';
                const edges = lines.map((line, i) => { const p = line.trim().split(/\s+/); requireCondition(p.length === (costMode ? 4 : 3), 'Cạnh flow cần u v capacity [cost].'); return { id: `e${i}`, u: num(p[0], 0, n - 1), v: num(p[1], 0, n - 1), w: 1, capacity: num(p[2], 0, 20), cost: costMode ? num(p[3], -20, 20) : 0 }; });
                g = { n, edges, directed: true };
            }
            interface Arc {
                id: string;
                u: number;
                v: number;
                capacity: number;
                cost: number;
                reverse: number;
            }
            ;
            const arcs: Arc[] = [];
            const adj: number[][] = Array.from({ length: g.n }, () => []);
            g.edges.forEach(e => { const index = arcs.length; arcs.push({ id: `${e.id}:f`, u: e.u, v: e.v, capacity: e.capacity ?? 0, cost: e.cost ?? 0, reverse: index + 1 }, { id: `${e.id}:r`, u: e.v, v: e.u, capacity: 0, cost: -(e.cost ?? 0), reverse: index }); adj[e.u].push(index); adj[e.v].push(index + 1); });
            const costMode = id === 'min-cost-flow' || id === 'min-cost-assignment';
            let total = 0, cost = 0;
            const draw = (msg: string, path: number[] = []) => emit(r, [{ kind: 'graph', id: 'residual', heading: 'Residual network · cap / cost', nodes: Array.from({ length: g.n }, (_, i) => ({ id: String(i), label: i === source ? 'S' : i === target ? 'T' : String(i) })), edges: arcs.map((a, i) => ({ id: a.id, from: String(a.u), to: String(a.v), directed: true, label: costMode ? `${a.capacity}/${a.cost}` : String(a.capacity), state: path.includes(i) ? 'active' : a.capacity ? 'done' : 'muted' })) }, tablePanel(['flow', 'cost'], [[total, cost]])], msg, {}, 'Flow');
            draw('Tạo forward và reverse arc với ID riêng.');
            while (true) {
                r.consume();
                const distance = Array(g.n).fill(Infinity), parent = Array(g.n).fill(-1);
                distance[source] = 0;
                if (costMode) {
                    for (let pass = 1; pass < g.n; pass++) {
                        let changed = false;
                        for (let i = 0; i < arcs.length; i++) {
                            r.consume();
                            const a = arcs[i];
                            if (a.capacity && distance[a.u] !== Infinity && distance[a.u] + a.cost < distance[a.v]) {
                                distance[a.v] = distance[a.u] + a.cost;
                                parent[a.v] = i;
                                changed = true;
                            }
                        }
                        if (!changed)
                            break;
                    }
                    requireCondition(!arcs.some(a => a.capacity && distance[a.u] !== Infinity && distance[a.u] + a.cost < distance[a.v]), 'Không hỗ trợ reachable negative-cost cycle.');
                }
                else {
                    const q = [source];
                    while (q.length) {
                        const u = q.shift()!;
                        for (const i of adj[u]) {
                            r.consume();
                            const a = arcs[i];
                            if (a.capacity && distance[a.v] === Infinity) {
                                distance[a.v] = distance[u] + 1;
                                parent[a.v] = i;
                                q.push(a.v);
                            }
                        }
                    }
                }
                if (parent[target] < 0)
                    break;
                const path: number[] = [];
                let u = target, delta = Infinity;
                const seen = new Set<number>();
                while (u !== source) {
                    requireCondition(!seen.has(u) && parent[u] >= 0, 'Parent path không hợp lệ.');
                    seen.add(u);
                    const i = parent[u];
                    path.unshift(i);
                    delta = Math.min(delta, arcs[i].capacity);
                    u = arcs[i].u;
                }
                draw(`Đường tăng bottleneck=${delta}.`, path);
                for (const i of path) {
                    arcs[i].capacity -= delta;
                    arcs[arcs[i].reverse].capacity += delta;
                    cost += delta * arcs[i].cost;
                }
                total += delta;
                draw('Augment: forward giảm, reverse tăng để cho phép đổi tuyến.', path);
            }
            const reachable = new Set<number>([source]), q = [source];
            while (q.length) {
                const u = q.shift()!;
                for (const i of adj[u])
                    if (arcs[i].capacity && !reachable.has(arcs[i].v)) {
                        reachable.add(arcs[i].v);
                        q.push(arcs[i].v);
                    }
            }
            const cut = g.edges.filter(e => reachable.has(e.u) && !reachable.has(e.v)), cutCapacity = cut.reduce((sum, e) => sum + (e.capacity ?? 0), 0);
            draw(`Không còn augmenting path. Cut capacity=${cutCapacity}.`);
            return { output: costMode ? `${total}; ${cost}` : String(total), summary: costMode ? 'Minimum cost cho lượng flow tối đa; chi phí đã gồm các cạnh ngược.' : `Max flow = cut capacity = ${cutCapacity}.` };
        }
        const undirected = ['bridges-lowlink', 'articulation-lowlink', 'euler-check', 'hierholzer', 'hamilton-search'].includes(id);
        const g = parseGraph(v.n, v.edges, !undirected), adj = adjacency(g), source = num(v.source ?? '0', 0, g.n - 1);
        const show = (msg: string, active: number[] = [], edges: string[] = [], extra: Panel[] = [], details: Record<number, string> = {}) => emit(r, [graphPanel(g, active, edges, details), ...extra], msg, {}, 'Graph');
        show('Đồ thị đầu vào.');
        if (id === 'kahn-topo' || id === 'dfs-topo') {
            const order: number[] = [];
            if (id === 'kahn-topo') {
                const deg = Array(g.n).fill(0);
                g.edges.forEach(e => deg[e.v]++);
                const q = deg.map((d, i) => d === 0 ? i : -1).filter(i => i >= 0);
                show('Đưa tất cả đỉnh indegree 0 vào queue.', [], [], [arrayPanel(deg, [], 'Indegree', 'deg'), stackPanel(q, 'Queue', 'queue')]);
                while (q.length) {
                    r.consume();
                    const u = q.shift()!;
                    order.push(u);
                    for (const { to, edge } of adj[u]) {
                        deg[to]--;
                        show(`Xóa cạnh đi ra ${u}→${to}.`, [u, to], [edge.id], [arrayPanel(deg, [to], 'Indegree', 'deg')]);
                        if (deg[to] === 0)
                            q.push(to);
                    }
                    show(`Xuất ${u}.`, [u], [], [arrayPanel(order, [], 'Topo', 'out'), stackPanel(q, 'Queue', 'queue')]);
                }
                if (order.length < g.n)
                    return { output: 'Chu trình' };
            }
            else {
                const color = Array(g.n).fill(0), stack: number[] = [];
                let cycle = false;
                const dfs = (u: number) => { r.consume(); color[u] = 1; stack.push(u); show(`Gray ${u}.`, [u], [], [stackPanel(stack)]); for (const { to, edge } of adj[u]) {
                    if (color[to] === 1) {
                        cycle = true;
                        show('Cạnh tới gray node: chu trình.', [u, to], [edge.id]);
                    }
                    else if (color[to] === 0)
                        dfs(to);
                } stack.pop(); color[u] = 2; order.push(u); show(`Black ${u}; ghi sau các con.`, [u]); };
                for (let u = 0; u < g.n; u++)
                    if (!color[u])
                        dfs(u);
                if (cycle)
                    return { output: 'Chu trình' };
                order.reverse();
            }
            show('Topo hoàn tất.', [], [], [arrayPanel(order)]);
            return { output: order.join(', ') };
        }
        if (id.includes('scc') || id === 'scc-condensation') {
            const groups: number[][] = [];
            if (id === 'kosaraju-scc') {
                const visited = Array(g.n).fill(false), order: number[] = [];
                const dfs = (u: number) => { r.consume(); visited[u] = true; for (const { to } of adj[u])
                    if (!visited[to])
                        dfs(to); order.push(u); show(`Lượt 1: finish ${u}.`, [u], [], [arrayPanel(order, [], 'Finish order')]); };
                for (let u = 0; u < g.n; u++)
                    if (!visited[u])
                        dfs(u);
                visited.fill(false);
                const reverse = adjacency({ ...g, edges: g.edges.map(e => ({ ...e, u: e.v, v: e.u })) });
                const collect = (u: number, group: number[]) => { r.consume(); visited[u] = true; group.push(u); for (const { to } of reverse[u])
                    if (!visited[to])
                        collect(to, group); };
                for (const u of order.reverse())
                    if (!visited[u]) {
                        const group: number[] = [];
                        collect(u, group);
                        groups.push(group);
                        show('Lượt 2 trên đồ thị đảo tạo SCC.', group);
                    }
            }
            else {
                const disc = Array(g.n).fill(-1), low = Array(g.n).fill(0), on = Array(g.n).fill(false), stack: number[] = [];
                let clock = 0;
                const dfs = (u: number) => { r.consume(); disc[u] = low[u] = clock++; stack.push(u); on[u] = true; show(`disc[${u}]=${disc[u]}.`, [u], [], [arrayPanel(disc, [], 'disc', 'disc'), arrayPanel(low, [], 'low', 'low'), stackPanel(stack, 'SCC stack')]); for (const { to, edge } of adj[u]) {
                    if (disc[to] < 0) {
                        dfs(to);
                        low[u] = Math.min(low[u], low[to]);
                    }
                    else if (on[to])
                        low[u] = Math.min(low[u], disc[to]);
                    show(`Cập nhật low[${u}]; back edge chỉ dùng disc của node còn trên stack.`, [u, to], [edge.id], [arrayPanel(low, [u], 'low', 'low')]);
                } if (low[u] === disc[u]) {
                    const group: number[] = [];
                    let w;
                    do {
                        w = stack.pop()!;
                        on[w] = false;
                        group.push(w);
                    } while (w !== u);
                    groups.push(group);
                    show('Pop tới root SCC.', group);
                } };
                for (let u = 0; u < g.n; u++)
                    if (disc[u] < 0)
                        dfs(u);
            }
            groups.forEach(group => group.sort((a, b) => a - b));
            groups.sort((a, b) => a[0] - b[0]);
            const label = Array(g.n).fill(-1);
            groups.forEach((group, i) => group.forEach(u => label[u] = i));
            if (id === 'scc-condensation') {
                const pairs = new Map<string, [
                    number,
                    number
                ]>();
                for (const e of g.edges)
                    if (label[e.u] !== label[e.v])
                        pairs.set(`${label[e.u]}:${label[e.v]}`, [label[e.u], label[e.v]]);
                emit(r, [{ kind: 'graph', id: 'condensation', heading: 'DAG ngưng tụ', nodes: groups.map((group, i) => ({ id: String(i), label: String(i), detail: group.join(',') })), edges: [...pairs].map(([id, [u, w]]) => ({ id, from: String(u), to: String(w), directed: true })) }], 'Co SCC; các cạnh giữa component tạo DAG.');
                return { output: `${groups.length} SCC` };
            }
            show('SCC hoàn tất.', [], [], [tablePanel(['SCC', 'nodes'], groups.map((group, i) => [i, group.join(',')]))]);
            return { output: groups.map(group => group.join(',')).join(' | ') };
        }
        if (id === 'bridges-lowlink' || id === 'articulation-lowlink') {
            const tin = Array(g.n).fill(-1), low = Array(g.n).fill(0), bridges: string[] = [], art = new Set<number>();
            let time = 0;
            const dfs = (u: number, parentEdge: string | null) => { r.consume(); tin[u] = low[u] = time++; let children = 0; for (const { to, edge } of adj[u]) {
                if (edge.id === parentEdge)
                    continue;
                if (tin[to] >= 0)
                    low[u] = Math.min(low[u], tin[to]);
                else {
                    children++;
                    dfs(to, edge.id);
                    low[u] = Math.min(low[u], low[to]);
                    if (low[to] > tin[u])
                        bridges.push(`${Math.min(u, to)}–${Math.max(u, to)}`);
                    if (parentEdge !== null && low[to] >= tin[u])
                        art.add(u);
                }
                show(`Cập nhật tin/low tại ${u}.`, [u, to], [edge.id], [arrayPanel(tin, [], 'tin', 'tin'), arrayPanel(low, [], 'low', 'low')]);
            } if (parentEdge === null && children > 1)
                art.add(u); };
            for (let u = 0; u < g.n; u++)
                if (tin[u] < 0)
                    dfs(u, null);
            show('Low-link hoàn tất; parent được phân biệt bằng edge ID.', [], [], [arrayPanel(id === 'bridges-lowlink' ? bridges : [...art].sort((a, b) => a - b))]);
            return { output: id === 'bridges-lowlink' ? bridges.sort().join(', ') : [...art].sort((a, b) => a - b).join(', ') };
        }
        if (id === 'hamilton-search') {
            requireCondition(g.n <= 8, 'Hamilton giới hạn 8 đỉnh.');
            const path = [source], used = new Set([source]);
            let answer: number[] | null = null, work = 0;
            const dfs = (u: number): boolean => { if (++work > 50000)
                throw new Error('Hamilton vượt work budget.'); r.consume(); if (path.length === g.n) {
                if (adj[u].some(e => e.to === source)) {
                    answer = [...path, source];
                    return true;
                }
                return false;
            } for (const { to, edge } of adj[u])
                if (!used.has(to)) {
                    used.add(to);
                    path.push(to);
                    show('Thử mở rộng đường đi Hamilton.', [to], [edge.id], [arrayPanel(path)]);
                    if (dfs(to))
                        return true;
                    path.pop();
                    used.delete(to);
                    show('Backtrack khi nhánh không thể đóng chu trình.', [u], [], [arrayPanel(path)]);
                } return false; };
            dfs(source);
            show(answer ? 'Tìm được chu trình.' : 'Không có chu trình Hamilton.', [], [], [arrayPanel(answer ?? [])]);
            return { output: answer ? (answer as number[]).join(', ') : 'Không có chu trình' };
        }
        const degree = adj.map(row => row.length), odd = degree.map((d, i) => d % 2 ? i : -1).filter(i => i >= 0), start = odd[0] ?? degree.findIndex(d => d > 0);
        const reach = new Set<number>();
        const walk = (u: number) => { reach.add(u); for (const { to } of adj[u])
            if (!reach.has(to))
                walk(to); };
        if (start >= 0)
            walk(start);
        const connected = degree.every((d, i) => !d || reach.has(i)), valid = connected && (odd.length === 0 || odd.length === 2);
        show(`Đỉnh bậc lẻ: ${odd.join(', ') || 'không'}.`, odd, [], [arrayPanel(degree, [], 'Degree', 'degree')]);
        if (!valid)
            return { output: 'Không có Euler' };
        if (id === 'euler-check')
            return { output: odd.length ? 'Đường đi Euler' : 'Chu trình Euler' };
        const stack = [start >= 0 ? start : source], used = new Set<string>(), cursor = Array(g.n).fill(0), path: number[] = [];
        while (stack.length) {
            r.consume();
            const u = stack[stack.length - 1];
            while (cursor[u] < adj[u].length && used.has(adj[u][cursor[u]].edge.id))
                cursor[u]++;
            if (cursor[u] === adj[u].length) {
                path.push(stack.pop()!);
                show('Không còn cạnh: pop vào đường đi ngược.', [u], [], [stackPanel(stack), arrayPanel(path, [], 'Reverse output', 'out')]);
            }
            else {
                const e = adj[u][cursor[u]++];
                used.add(e.edge.id);
                stack.push(e.to);
                show('Đánh dấu edge ID và đi qua đúng một lần.', [u, e.to], [e.edge.id], [stackPanel(stack)]);
            }
        }
        path.reverse();
        show('Đảo đường đi thu được.', [], [], [arrayPanel(path)]);
        return { output: path.join(', ') };
    };
export const mountScenarioById = (id: string, root: HTMLElement) => mountFamily(id, root, definitions, builders);
