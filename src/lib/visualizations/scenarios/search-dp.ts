import { definitions } from '../catalog/search-dp.mjs';
import { mountFamily, emit, type Builder } from '../core/scenario';
import { arrayPanel, tablePanel, stackPanel, stringPanel } from '../core/scene';
import { parseInteger as num, parseIntegerArray as ints, parseText, parseGraph, requireCondition } from '../core/input';
const builders: Record<string, Builder> = {};
for (const id of Object.keys(definitions))
    builders[id] = (v, r) => {
        if (id === 'factorial-stack' || id === 'fibonacci-calls') {
            const n = num(v.n, 0, id === 'factorial-stack' ? 12 : 8), stack: number[] = [], completed: (string | number)[][] = [];
            const leaves = (x: number): number => id === 'factorial-stack' || x <= 1 ? 1 : leaves(x - 1) + leaves(x - 2);
            const treeWidth = Math.max(280, leaves(n) * 76 + 70);
            const calls: {
                id: number;
                parent: number | null;
                n: number;
                depth: number;
                x: number;
                result: string | null;
            }[] = [];
            const tree = (): import('../core/scene').GraphPanel => ({ kind: 'graph', id: 'calls', heading: 'Cây gọi thực tế', width: treeWidth, height: Math.max(150, 95 + n * 88), nodes: calls.map(c => ({ id: String(c.id), label: `${id === 'factorial-stack' ? 'fact' : 'fib'}(${c.n})`, detail: c.result === null ? 'đang xử lý' : `return ${c.result}`, state: c.result === null ? 'active' : 'done', x: c.x, y: 35 + c.depth * 88 })), edges: calls.filter(c => c.parent !== null).map(c => ({ id: String(c.id), from: String(c.parent), to: String(c.id), directed: true })) });
            const call = (x: number, parent: number | null = null, depth = 0, cx = treeWidth / 2): bigint => {
                r.consume();
                const callId = calls.length;
                calls.push({ id: callId, parent, n: x, depth, x: cx, result: null });
                stack.push(x);
                emit(r, [tree(), stackPanel(stack.map(k => `${id === 'factorial-stack' ? 'fact' : 'fib'}(${k})`)), tablePanel(['n', 'return'], completed.slice(-12))], `Gọi với n=${x}; tạo node #${callId} với parent #${parent ?? 'root'}.`, { depth: stack.length }, 'Gọi hàm');
                const result = id === 'factorial-stack' ? (x <= 1 ? 1n : BigInt(x) * call(x - 1, callId, depth + 1, cx)) : (x <= 1 ? BigInt(x) : call(x - 1, callId, depth + 1, cx - leaves(x - 2) * 38) + call(x - 2, callId, depth + 1, cx + leaves(x - 1) * 38));
                stack.pop();
                completed.push([x, String(result)]);
                calls[callId].result = String(result);
                emit(r, [tree(), stackPanel(stack), tablePanel(['n', 'return'], completed.slice(-12))], `Trả ${result} từ node #${callId}.`, { depth: stack.length }, 'Trả về');
                return result;
            };
            return { output: String(call(n)) };
        }
        if (id === 'binary-configurations') {
            const n = num(v.n, 0, 6), bits: number[] = [], results: string[] = [];
            const rec = (i: number) => { r.consume(); if (i === n) {
                results.push(bits.join(''));
                emit(r, [arrayPanel(bits), tablePanel(['#', 'Dãy bit'], results.map((s, k) => [k, s || 'ε']))], 'Xuất một cấu hình đầy đủ.', { count: results.length });
                return;
            } for (const b of [0, 1]) {
                bits.push(b);
                emit(r, [arrayPanel(bits, [i])], `Chọn bit ${b} tại ${i}.`);
                rec(i + 1);
                bits.pop();
            } };
            rec(0);
            return { output: String(results.length) };
        }
        if (id === 'next-permutation') {
            const a = ints(v.a);
            emit(r, [arrayPanel(a)], 'Tìm pivot từ phải.');
            let i = a.length - 2;
            while (i >= 0 && a[i] >= a[i + 1]) {
                emit(r, [arrayPanel(a, [i, i + 1])], 'Suffix vẫn không tăng.');
                i--;
            }
            if (i >= 0) {
                let j = a.length - 1;
                while (a[j] <= a[i])
                    j--;
                [a[i], a[j]] = [a[j], a[i]];
                emit(r, [arrayPanel(a, [i, j])], 'Đổi pivot với giá trị lớn hơn gần nhất.');
            }
            const tail = a.slice(i + 1).reverse();
            a.splice(i + 1, tail.length, ...tail);
            emit(r, [arrayPanel(a)], i < 0 ? 'Hoán vị cuối: quay về hoán vị đầu.' : 'Đảo suffix thành tăng dần.');
            return { output: a.join(', ') };
        }
        if (id === 'n-queens') {
            const n = num(v.n, 1, 6), queens: number[] = [], solutions: number[][] = [];
            let work = 0;
            const draw = (msg: string, row: number, col: number) => emit(r, [{ kind: 'board', id: 'board', heading: 'Bàn cờ', size: n, pieces: queens.map((c, i) => [i, c]), active: row < n ? [[row, col]] : [] }], msg, { solutions: solutions.length, row }, 'Quay lui');
            const rec = (row: number) => { if (++work > 25000)
                throw new Error('N-Queens vượt giới hạn công việc.'); r.consume(); if (row === n) {
                solutions.push([...queens]);
                draw('Một nghiệm hợp lệ.', row, 0);
                return;
            } for (let col = 0; col < n; col++) {
                r.consume();
                const ok = queens.every((c, i) => c !== col && Math.abs(c - col) !== row - i);
                if (!ok) {
                    draw('Cắt nhánh: trùng cột hoặc đường chéo.', row, col);
                    continue;
                }
                queens.push(col);
                draw('Đặt quân hậu và xét hàng tiếp.', row, col);
                rec(row + 1);
                queens.pop();
                draw('Backtrack: bỏ quân vừa đặt.', row, col);
            } };
            draw('Bắt đầu bàn cờ rỗng.', 0, 0);
            rec(0);
            draw(`Có ${solutions.length} nghiệm.`, n, 0);
            return { output: String(solutions.length) };
        }
        if (id === 'interval-scheduling') {
            const lines = v.intervals.trim() ? v.intervals.trim().split('\n') : [];
            requireCondition(lines.length <= 12, 'Tối đa 12 khoảng.');
            const intervals = lines.map((line, i) => { const p = line.trim().split(/\s+/); requireCondition(p.length === 2, 'Mỗi dòng start end.'); const start = num(p[0], 0, 100), end = num(p[1], start + 1, 100); return { start, end, label: String(i), state: 'muted' as 'active' | 'done' | 'muted' }; });
            const order = intervals.map((iv, i) => ({ iv, i })).sort((a, b) => a.iv.end - b.iv.end || a.i - b.i);
            const chosen: number[] = [];
            let end = -Infinity;
            emit(r, [{ kind: 'intervals', id: 'intervals', heading: 'Các khoảng', intervals }], 'Sắp theo thời điểm kết thúc.');
            for (const { iv, i } of order) {
                iv.state = 'active';
                emit(r, [{ kind: 'intervals', id: 'intervals', heading: 'Các khoảng', intervals }], `Xét khoảng ${i}.`);
                if (iv.start >= end) {
                    chosen.push(i);
                    end = iv.end;
                    iv.state = 'done';
                }
                else
                    iv.state = 'muted';
                emit(r, [{ kind: 'intervals', id: 'intervals', heading: 'Các khoảng', intervals }], iv.state === 'done' ? 'Chọn khoảng: không giao phần đã chọn.' : 'Loại khoảng bị giao.');
            }
            return { output: chosen.join(', ') };
        }
        if (id === 'greedy-coin-counterexample') {
            const coins = ints(v.coins, 8);
            requireCondition(coins.length && coins.every(x => x > 0), 'Cần mệnh giá dương.');
            const amount = num(v.amount, 0, 30);
            const sorted = [...coins].sort((a, b) => b - a);
            let rem = amount, count = 0;
            const chosen: number[] = [];
            for (const c of sorted)
                while (rem >= c) {
                    r.consume();
                    rem -= c;
                    count++;
                    chosen.push(c);
                    emit(r, [arrayPanel(chosen, [], 'Greedy'), tablePanel(['còn lại'], [[rem]])], 'Greedy lấy đồng lớn nhất có thể.');
                }
            const dp = Array(amount + 1).fill(Infinity);
            dp[0] = 0;
            emit(r, [arrayPanel(dp.map(x => Number.isFinite(x) ? x : '∞'), [], 'DP', 'dp')], 'Tính tối ưu để đối chiếu.');
            for (let s = 1; s <= amount; s++) {
                for (const c of coins)
                    if (c <= s)
                        dp[s] = Math.min(dp[s], dp[s - c] + 1);
                emit(r, [arrayPanel(dp.map(x => Number.isFinite(x) ? x : '∞'), [s], 'DP', 'dp')], `Đáp án tối ưu tại ${s}.`);
            }
            return { output: `greedy=${rem ? 'không có' : count}; optimal=${Number.isFinite(dp[amount]) ? dp[amount] : 'không có'}` };
        }
        if (id === 'stairs-memo' || id === 'stairs-bottom-up') {
            const n = num(v.n, 0, 20), dp: (number | string)[] = Array(n + 1).fill('—');
            dp[0] = 1;
            const draw = (msg: string, i: number) => emit(r, [arrayPanel(dp, [i], 'dp')], msg, { i }, 'DP');
            draw('Có 1 cách đi tới bậc 0.', 0);
            if (id === 'stairs-memo') {
                const rec = (x: number): number => { r.consume(); if (x < 0)
                    return 0; if (typeof dp[x] === 'number') {
                    draw(`Dùng memo[${x}].`, x);
                    return dp[x] as number;
                } dp[x] = rec(x - 1) + rec(x - 2); draw(`Lưu memo[${x}].`, x); return dp[x] as number; };
                rec(n);
            }
            else
                for (let i = 1; i <= n; i++) {
                    dp[i] = Number(dp[i - 1]) + (i > 1 ? Number(dp[i - 2]) : 0);
                    draw(`dp[${i}]=dp[${i - 1}]+dp[${i - 2}].`, i);
                }
            return { output: String(dp[n]) };
        }
        if (id === 'lis-dp') {
            const a = ints(v.a), dp = Array(a.length).fill(1), parent = Array(a.length).fill(-1);
            emit(r, [arrayPanel(a), arrayPanel(dp, [], 'Độ dài', 'dp')], 'Mỗi ô tự tạo subsequence dài 1.');
            for (let i = 0; i < a.length; i++) {
                for (let j = 0; j < i; j++) {
                    r.consume();
                    if (a[j] < a[i] && dp[j] + 1 > dp[i]) {
                        dp[i] = dp[j] + 1;
                        parent[i] = j;
                    }
                    emit(r, [arrayPanel(a, [j, i]), arrayPanel(dp, [i], 'DP', 'dp'), arrayPanel(parent, [i], 'Parent', 'parent')], `Xét nối ${j} → ${i}, chỉ nối khi a[j]<a[i].`);
                }
            }
            let best = -1;
            for (let i = 0; i < a.length; i++)
                if (best < 0 || dp[i] > dp[best])
                    best = i;
            const out: number[] = [];
            for (let i = best; i >= 0; i = parent[i])
                out.push(a[i]);
            out.reverse();
            emit(r, [arrayPanel(out, [], 'LIS')], 'Truy vết theo parent.');
            return { output: `${out.length}: ${out.join(', ')}` };
        }
        if (id === 'edit-distance') {
            const a = parseText(v.text, 16), b = parseText(v.pattern, 16), dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
            for (let i = 0; i <= a.length; i++)
                dp[i][0] = i;
            for (let j = 0; j <= b.length; j++)
                dp[0][j] = j;
            const draw = (i: number, j: number, msg: string) => emit(r, [stringPanel(a, [], 'Text'), stringPanel(b, [], 'Pattern', 'pattern'), tablePanel(['', 'ε', ...b], dp.map((row, k) => [k ? a[k - 1] : 'ε', ...row]), 'Edit distance', 'dp', [[i, j + 1]])], msg);
            draw(0, 0, 'Khởi tạo thêm/xóa với chuỗi rỗng.');
            for (let i = 1; i <= a.length; i++)
                for (let j = 1; j <= b.length; j++) {
                    r.consume();
                    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]));
                    draw(i, j, `dp[${i}][${j}]=${dp[i][j]}; đơn vị Unicode code point.`);
                }
            return { output: String(dp[a.length][b.length]) };
        }
        if (id === 'hamilton-certificate') {
            const g = parseGraph(v.n, v.edges);
            requireCondition(g.n <= 8, 'Tối đa 8 đỉnh.');
            const cert = ints(v.certificate, 8);
            emit(r, [arrayPanel(cert, [], 'Chứng chỉ')], 'Kiểm tra độ dài, đỉnh và mỗi cạnh kể cả cạnh đóng.');
            if (cert.length !== g.n || new Set(cert).size !== g.n || cert.some(x => x < 0 || x >= g.n)) {
                emit(r, [arrayPanel(cert)], 'Chứng chỉ thiếu hoặc trùng đỉnh.');
                return { output: 'Không hợp lệ' };
            }
            for (let i = 0; i < cert.length; i++) {
                const u = cert[i], w = cert[(i + 1) % cert.length], ok = g.edges.some(e => (e.u === u && e.v === w) || (e.u === w && e.v === u));
                emit(r, [arrayPanel(cert, [i, (i + 1) % cert.length])], `Kiểm tra cạnh ${u}–${w}: ${ok ? 'có' : 'không'}.`);
                if (!ok)
                    return { output: 'Không hợp lệ' };
            }
            return { output: 'Hợp lệ' };
        }
        const weights = ints(v.weights, 10), values = ints(v.values, 10), capacity = num(v.capacity, 0, 30);
        requireCondition(weights.length === values.length && weights.every(w => w > 0) && values.every(x => x >= 0), 'Item cần trọng lượng dương, giá trị không âm và hai dãy cùng độ dài.');
        if (id === 'knapsack-branch-bound') {
            const items = weights.map((w, i) => ({ w, value: values[i], id: i })).sort((a, b) => b.value * a.w - a.value * b.w || a.id - b.id);
            let best = 0;
            const stack: string[] = [], choice: number[] = [];
            const bound = (i: number, w: number, value: number) => { let rem = capacity - w, total = BigInt(value), fractionN = 0n, fractionD = 1n; for (let k = i; k < items.length; k++) {
                const x = items[k];
                if (x.w <= rem) {
                    total += BigInt(x.value);
                    rem -= x.w;
                }
                else {
                    fractionN = BigInt(rem) * BigInt(x.value);
                    fractionD = BigInt(x.w);
                    break;
                }
            } return { n: total * fractionD + fractionN, d: fractionD }; };
            const rec = (i: number, w: number, value: number) => { r.consume(); const b = bound(i, w, value); stack.push(`i=${i} w=${w} v=${value}`); emit(r, [stackPanel(stack), arrayPanel(choice, [], 'Item đã chọn'), tablePanel(['best', 'bound'], [[best, `${b.n}/${b.d}`]])], `Upper bound chính xác ${b.n}/${b.d}.`); if (b.n <= BigInt(best) * b.d) {
                emit(r, [stackPanel(stack)], 'Cắt nhánh: bound không vượt best.');
                stack.pop();
                return;
            } if (i === items.length) {
                best = Math.max(best, value);
                stack.pop();
                return;
            } const x = items[i]; if (w + x.w <= capacity) {
                choice.push(x.id);
                rec(i + 1, w + x.w, value + x.value);
                choice.pop();
            } rec(i + 1, w, value); stack.pop(); };
            emit(r, [arrayPanel(weights)], 'Sắp item theo tỉ lệ giá trị/trọng lượng.');
            rec(0, 0, 0);
            emit(r, [tablePanel(['best'], [[best]])], 'Hoàn tất branch-and-bound.');
            return { output: String(best) };
        }
        const dp = Array.from({ length: weights.length + 1 }, () => Array(capacity + 1).fill(0));
        const draw = (i: number, c: number, msg: string) => emit(r, [tablePanel(['i/c', ...Array.from({ length: capacity + 1 }, (_, j) => String(j))], dp.map((row, j) => [j, ...row]), 'Knapsack', 'dp', [[i, c + 1]])], msg);
        draw(0, 0, 'dp[0][c]=0.');
        for (let i = 1; i <= weights.length; i++)
            for (let c = 0; c <= capacity; c++) {
                r.consume();
                dp[i][c] = dp[i - 1][c];
                if (weights[i - 1] <= c)
                    dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - weights[i - 1]] + values[i - 1]);
                draw(i, c, `Item ${i - 1}: so bỏ qua với lấy đúng một lần.`);
            }
        const selected: number[] = [];
        let c = capacity;
        for (let i = weights.length; i > 0; i--)
            if (dp[i][c] !== dp[i - 1][c]) {
                selected.push(i - 1);
                c -= weights[i - 1];
            }
        emit(r, [arrayPanel(selected.reverse(), [], 'Item truy vết')], 'Truy vết nghiệm từ bảng DP.');
        return { output: String(dp[weights.length][capacity]) };
    };
export const mountScenarioById = (id: string, root: HTMLElement) => mountFamily(id, root, definitions, builders);
