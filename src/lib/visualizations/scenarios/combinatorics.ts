import { definitions } from '../catalog/combinatorics.mjs';
import { mountFamily, emit, type Builder } from '../core/scenario';
import { arrayPanel, tablePanel } from '../core/scene';
import { parseInteger as num, parseIntegerArray as ints, requireCondition } from '../core/input';
import { gcd } from '../core/math';
const builders: Record<string, Builder> = {};
for (const id of Object.keys(definitions))
    builders[id] = (v, r) => {
        if (id === 'permutations-count' || id === 'combinations-count') {
            const n = num(v.n, 0, 20), k = num(v.k, 0, n);
            let result = 1n;
            emit(r, [tablePanel(['n', 'k', 'result'], [[n, k, '1']])], 'Trường hợp chọn 0 phần tử có 1 cách.');
            const limit = id === 'combinations-count' ? Math.min(k, n - k) : k;
            for (let i = 1; i <= limit; i++) {
                r.consume();
                result *= BigInt(n - i + 1);
                if (id === 'combinations-count')
                    result /= BigInt(i);
                emit(r, [tablePanel(['bước', 'factor', 'result'], [[i, `${n - i + 1}${id === 'combinations-count' ? ` / ${i}` : ''}`, String(result)]])], id === 'combinations-count' ? 'Nhân rồi chia chính xác để loại thứ tự.' : 'Chọn có thứ tự, mỗi bước giảm số lựa chọn.');
            }
            return { output: String(result) };
        }
        if (id === 'inclusion-exclusion') {
            const sets = [new Set(ints(v.a, 16)), new Set(ints(v.b, 16)), new Set(ints(v.x, 16))];
            let total = 0;
            const rows: (string | number)[][] = [];
            for (let mask = 1; mask < 8; mask++) {
                r.consume();
                const chosen = sets.filter((_, i) => mask & (1 << i));
                const intersection = [...chosen[0]].filter(x => chosen.every(s => s.has(x))), sign = chosen.length % 2 ? 1 : -1;
                total += sign * intersection.length;
                rows.push([mask, sign, intersection.join(', '), total]);
                emit(r, [tablePanel(['mask', 'dấu', 'giao', 'tổng'], rows), ...sets.map((s, i) => arrayPanel([...s], [], `Tập ${String.fromCharCode(65 + i)}`, `set${i}`))], 'Cộng giao số tập lẻ, trừ giao số tập chẵn.');
            }
            return { output: String(total) };
        }
        const n = num(v.n, 1, 16);
        const outcomes = Array.from({ length: n }, (_, i) => i + 1);
        const fractions = (a: bigint, b: bigint) => { const g = gcd(a, b); return `${a / g}/${b / g}`; };
        if (id === 'expectation') {
            let sum = 0n;
            for (const x of outcomes) {
                sum += BigInt(x);
                emit(r, [arrayPanel(outcomes, [x - 1], 'Outcomes'), tablePanel(['Σx', 'n', 'E'], [[String(sum), n, `${sum}/${n}`]])], 'Mỗi outcome có xác suất 1/n; cộng đóng góp x/n.');
            }
            return { output: fractions(sum, BigInt(n)), summary: `Phân số chính xác; xấp xỉ ${Number(sum) / n}.` };
        }
        const A = new Set(ints(v.a, 16)), B = id === 'conditional-probability' ? new Set(ints(v.b, 16)) : new Set(outcomes);
        requireCondition([...A, ...B].every(x => x >= 1 && x <= n), 'Biến cố chỉ chứa outcomes 1..n.');
        let count = 0;
        const rows: (string | number)[][] = [];
        for (const x of outcomes) {
            r.consume();
            const inside = A.has(x) && B.has(x);
            if (inside)
                count++;
            rows.push([x, A.has(x) ? 'A' : '—', B.has(x) ? 'B' : '—', inside ? 'A∩B' : '—']);
            emit(r, [tablePanel(['outcome', 'A', 'B', 'giao'], rows)], `Enumerate outcome ${x}.`);
        }
        if (!B.size)
            return { output: 'Không xác định', summary: 'P(B)=0 nên không thể tính P(A|B).' };
        return { output: fractions(BigInt(count), BigInt(B.size)), summary: `Phân số chính xác; xấp xỉ ${count / B.size}.` };
    };
export const mountScenarioById = (id: string, root: HTMLElement) => mountFamily(id, root, definitions, builders);
