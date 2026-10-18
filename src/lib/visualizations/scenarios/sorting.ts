import { definitions } from '../catalog/sorting.mjs';
import { mountFamily, emit, type Builder } from '../core/scenario';
import { arrayPanel, tablePanel, type Panel } from '../core/scene';
import { parseIntegerArray, requireCondition } from '../core/input';
const builders: Record<string, Builder> = {};
for (const id of Object.keys(definitions))
    builders[id] = (v, r) => {
        const raw = parseIntegerArray(v.a);
        let a = raw.map((value, index) => ({ value, id: index }));
        if (id === 'counting-sort' && a.length)
            requireCondition(Math.max(...raw) - Math.min(...raw) <= 40, 'Khoảng giá trị tối đa 40.');
        if (id === 'radix-sort')
            requireCondition(raw.every(x => x >= 0), 'Radix mẫu này dùng số không âm.');
        if (id === 'bucket-sort')
            requireCondition(raw.every(x => x >= 0 && x <= 99), 'Bucket mẫu này dùng số 0–99.');
        let comparisons = 0, writes = 0;
        const show = (msg: string, active: number[] = [], extra: Panel[] = [], gap = -1, held?: typeof a[number]) => {
            const panel = arrayPanel(a.map((x, i) => i === gap ? '□' : x.value), active);
            panel.labels = a.map((x, i) => i === gap ? 'trống' : `#${x.id}`);
            panel.keys = a.map((x, i) => i === gap ? 'gap' : `item:${x.id}`);
            if (held) panel.held = { key: `item:${held.id}`, value: held.value, label: 'Key đang giữ', itemLabel: `#${held.id}` };
            emit(r, [panel, ...extra], msg, { comparisons, writes }, 'Sắp xếp');
        };
        const swap = (i: number, j: number) => { [a[i], a[j]] = [a[j], a[i]]; writes += 2; };
        show('Dãy ban đầu. # là ID gốc để theo dõi thứ tự phần tử bằng nhau.');
        if (id === 'selection-sort') {
            for (let i = 0; i < a.length; i++) {
                let best = i;
                for (let j = i + 1; j < a.length; j++) {
                    r.consume();
                    comparisons++;
                    if (a[j].value < a[best].value)
                        best = j;
                    show(`Tìm cực tiểu cho vị trí ${i}.`, [best, j]);
                }
                swap(i, best);
                show(`Đặt cực tiểu tại ${i}.`, [i]);
            }
        }
        else if (id === 'insertion-sort') {
            for (let i = 1; i < a.length; i++) {
                const key = a[i];
                let j = i - 1;
                show(`Giữ key=${key.value}, ID #${key.id} riêng.`, [i], [], i, key);
                while (j >= 0) {
                    comparisons++;
                    if (a[j].value <= key.value)
                        break;
                    a[j + 1] = a[j];
                    writes++;
                    show(`Dịch #${a[j].id} sang phải; ô ${j} là khoảng trống đang di chuyển.`, [j, j + 1], [tablePanel(['key', 'ID', 'ô trống'], [[key.value, key.id, j]], 'Key và khoảng trống', 'key')], j, key);
                    j--;
                }
                a[j + 1] = key;
                writes++;
                show(`Chèn key tại ${j + 1}; phần tử bằng key không bị vượt qua.`, [j + 1]);
            }
        }
        else if (id === 'bubble-sort') {
            for (let end = a.length - 1; end > 0; end--) {
                let changed = false;
                for (let j = 0; j < end; j++) {
                    comparisons++;
                    show(`So hai ô ${j}, ${j + 1}.`, [j, j + 1]);
                    if (a[j].value > a[j + 1].value) {
                        swap(j, j + 1);
                        changed = true;
                        show('Đổi chỗ cặp ngược thứ tự.', [j, j + 1]);
                    }
                }
                if (!changed)
                    break;
            }
        }
        else if (id === 'merge-sort' || id === 'merge-call-tree') {
            const calls: {
                id: number;
                parent: number | null;
                l: number;
                h: number;
                depth: number;
                done: boolean;
            }[] = [];
            const tree = (): import('../core/scene').GraphPanel => ({ kind: 'graph', id: 'calls', heading: 'Cây chia và ghép', nodes: calls.map(c => ({ id: String(c.id), label: `[${c.l},${c.h})`, detail: c.done ? 'đã ghép' : 'đang xử lý', state: c.done ? 'done' : 'active', x: 30 + (c.l + c.h) / 2 / Math.max(1, a.length) * 380, y: 28 + c.depth / Math.max(1, Math.ceil(Math.log2(Math.max(1, a.length)))) * 230 })), edges: calls.filter(c => c.parent !== null).map(c => ({ id: String(c.id), from: String(c.parent), to: String(c.id), directed: true })) });
            const merge = (l: number, h: number, depth: number, parent: number | null = null) => {
                r.consume();
                const callId = calls.length;
                calls.push({ id: callId, parent, l, h, depth, done: false });
                show(`Gọi merge [${l},${h}), depth=${depth}.`, [l], [tree()]);
                if (h - l <= 1) {
                    calls[callId].done = true;
                    show('Base case: một hoặc không phần tử đã có thứ tự.', [], [tree()]);
                    return;
                }
                const m = (l + h) >> 1;
                merge(l, m, depth + 1, callId);
                merge(m, h, depth + 1, callId);
                const left = a.slice(l, m), right = a.slice(m, h);
                let i = 0, j = 0, k = l;
                while (i < left.length || j < right.length) {
                    r.consume();
                    if (i < left.length && j < right.length)
                        comparisons++;
                    a[k++] = j === right.length || (i < left.length && left[i].value <= right[j].value) ? left[i++] : right[j++];
                    writes++;
                    show(`Trộn vào ô ${k - 1}; ưu tiên bên trái khi bằng nhau.`, [k - 1], [tree(), arrayPanel(left.map(x => x.value), [], 'Nửa trái', 'left'), arrayPanel(right.map(x => x.value), [], 'Nửa phải', 'right')]);
                }
                calls[callId].done = true;
                show(`Đã ghép [${l},${h}).`, [], [tree()]);
            };
            merge(0, a.length, 0);
        }
        else if (id === 'quick-sort') {
            const quick = (l: number, h: number) => { r.consume(); if (l >= h)
                return; const pivot = a[h].value; let p = l; for (let j = l; j < h; j++) {
                comparisons++;
                show(`Lomuto: pivot=${pivot}, xét ô ${j}.`, [j, h, p]);
                if (a[j].value <= pivot) {
                    const target = p++;
                    swap(target, j);
                    if (target !== j) show(`Đổi ô ${target} và ${j} vào vùng ≤ pivot.`, [target, j, h]);
                }
            } swap(p, h); show(`Pivot về vị trí ${p}.`, [p]); quick(l, p - 1); quick(p + 1, h); };
            quick(0, a.length - 1);
        }
        else if (id === 'heap-sort') {
            const sift = (i: number, n: number) => { while (true) {
                r.consume();
                let best = i;
                for (const c of [i * 2 + 1, i * 2 + 2])
                    if (c < n) {
                        comparisons++;
                        if (a[c].value > a[best].value)
                            best = c;
                    }
                if (best === i)
                    return;
                swap(i, best);
                show('Sift-down giữ max-heap.', [i, best]);
                i = best;
            } };
            for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--)
                sift(i, a.length);
            for (let end = a.length - 1; end > 0; end--) {
                swap(0, end);
                show(`Cực đại tới ${end}.`, [end]);
                sift(0, end);
            }
        }
        else if (id === 'counting-sort') {
            if (a.length) {
                const min = Math.min(...raw), max = Math.max(...raw);
                const counts = Array(max - min + 1).fill(0);
                for (const x of a) {
                    counts[x.value - min]++;
                    show(`Đếm giá trị ${x.value}.`, [], [tablePanel(['Giá trị', 'Số lần'], counts.map((n, i) => [i + min, n]))]);
                }
                const out: typeof a = [];
                for (let value = min; value <= max; value++)
                    for (const x of a)
                        if (x.value === value) {
                            out.push(x);
                            writes++;
                        }
                a = out;
                show('Xuất theo giá trị tăng, giữ ID gốc khi bằng nhau.');
            }
        }
        else if (id === 'radix-sort') {
            const max = Math.max(0, ...raw);
            for (let exp = 1; exp <= max; exp *= 10) {
                const buckets: typeof a[] = Array.from({ length: 10 }, () => []);
                for (const x of a) {
                    r.consume();
                    buckets[Math.floor(x.value / exp) % 10].push(x);
                }
                show(`Phân bucket chữ số hàng ${exp}.`, [], [tablePanel(['Digit', 'Các ID'], buckets.map((b, i) => [i, b.map(x => `${x.value}#${x.id}`).join(' ')]))]);
                a = buckets.flat();
                writes += a.length;
                show(`Ghép ổn định sau hàng ${exp}.`);
            }
        }
        else {
            const buckets: typeof a[] = Array.from({ length: 10 }, () => []);
            for (const x of a)
                buckets[Math.floor(x.value / 10)].push(x);
            show('Chia 10 bucket theo hàng chục.', [], [tablePanel(['Bucket', 'Giá trị'], buckets.map((b, i) => [i, b.map(x => x.value).join(' ')]))]);
            for (const b of buckets)
                for (let i = 1; i < b.length; i++) {
                    const key = b[i];
                    let j = i - 1;
                    while (j >= 0 && b[j].value > key.value) {
                        comparisons++;
                        b[j + 1] = b[j--];
                    }
                    b[j + 1] = key;
                }
            a = buckets.flat();
            writes += a.length;
        }
        show('Hoàn tất: dãy đã sắp tăng không giảm.');
        return { output: a.map(x => x.value).join(', '), summary: 'ID gốc cho thấy tính ổn định hoặc sự đổi thứ tự của thuật toán.' };
    };
export const mountScenarioById = (id: string, root: HTMLElement) => mountFamily(id, root, definitions, builders);
