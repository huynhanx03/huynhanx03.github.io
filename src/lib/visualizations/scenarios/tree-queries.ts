import { definitions } from '../catalog/tree-queries.mjs';
import { mountFamily, emit, type Builder } from '../core/scenario';
import { arrayPanel, tablePanel, stackPanel, type Panel, type GraphPanel } from '../core/scene';
import { parseInteger as num, parseIntegerArray as ints, parseGraph, adjacency, requireCondition } from '../core/input';
import { graphPanel, DSU } from '../core/graph';
const builders: Record<string, Builder> = {};
for (const id of Object.keys(definitions))
    builders[id] = (v, r) => {
        const n = num(v.n, 1, 12);
        const show = (panels: Panel[], msg: string, vars: Record<string, string | number> = {}) => emit(r, panels, msg, vars, 'Cây / connectivity');
        if (id === 'dsu-rollback' || id === 'offline-connectivity') {
            const lines = v.ops.trim() ? v.ops.trim().split('\n') : [];
            requireCondition(lines.length <= 24, 'Tối đa 24 operations.');
            const dsu = new DSU(n), history: ({
                child: number;
                root: number;
                oldSize: number;
            } | null)[] = [], snapshots = new Map<string, number>(), answers: string[] = [];
            const union = (a: number, b: number) => { a = dsu.find(a); b = dsu.find(b); if (a === b) {
                history.push(null);
                return;
            } if (dsu.size[a] < dsu.size[b])
                [a, b] = [b, a]; history.push({ child: b, root: a, oldSize: dsu.size[a] }); dsu.parent[b] = a; dsu.size[a] += dsu.size[b]; };
            const rollback = (at: number) => { while (history.length > at) {
                r.consume();
                const change = history.pop();
                if (change) {
                    dsu.parent[change.child] = change.child;
                    dsu.size[change.root] = change.oldSize;
                }
            } };
            const draw = (msg: string) => show([arrayPanel(dsu.parent, [], 'Parent'), arrayPanel(dsu.size, [], 'Size', 'size'), stackPanel(history.map(h => h ? `${h.child}→${h.root}` : 'no-op'), 'History'), arrayPanel(answers, [], 'Queries', 'queries')], msg);
            const ops = lines.map((line, i) => { const parts = line.trim().split(/\s+/), cmd = parts[0]; if (id === 'dsu-rollback' && (cmd === 'snapshot' || cmd === 'rollback')) {
                requireCondition(parts.length === 2 && /^[A-Za-z0-9_-]{1,16}$/.test(parts[1]), `Tên snapshot dòng ${i + 1} không hợp lệ.`);
                return { cmd, name: parts[1], a: 0, b: 0 };
            } requireCondition((id === 'dsu-rollback' ? ['union', 'query'] : ['add', 'remove', 'query']).includes(cmd) && parts.length === 3, `Lệnh dòng ${i + 1} không hợp lệ.`); return { cmd, name: '', a: num(parts[1], 0, n - 1), b: num(parts[2], 0, n - 1) }; });
            draw('Mỗi node là root, history rỗng.');
            if (id === 'dsu-rollback') {
                for (const op of ops) {
                    r.consume();
                    if (op.cmd === 'union')
                        union(op.a, op.b);
                    else if (op.cmd === 'snapshot')
                        snapshots.set(op.name, history.length);
                    else if (op.cmd === 'rollback') {
                        const at = snapshots.get(op.name);
                        requireCondition(at !== undefined && at <= history.length, 'Snapshot không tồn tại hoặc đã ở tương lai.');
                        rollback(at);
                        for (const [name, index] of snapshots)
                            if (index > at)
                                snapshots.delete(name);
                    }
                    else
                        answers.push(dsu.find(op.a) === dsu.find(op.b) ? 'Có' : 'Không');
                    draw(`Thực hiện ${op.cmd} ${op.name || `${op.a} ${op.b}`}.`);
                }
                return { output: answers.at(-1) ?? 'Không có truy vấn' };
            }
            if (!ops.length)
                return { output: '' };
            const active = new Map<string, {
                start: number;
                a: number;
                b: number;
            }>(), lifetimes: {
                l: number;
                h: number;
                a: number;
                b: number;
            }[] = [];
            ops.forEach((op, t) => { if (op.cmd === 'query')
                return; const key = [op.a, op.b].sort((a, b) => a - b).join(':'); if (op.cmd === 'add') {
                requireCondition(!active.has(key), 'Add cạnh đang active.');
                active.set(key, { start: t, a: op.a, b: op.b });
            }
            else {
                const edge = active.get(key);
                requireCondition(edge, 'Remove cạnh chưa active.');
                lifetimes.push({ l: edge.start, h: t, a: edge.a, b: edge.b });
                active.delete(key);
            } });
            for (const edge of active.values())
                lifetimes.push({ l: edge.start, h: ops.length, a: edge.a, b: edge.b });
            const buckets: {
                a: number;
                b: number;
            }[][] = Array.from({ length: ops.length * 4 }, () => []);
            const add = (u: number, l: number, h: number, edge: typeof lifetimes[number]) => { r.consume(); if (edge.h <= l || h <= edge.l)
                return; if (edge.l <= l && h <= edge.h) {
                buckets[u].push(edge);
                return;
            } const m = (l + h) >> 1; add(u * 2, l, m, edge); add(u * 2 + 1, m, h, edge); };
            lifetimes.forEach(edge => add(1, 0, ops.length, edge));
            show([tablePanel(['edge', 'l', 'r'], lifetimes.map(e => [`${e.a}–${e.b}`, e.l, e.h]))], 'Chia time intervals vào các node phân đoạn thời gian.');
            const dfs = (u: number, l: number, h: number) => { r.consume(); const snapshot = history.length; buckets[u].forEach(e => union(e.a, e.b)); draw(`Vào time node [${l},${h}), snapshot=${snapshot}.`); if (h - l === 1) {
                const op = ops[l];
                if (op.cmd === 'query') {
                    answers.push(dsu.find(op.a) === dsu.find(op.b) ? 'Có' : 'Không');
                    draw(`Query tại t=${l}.`);
                }
            }
            else {
                const m = (l + h) >> 1;
                dfs(u * 2, l, m);
                dfs(u * 2 + 1, m, h);
            } rollback(snapshot); draw(`Rollback khi rời [${l},${h}).`); };
            dfs(1, 0, ops.length);
            return { output: answers.join(', ') };
        }
        const g = parseGraph(v.n, v.edges), adj = adjacency(g), root = num(v.root, 0, n - 1);
        requireCondition(g.edges.length === n - 1 && !g.edges.some(e => e.u === e.v), 'Input cần cây liên thông.');
        const parent = Array(n).fill(-1), depth = Array(n).fill(0), children: number[][] = Array.from({ length: n }, () => []), seen = new Set<number>(), order: number[] = [];
        const orient = (u: number, p: number) => { r.consume(); requireCondition(!seen.has(u), 'Input chứa chu trình.'); seen.add(u); parent[u] = p < 0 ? u : p; order.push(u); for (const { to } of adj[u])
            if (to !== p) {
                depth[to] = depth[u] + 1;
                children[u].push(to);
                orient(to, u);
            } };
        orient(root, -1);
        requireCondition(seen.size === n, 'Cây phải liên thông.');
        const levels = Math.max(1, Math.floor(Math.log2(n)) + 1), up = Array.from({ length: n }, () => Array(levels).fill(root));
        for (let u = 0; u < n; u++)
            up[u][0] = parent[u];
        for (let k = 1; k < levels; k++)
            for (let u = 0; u < n; u++)
                up[u][k] = up[up[u][k - 1]][k - 1];
        const pair = v.query.trim().split(/\s+/);
        requireCondition(pair.length === 2, 'Query dùng u v.');
        const qa = num(pair[0], 0, n - 1), qb = num(pair[1], 0, n - 1);
        const draw = (msg: string, active: number[] = [], extra: Panel[] = []) => show([graphPanel(g, active, [], Object.fromEntries(parent.map((p, u) => [u, `p=${p} d=${depth[u]}`]))), ...extra], msg);
        draw('Orient cây từ root; build ancestor table.', [], [tablePanel(['u', ...Array.from({ length: levels }, (_, i) => `2^${i}`)], up.map((row, u) => [u, ...row]))]);
        const lca = (a: number, b: number, visual = false) => { if (depth[a] < depth[b])
            [a, b] = [b, a]; let difference = depth[a] - depth[b]; for (let k = levels - 1; k >= 0; k--)
            if (difference & (1 << k)) {
                a = up[a][k];
                if (visual)
                    draw(`Nâng độ sâu bằng 2^${k}.`, [a, b]);
            } if (a === b)
            return a; for (let k = levels - 1; k >= 0; k--)
            if (up[a][k] !== up[b][k]) {
                a = up[a][k];
                b = up[b][k];
                if (visual)
                    draw(`Nâng cả hai tại level ${k}.`, [a, b]);
            } return parent[a]; };
        if (id === 'ancestor-table')
            return { output: `${levels} levels` };
        if (id === 'lca-query' || id === 'tree-distance') {
            const ancestor = lca(qa, qb, true), distance = depth[qa] + depth[qb] - 2 * depth[ancestor];
            draw(`LCA=${ancestor}, distance=${distance}.`, [qa, qb, ancestor]);
            return { output: String(id === 'lca-query' ? ancestor : distance) };
        }
        if (id.startsWith('hld-')) {
            const size = Array(n).fill(1), heavy = Array(n).fill(-1);
            for (const u of [...order].reverse())
                for (const child of children[u]) {
                    size[u] += size[child];
                    if (heavy[u] < 0 || size[child] > size[heavy[u]])
                        heavy[u] = child;
                }
            const head = Array(n).fill(root), position = Array(n).fill(0), linear: number[] = [];
            const decompose = (u: number, h: number) => { r.consume(); head[u] = h; position[u] = linear.length; linear.push(u); draw(`Đặt u=${u} vào chain head=${h}.`, [u], [arrayPanel(linear, [], 'HLD order', 'order')]); if (heavy[u] >= 0)
                decompose(heavy[u], h); for (const child of children[u])
                if (child !== heavy[u])
                    decompose(child, child); };
            decompose(root, root);
            if (id === 'hld-decompose')
                return { output: linear.join(', ') };
            const values = ints(v.a, 12);
            requireCondition(values.length === n, 'Cần đúng n giá trị trên nodes.');
            let a = qa, b = qb, total = 0;
            const ranges: [
                number,
                number
            ][] = [];
            const add = (l: number, h: number) => { ranges.push([l, h]); for (let i = l; i <= h; i++)
                total += values[linear[i]]; draw(`Query chain range [${l},${h}] và cộng ${total}.`, [a, b], [arrayPanel(linear.map(u => values[u]), Array.from({ length: h - l + 1 }, (_, i) => l + i), 'Linear values', 'values'), tablePanel(['l', 'r'], ranges)]); };
            while (head[a] !== head[b]) {
                r.consume();
                if (depth[head[a]] < depth[head[b]])
                    [a, b] = [b, a];
                add(position[head[a]], position[a]);
                a = parent[head[a]];
            }
            if (depth[a] > depth[b])
                [a, b] = [b, a];
            add(position[a], position[b]);
            return { output: String(total), summary: 'Path tách thành các đoạn chain; phép sum demo quét đoạn để người đọc thấy dữ liệu, không tuyên bố có segment tree tối ưu ở bước này.' };
        }
        const blocked = Array(n).fill(false), centroidParent = Array(n).fill(-1), paths: {
            centroid: number;
            distance: number;
        }[][] = Array.from({ length: n }, () => []);
        const centroidEdges: GraphPanel['edges'] = [];
        let first = -1;
        const collect = (u: number, p: number, list: number[]) => { r.consume(); list.push(u); for (const { to } of adj[u])
            if (to !== p && !blocked[to])
                collect(to, u, list); };
        const build = (entry: number, cp: number) => { r.consume(); const list: number[] = []; collect(entry, -1, list); const component = new Set(list); let centroid = list[0]; for (const candidate of list) {
            let largest = 0;
            for (const { to } of adj[candidate])
                if (component.has(to)) {
                    const part: number[] = [];
                    const walk = (u: number, p: number) => { r.consume(); part.push(u); for (const { to } of adj[u])
                        if (to !== p && to !== candidate && component.has(to))
                            walk(to, u); };
                    walk(to, candidate);
                    largest = Math.max(largest, part.length);
                }
            if (largest <= list.length / 2) {
                centroid = candidate;
                break;
            }
        } if (first < 0)
            first = centroid; centroidParent[centroid] = cp; if (cp >= 0)
            centroidEdges.push({ id: `${cp}:${centroid}`, from: String(cp), to: String(centroid), directed: true }); const distanceWalk = (u: number, p: number, d: number) => { r.consume(); paths[u].push({ centroid, distance: d }); for (const { to } of adj[u])
            if (to !== p && !blocked[to])
                distanceWalk(to, u, d + 1); }; distanceWalk(centroid, -1, 0); blocked[centroid] = true; draw(`Chọn centroid ${centroid}; mọi thành phần còn lại ≤ n/2.`, [centroid], [{ kind: 'graph', id: 'centroid', heading: 'Centroid tree', nodes: centroidParent.map((_, u) => ({ id: String(u), label: String(u), state: blocked[u] ? 'done' : 'muted' })), edges: centroidEdges }]); for (const { to } of adj[centroid])
            if (!blocked[to])
                build(to, centroid); };
        build(root, -1);
        if (id === 'centroid-build')
            return { output: String(first) };
        const lines = v.ops.trim() ? v.ops.trim().split('\n') : [];
        requireCondition(lines.length <= 24, 'Tối đa 24 red/query operations.');
        const ops = lines.map(line => { const p = line.trim().split(/\s+/); requireCondition(p.length === 2 && ['red', 'query'].includes(p[0]), 'Dùng red u / query u.'); return { cmd: p[0], u: num(p[1], 0, n - 1) }; });
        const best = Array(n).fill(Infinity), reds = new Set<number>(), answers: string[] = [];
        for (const op of ops) {
            r.consume();
            if (op.cmd === 'red') {
                reds.add(op.u);
                for (const p of paths[op.u])
                    best[p.centroid] = Math.min(best[p.centroid], p.distance);
                draw(`Activate red node ${op.u}; cập nhật các centroid ancestors.`, [op.u], [arrayPanel(best.map(x => x === Infinity ? '∞' : x), [], 'Best distance', 'best')]);
            }
            else {
                let answer = Infinity;
                for (const p of paths[op.u]) {
                    answer = Math.min(answer, p.distance + best[p.centroid]);
                    draw(`Query qua centroid ${p.centroid}.`, [op.u, p.centroid], [tablePanel(['centroid', 'distance', 'best'], [[p.centroid, p.distance, best[p.centroid] === Infinity ? '∞' : best[p.centroid]]])]);
                }
                answers.push(answer === Infinity ? 'Không có nút đỏ' : String(answer));
            }
        }
        return { output: answers.at(-1) ?? 'Không có truy vấn' };
    };
export const mountScenarioById = (id: string, root: HTMLElement) => mountFamily(id, root, definitions, builders);
