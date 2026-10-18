import { definitions } from '../catalog/games.mjs';
import { mountFamily, emit, type Builder } from '../core/scenario';
import { arrayPanel, tablePanel, type GraphPanel } from '../core/scene';
import { parseIntegerArray as ints, parseGraph, adjacency, requireCondition } from '../core/input';
import { graphPanel } from '../core/graph';
const builders: Record<string, Builder> = {};
for (const id of Object.keys(definitions))
    builders[id] = (v, r) => {
        if (id.startsWith('nim-')) {
            const a = ints(v.a, 8);
            requireCondition(a.every(x => x >= 0 && x <= 20), 'Piles là số 0–20.');
            let xor = 0;
            emit(r, [arrayPanel(a, [], 'Piles')], 'Normal play: người lấy viên cuối thắng.');
            a.forEach((x, i) => { xor ^= x; emit(r, [arrayPanel(a, [i]), tablePanel(['XOR'], [[xor]])], `XOR với pile ${i}=${x}.`); });
            if (id === 'nim-xor')
                return { output: String(xor) };
            if (!xor)
                return { output: 'Không có nước thắng' };
            for (let i = 0; i < a.length; i++) {
                const next = a[i] ^ xor;
                if (next < a[i]) {
                    emit(r, [arrayPanel(a, [i]), tablePanel(['pile', 'before', 'after'], [[i, a[i], next]])], 'Giảm pile này để tổng XOR trở về 0.');
                    return { output: `${i}: ${a[i]}→${next}` };
                }
            }
            throw new Error('Không tìm được nước đi mặc dù XOR khác 0.');
        }
        if (id === 'grundy-mex') {
            const g = parseGraph(v.n, v.edges, true), adj = adjacency(g), colors = Array(g.n).fill(0), grundy = Array(g.n).fill(-1);
            const solve = (u: number): number => { r.consume(); if (colors[u] === 1)
                throw new Error('Grundy yêu cầu DAG, input chứa chu trình.'); if (colors[u] === 2)
                return grundy[u]; colors[u] = 1; const reachable = new Set(adj[u].map(e => solve(e.to))); let mex = 0; while (reachable.has(mex))
                mex++; grundy[u] = mex; colors[u] = 2; emit(r, [graphPanel(g, [u], [], Object.fromEntries(grundy.map((x, i) => [i, `g=${x}`]))), arrayPanel([...reachable], [], 'Grundy các nước tới', 'next')], `mex của tập reachable = ${mex}.`); return mex; };
            emit(r, [graphPanel(g)], 'Tính Grundy từ trạng thái cuối lên.');
            for (let u = 0; u < g.n; u++)
                solve(u);
            return { output: grundy.join(', ') };
        }
        const leaves = ints(v.a, 16);
        requireCondition(leaves.length > 0 && (leaves.length & (leaves.length - 1)) === 0, 'Số lá phải là lũy thừa 2, từ 1 đến 16.');
        const depth = Math.log2(leaves.length), count = 2 * leaves.length - 1, values: (number | string)[] = Array(count).fill('—'), pruned = new Set<number>(), active = new Set<number>();
        for (let i = 0; i < leaves.length; i++)
            values[leaves.length - 1 + i] = leaves[i];
        const graph = (): GraphPanel => ({ kind: 'graph', id: 'game', heading: 'Cây MAX / MIN', nodes: values.map((value, i) => { const d = Math.floor(Math.log2(i + 1)), slot = i - (2 ** d - 1); return { id: String(i), label: String(value), detail: d === depth ? 'leaf' : d % 2 ? 'MIN' : 'MAX', state: pruned.has(i) ? 'muted' : active.has(i) ? 'active' : typeof value === 'number' ? 'done' : undefined, x: (slot + .5) / 2 ** d * 400 + 20, y: 30 + d * 60 }; }), edges: Array.from({ length: count - 1 }, (_, k) => ({ id: String(k + 1), from: String(Math.floor(k / 2)), to: String(k + 1), directed: true, state: pruned.has(k + 1) ? 'muted' : undefined })) });
        const mute = (u: number) => { if (u >= count)
            return; pruned.add(u); mute(u * 2 + 1); mute(u * 2 + 2); };
        const rec = (u: number, d: number, alpha: number, beta: number): number => { r.consume(); active.add(u); emit(r, [graph(), tablePanel(['alpha', 'beta'], [[String(alpha), String(beta)]])], `Vào node ${u} ${d % 2 ? 'MIN' : 'MAX'}.`); if (d === depth) {
            active.delete(u);
            return values[u] as number;
        } let best = d % 2 ? Infinity : -Infinity; for (const child of [u * 2 + 1, u * 2 + 2]) {
            const value = rec(child, d + 1, alpha, beta);
            best = d % 2 ? Math.min(best, value) : Math.max(best, value);
            values[u] = best;
            if (d % 2)
                beta = Math.min(beta, best);
            else
                alpha = Math.max(alpha, best);
            emit(r, [graph(), tablePanel(['alpha', 'beta'], [[String(alpha), String(beta)]])], `Cập nhật node ${u}=${best}.`);
            if (id === 'alpha-beta' && alpha >= beta) {
                if (child === u * 2 + 1)
                    mute(u * 2 + 2);
                emit(r, [graph()], 'Cắt nhánh khi alpha ≥ beta; các lá mờ chưa được đánh giá.');
                break;
            }
        } active.delete(u); return best; };
        emit(r, [graph()], 'Cùng cây và thứ tự lá cho minimax / alpha-beta.');
        const out = rec(0, 0, -Infinity, Infinity);
        emit(r, [graph()], 'Giá trị minimax tại root.');
        return { output: String(out) };
    };
export const mountScenarioById = (id: string, root: HTMLElement) => mountFamily(id, root, definitions, builders);
