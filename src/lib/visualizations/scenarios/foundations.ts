import { definitions } from '../catalog/foundations.mjs';
import { mountFamily, emit, type Builder } from '../core/scenario';
import { arrayPanel, tablePanel, stackPanel, type Panel } from '../core/scene';
import { parseInteger as num, parseIntegerArray as ints, parseText, requireCondition } from '../core/input';
const builders: Record<string, Builder> = {};
for (const id of Object.keys(definitions))
    builders[id] = (v, r) => {
        const a = v.a !== undefined ? ints(v.a) : [];
        const show = (msg: string, active: number[] = [], extra: Panel[] = [], vars: Record<string, string | number> = {}) => emit(r, [arrayPanel(a, active), ...extra], msg, vars);
        if (id === 'scan-maximum') {
            let best: number | undefined;
            show('Khởi tạo: chưa thấy phần tử.');
            a.forEach((x, i) => { r.consume(); best = best === undefined ? x : Math.max(best, x); show(`Sau khi đọc ô ${i}, max=${best}.`, [i], [], { max: best }); });
            show('Kết thúc quét.');
            return { output: best === undefined ? 'Rỗng' : String(best) };
        }
        if (['linear-count', 'nested-loop-count', 'halving-count', 'dynamic-capacity'].includes(id)) {
            const n = num(v.n, 0, 12);
            let count = 0, cap = 0;
            emit(r, [tablePanel(['n', 'đã thực hiện'], [[n, 0]])], 'Khởi tạo bộ đếm.');
            if (id === 'halving-count') {
                for (let x = n; x > 0; x = Math.floor(x / 2)) {
                    count++;
                    emit(r, [tablePanel(['x', 'bước'], [[x, count]])], 'Chia x cho 2; số bước tăng logarithm.', { x, count });
                }
            }
            else if (id === 'dynamic-capacity') {
                const items: number[] = [];
                for (let i = 0; i < n; i++) {
                    let copied = 0;
                    if (items.length === cap) {
                        copied = items.length;
                        cap = cap ? cap * 2 : 1;
                    }
                    items.push(i);
                    count += copied + 1;
                    emit(r, [arrayPanel(items), tablePanel(['len', 'cap', 'tổng ghi'], [[items.length, cap, count]])], `Append ${i}: sao chép ${copied} phần tử khi cần tăng capacity.`);
                }
            }
            else {
                for (let i = 0; i < n; i++) {
                    const limit = id === 'nested-loop-count' ? n : 1;
                    for (let j = 0; j < limit; j++) {
                        count++;
                        emit(r, [tablePanel(['i', 'j', 'số lần'], [[i, j, count]])], 'Một thân vòng lặp được thực hiện.', { count });
                    }
                }
            }
            emit(r, [tablePanel(['n', 'kết quả'], [[n, id === 'dynamic-capacity' ? cap : count]])], 'Hoàn tất đếm.');
            return { output: String(id === 'dynamic-capacity' ? cap : count) };
        }
        if (id === 'stack-contract' || id === 'stack-operations' || id === 'circular-queue') {
            const isQueue = id === 'circular-queue';
            const cap = isQueue ? num(v.capacity, 1, 12) : 24;
            const lines = v.ops.trim() ? v.ops.trim().split('\n') : [];
            requireCondition(lines.length <= 24, 'Tối đa 24 thao tác.');
            const ops = lines.map((line, i) => { const [cmd, arg, ...extra] = line.trim().split(/\s+/); requireCondition(!extra.length && (isQueue ? ['enqueue', 'dequeue'] : ['push', 'pop']).includes(cmd), `Lệnh dòng ${i + 1} không hợp lệ.`); const insert = cmd === 'push' || cmd === 'enqueue'; requireCondition(insert ? arg !== undefined : arg === undefined, `Tham số dòng ${i + 1} không hợp lệ.`); return { cmd, value: insert ? num(arg, -1000000, 1000000) : 0 }; });
            let head = 0, tail = 0;
            const data: number[] = [];
            const ring: (number | string)[] = Array(cap).fill('∅');
            const draw = (msg: string) => emit(r, [stackPanel(data, isQueue ? 'Queue' : 'Stack', isQueue ? 'queue' : 'stack'), ...(isQueue ? [arrayPanel(ring, [], 'Ring buffer', 'ring')] : [])], msg, { head, tail, len: data.length });
            draw('Khởi tạo cấu trúc rỗng.');
            for (const op of ops) {
                r.consume();
                if (op.cmd === 'push' || op.cmd === 'enqueue') {
                    if (data.length === cap) {
                        draw('Đầy: thao tác bị từ chối, state giữ nguyên.');
                        continue;
                    }
                    data.push(op.value);
                    if (isQueue) {
                        ring[tail] = op.value;
                        tail = (tail + 1) % cap;
                    }
                    draw(`Thêm ${op.value}.`);
                }
                else {
                    if (!data.length) {
                        draw('Rỗng: không có phần tử để lấy.');
                        continue;
                    }
                    const value = isQueue ? data.shift() : data.pop();
                    if (isQueue) {
                        ring[head] = '∅';
                        head = (head + 1) % cap;
                    }
                    draw(`Lấy ${value} ra.`);
                }
            }
            draw('Hoàn tất các thao tác.');
            return { output: data.length ? data.join(', ') : 'Rỗng' };
        }
        if (id === 'slice-alias') {
            const index = num(v.k, 0, Math.max(0, a.length - 1));
            requireCondition(index < a.length, 'Lỗi chỉ số');
            const value = num(v.target, -1000000, 1000000);
            show('a và b cùng trỏ tới một backing array.', [], [tablePanel(['slice', 'len', 'cap', 'backing'], [['a', a.length, a.length, 'B0'], ['b', a.length, a.length, 'B0']])]);
            a[index] = value;
            show(`b[${index}]=${value} cũng đổi a[${index}].`, [index]);
            return { output: a.join(', ') };
        }
        if (id === 'utf8-bytes-runes') {
            const runes = parseText(v.text, 24);
            const bytes = [...new TextEncoder().encode(v.text)];
            emit(r, [arrayPanel(bytes, [], 'UTF-8 bytes'), arrayPanel(runes, [], 'Rune / code point', 'runes')], 'Hai đơn vị chỉ số khác nhau.');
            let offset = 0;
            for (const rune of runes) {
                const size = new TextEncoder().encode(rune).length;
                emit(r, [arrayPanel(bytes, Array.from({ length: size }, (_, i) => offset + i), 'UTF-8 bytes'), tablePanel(['rune', 'byte bắt đầu', 'số byte'], [[rune, offset, size]])], `Rune ${rune} chiếm ${size} byte.`);
                offset += size;
            }
            return { output: `${bytes.length} byte / ${runes.length} rune` };
        }
        if (id === 'two-pointers') {
            requireCondition(a.every((x, i) => i === 0 || a[i - 1] <= x), 'Cần mảng đã sắp.');
            const target = num(v.target, -1000000, 1000000);
            let lo = 0, hi = a.length - 1;
            show('Đặt hai con trỏ ở hai đầu.');
            while (lo < hi) {
                r.consume();
                const sum = a[lo] + a[hi];
                show(`Tổng ${a[lo]}+${a[hi]}=${sum}.`, [lo, hi], [], { lo, hi, sum });
                if (sum === target)
                    return { output: `${lo}, ${hi}` };
                if (sum < target)
                    lo++;
                else
                    hi--;
            }
            show('Không có cặp phù hợp.');
            return { output: 'Không có cặp' };
        }
        if (id === 'prefix-sum') {
            const q = v.query.trim().split(/\s+/);
            requireCondition(q.length === 2, 'Truy vấn dùng l r.');
            const l = num(q[0], 0, a.length), h = num(q[1], l, a.length);
            const p = [0];
            show('prefix[0]=0.');
            a.forEach((x, i) => { p.push(p[i] + x); show(`prefix[${i + 1}]=${p[i + 1]}.`, [i], [arrayPanel(p, [i + 1], 'Prefix', 'prefix')]); });
            const total = p[h] - p[l];
            show(`sum[${l},${h})=prefix[${h}]-prefix[${l}]=${total}.`, [], [arrayPanel(p, [l, h], 'Prefix', 'prefix')]);
            return { output: String(total) };
        }
        if (id === 'monotonic-deque') {
            const k = num(v.k, 1, 24);
            requireCondition(!a.length || k <= a.length, 'k không vượt độ dài.');
            const q: number[] = [], out: number[] = [];
            show('Deque chứa chỉ số, giá trị giảm dần.');
            for (let i = 0; i < a.length; i++) {
                r.consume();
                while (q.length && q[0] <= i - k)
                    q.shift();
                while (q.length && a[q[q.length - 1]] <= a[i])
                    q.pop();
                q.push(i);
                if (i >= k - 1)
                    out.push(a[q[0]]);
                show(`Xử lý i=${i}; đầu deque là cực đại của cửa sổ.`, [i], [stackPanel(q.map(j => `${j}:${a[j]}`), 'Deque', 'queue'), arrayPanel(out, [], 'Maxima', 'out')]);
            }
            return { output: out.join(', ') };
        }
        if (id === 'upper-bound') {
            requireCondition(a.every((x, i) => i === 0 || a[i - 1] <= x), 'Cần mảng đã sắp.');
            const target = num(v.target, -1000000, 1000000);
            let lo = 0, hi = a.length;
            show('Tìm vị trí đầu tiên lớn hơn target.');
            while (lo < hi) {
                const mid = lo + Math.floor((hi - lo) / 2);
                show(`a[${mid}]=${a[mid]}, so với ${target}.`, [mid], [], { lo, hi, mid });
                if (a[mid] <= target)
                    lo = mid + 1;
                else
                    hi = mid;
            }
            show(`Upper bound = ${lo}.`, [], [], { lo, hi });
            return { output: String(lo) };
        }
        requireCondition(a.every(x => x > 0), 'Trọng lượng phải dương.');
        const days = num(v.days, 1, 24);
        let lo = Math.max(0, ...a), hi = a.reduce((x, y) => x + y, 0);
        show('Tìm capacity tối thiểu để vận chuyển theo thứ tự.');
        while (lo < hi) {
            const mid = lo + Math.floor((hi - lo) / 2);
            let used = 1, load = 0;
            for (const w of a) {
                r.consume();
                if (load + w > mid) {
                    used++;
                    load = 0;
                }
                load += w;
            }
            show(`Capacity ${mid} cần ${used} ngày.`, [], [], { lo, hi, mid, used });
            if (used <= days)
                hi = mid;
            else
                lo = mid + 1;
        }
        show(`Capacity tối thiểu ${lo}.`);
        return { output: String(lo) };
    };
export const mountScenarioById = (id: string, root: HTMLElement) => mountFamily(id, root, definitions, builders);
