import { definitions } from '../catalog/structures.mjs';
import { mountFamily, emit, type Builder } from '../core/scenario';
import { arrayPanel, tablePanel, type GraphPanel, type Panel } from '../core/scene';
import { parseInteger as num, parseIntegerArray as ints, parseText, requireCondition } from '../core/input';
import { node, binaryTreePanel, inorder, height, updateHeight, type TreeNode } from '../core/tree';
import { DSU } from '../core/graph';
const builders: Record<string, Builder> = {};
for (const id of Object.keys(definitions))
    builders[id] = (v, r) => {
        const show = (panels: Panel[], msg: string, vars: Record<string, string | number> = {}) => emit(r, panels, msg, vars, 'Cấu trúc dữ liệu');
        if (id.includes('linked-list')) {
            const lines = v.ops.trim() ? v.ops.trim().split('\n') : [];
            requireCondition(lines.length <= 24, 'Tối đa 24 lệnh.');
            const ops = lines.map((line, i) => { const p = line.trim().split(/\s+/); requireCondition((p[0] === 'insert' && p.length === 3) || (p[0] === 'delete' && p.length === 2), `Lệnh dòng ${i + 1}: insert index value / delete index.`); return { cmd: p[0], index: num(p[1], 0, 15), value: p[2] === undefined ? 0 : num(p[2], -1000000, 1000000) }; });
            const list: {
                id: number;
                value: number;
            }[] = [];
            let next = 0;
            const draw = (msg: string) => show([{ kind: 'graph', id: 'list', heading: id === 'doubly-linked-list' ? 'next / prev' : 'next', nodes: list.map((n, i) => ({ id: String(n.id), label: String(n.value), detail: i === 0 ? 'head' : i === list.length - 1 ? 'tail' : '', x: 30 + i / Math.max(1, list.length - 1) * 380, y: 130 })), edges: list.flatMap((n, i) => i + 1 < list.length ? [{ id: `next${n.id}`, from: String(n.id), to: String(list[i + 1].id), label: 'next', directed: true }, ...(id === 'doubly-linked-list' ? [{ id: `prev${n.id}`, from: String(list[i + 1].id), to: String(n.id), label: 'prev', directed: true }] : [])] : []) }], msg);
            draw('List rỗng, head=null.');
            for (const op of ops) {
                r.consume();
                requireCondition(op.index <= (op.cmd === 'insert' ? list.length : list.length - 1), 'Lỗi chỉ số thao tác list.');
                if (op.cmd === 'insert') {
                    requireCondition(list.length < 15, 'Tối đa 15 nodes.');
                    list.splice(op.index, 0, { id: next++, value: op.value });
                }
                else
                    list.splice(op.index, 1);
                draw(`Thực hiện ${op.cmd} tại ${op.index}, cập nhật links/head/tail.`);
            }
            return { output: list.length ? list.map(n => n.value).join(', ') : 'Rỗng' };
        }
        if (id === 'floyd-cycle') {
            const a = ints(v.a, 15), cycle = num(v.k, -1, Math.max(-1, a.length - 1));
            requireCondition(cycle < a.length, 'Cycle index ngoài list.');
            const next = a.map((_, i) => i + 1 < a.length ? i + 1 : cycle);
            const draw = (slow: number, fast: number, msg: string) => show([{ kind: 'graph', id: 'list', heading: 'List với next pointers', nodes: a.map((x, i) => ({ id: String(i), label: String(x), detail: `#${i}`, state: i === slow || i === fast ? 'active' : undefined })), edges: next.flatMap((to, i) => to >= 0 ? [{ id: String(i), from: String(i), to: String(to), directed: true }] : []) }], msg, { slow, fast });
            let slow = a.length ? 0 : -1, fast = slow;
            draw(slow, fast, 'Khởi tạo fast và slow ở head.');
            let met = false;
            while (fast >= 0 && next[fast] >= 0) {
                r.consume();
                slow = next[slow];
                fast = next[next[fast]];
                draw(slow, fast, 'Slow đi 1, fast đi 2.');
                if (slow === fast) {
                    met = true;
                    break;
                }
            }
            if (!met)
                return { output: 'Không có chu trình' };
            slow = 0;
            while (slow !== fast) {
                r.consume();
                slow = next[slow];
                fast = next[fast];
                draw(slow, fast, 'Đặt một con trỏ về head; cùng đi 1 để tìm cycle entry.');
            }
            draw(slow, fast, 'Hai con trỏ gặp tại đầu chu trình.');
            return { output: String(slow) };
        }
        if (id.startsWith('hash-')) {
            const a = ints(v.a, 12);
            let cap = num(v.capacity, 1, 16);
            let buckets: number[][] = Array.from({ length: cap }, () => []), slots: (number | string)[] = Array(cap).fill('∅');
            const hash = (x: number) => ((x % cap) + cap) % cap;
            const seen = new Set<number>();
            const draw = (msg: string, index = -1) => show(id === 'hash-chaining' ? [tablePanel(['bucket', 'keys'], buckets.map((b, i) => [i, b.join(' → ')]))] : [arrayPanel(slots, index < 0 ? [] : [index], 'Hash slots')], msg, { cap, size: seen.size });
            draw('Khởi tạo bảng.');
            for (const x of a) {
                r.consume();
                if (seen.has(x)) {
                    draw('Key đã tồn tại, không chèn trùng.');
                    continue;
                }
                if (id === 'hash-rehash' && (seen.size + 1) / cap > .7) {
                    cap = cap * 2;
                    requireCondition(cap <= 32, 'Rehash giới hạn 32 slots.');
                    slots = Array(cap).fill('∅');
                    for (const key of seen) {
                        let i = hash(key);
                        while (slots[i] !== '∅')
                            i = (i + 1) % cap;
                        slots[i] = key;
                    }
                    draw('Tăng capacity và rehash các key cũ.');
                }
                const index = hash(x);
                if (id === 'hash-chaining') {
                    buckets[index].push(x);
                    seen.add(x);
                    draw(`Chèn ${x} vào chain ${index}.`, index);
                }
                else {
                    let at = index, probes = 0;
                    while (slots[at] !== '∅' && probes < cap) {
                        draw(`Collision tại ${at}, probe ô kế.`, at);
                        at = (at + 1) % cap;
                        probes++;
                    }
                    if (probes === cap) {
                        draw('Bảng đầy: chèn bị từ chối.');
                        continue;
                    }
                    slots[at] = x;
                    seen.add(x);
                    draw(`Chèn ${x} tại ${at}.`, at);
                }
            }
            return { output: [...seen].join(', ') };
        }
        if (id.startsWith('heap-') || id === 'build-heap') {
            const a = ints(v.a, 15), heap: number[] = [], out: number[] = [];
            const draw = (msg: string, active: number[] = []) => show([arrayPanel(heap, active, 'Min-heap array'), { kind: 'graph', id: 'heap', heading: 'Min-heap tree', nodes: heap.map((x, i) => { const d = Math.floor(Math.log2(i + 1)), slot = i - (2 ** d - 1); return { id: String(i), label: String(x), state: active.includes(i) ? 'active' : undefined, x: (slot + .5) / 2 ** d * 390 + 25, y: 35 + d * 65 }; }), edges: heap.slice(1).map((_, i) => ({ id: String(i + 1), from: String(Math.floor(i / 2)), to: String(i + 1), directed: true })) }], msg);
            const down = (i: number) => { while (true) {
                r.consume();
                let smallest = i;
                for (const c of [i * 2 + 1, i * 2 + 2])
                    if (c < heap.length && heap[c] < heap[smallest])
                        smallest = c;
                if (smallest === i)
                    return;
                [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
                draw('Sift down.', [i, smallest]);
                i = smallest;
            } };
            const push = (x: number) => { heap.push(x); let i = heap.length - 1; while (i > 0) {
                r.consume();
                const p = (i - 1) >> 1;
                if (heap[p] <= heap[i])
                    break;
                [heap[p], heap[i]] = [heap[i], heap[p]];
                draw('Sift up.', [i, p]);
                i = p;
            } draw(`Push ${x}.`, [i]); };
            const pop = () => { const min = heap[0], last = heap.pop()!; if (heap.length) {
                heap[0] = last;
                down(0);
            } draw(`Pop ${min}.`); return min; };
            draw('Khởi tạo heap.');
            if (id === 'build-heap') {
                heap.push(...a);
                for (let i = (heap.length >> 1) - 1; i >= 0; i--)
                    down(i);
                draw('Build heap bottom-up hoàn tất.');
                return { output: heap.join(', ') };
            }
            if (id === 'heap-top-k') {
                const k = num(v.k, 0, a.length);
                for (const x of a) {
                    push(x);
                    if (heap.length > k)
                        pop();
                }
                const result = [...heap].sort((a, b) => b - a);
                show([arrayPanel(result, [], 'Top-k')], 'Heap giữ k giá trị lớn nhất.');
                return { output: result.join(', ') };
            }
            for (const x of a)
                push(x);
            while (heap.length)
                out.push(pop());
            show([arrayPanel(out, [], 'Pop order')], 'Pop hết min-heap.');
            return { output: out.join(', ') };
        }
        if (id === 'union-by-size' || id === 'path-compression') {
            const n = num(v.n, 1, 12), dsu = new DSU(n);
            const lines = v.ops.trim() ? v.ops.trim().split('\n') : [];
            requireCondition(lines.length <= 24, 'Tối đa 24 lệnh.');
            const ops = lines.map((line, i) => { const p = line.trim().split(/\s+/); requireCondition((p[0] === 'union' && p.length === 3) || (p[0] === 'find' && p.length === 2), `Lệnh dòng ${i + 1}: union u v / find u.`); return { cmd: p[0], a: num(p[1], 0, n - 1), b: p[2] === undefined ? 0 : num(p[2], 0, n - 1) }; });
            const draw = (msg: string, active: number[] = []) => show([{ kind: 'graph', id: 'dsu', heading: 'Parent forest', nodes: dsu.parent.map((_, i) => ({ id: String(i), label: String(i), detail: `size=${dsu.size[i]}`, state: active.includes(i) ? 'active' : undefined })), edges: dsu.parent.flatMap((p, i) => p !== i ? [{ id: String(i), from: String(i), to: String(p), directed: true }] : []) }, arrayPanel(dsu.parent, active, 'Parent', 'parent')], msg);
            draw('Mỗi node là một component.');
            for (const op of ops) {
                if (op.cmd === 'union') {
                    dsu.union(op.a, op.b);
                    draw('Union theo size; không đổi khi cùng root.', [op.a, op.b]);
                }
                else {
                    const root = dsu.find(op.a);
                    if (id === 'path-compression') {
                        let u = op.a;
                        while (dsu.parent[u] !== u) {
                            const next = dsu.parent[u];
                            dsu.parent[u] = root;
                            draw(`Nén parent[${u}]=${root}.`, [u, root]);
                            u = next;
                        }
                    }
                    draw(`Find(${op.a})=${root}.`, [op.a, root]);
                }
            }
            return { output: dsu.parent.map((_, i) => dsu.find(i)).join(', ') };
        }
        if (id.startsWith('segment-') || id.startsWith('fenwick-')) {
            const a = ints(v.a);
            const parts = v.query.trim().split(/\s+/);
            requireCondition(parts.length === 2, 'Query dùng l r.');
            const l = num(parts[0], 0, a.length), h = num(parts[1], l, a.length);
            const update = id.endsWith('update');
            let index = 0, value = 0;
            if (update) {
                index = num(v.k, 0, Math.max(0, a.length - 1));
                requireCondition(index < a.length, 'Lỗi chỉ số');
                value = num(v.target, -1000000, 1000000);
            }
            if (id.startsWith('fenwick')) {
                const bit = Array(a.length + 1).fill(0);
                const add = (i: number, delta: number) => { for (let j = i + 1; j < bit.length; j += j & -j) {
                    r.consume();
                    bit[j] += delta;
                    show([arrayPanel(a, [i]), arrayPanel(bit, [j], 'BIT · internal 1-based', 'bit')], `Cộng delta=${delta} tại BIT[${j}].`);
                } };
                show([arrayPanel(a), arrayPanel(bit, [], 'BIT', 'bit')], 'BIT khởi tạo 0.');
                a.forEach((x, i) => add(i, x));
                if (update) {
                    const delta = value - a[index];
                    a[index] = value;
                    add(index, delta);
                }
                const prefix = (x: number) => { let sum = 0; for (let i = x; i > 0; i -= i & -i) {
                    sum += bit[i];
                    show([arrayPanel(bit, [i], 'BIT', 'bit')], `Lấy BIT[${i}], sum=${sum}.`);
                } return sum; };
                const result = prefix(h) - prefix(l);
                show([tablePanel(['l', 'r', 'sum'], [[l, h, result]])], 'Range sum = prefix(r)−prefix(l).');
                return { output: String(result) };
            }
            const tree = Array(Math.max(1, a.length * 4)).fill(0), ranges = new Map<number, [
                number,
                number
            ]>();
            const graph = (): GraphPanel => ({ kind: 'graph', id: 'segment', heading: 'Segment tree', nodes: [...ranges].map(([u, [l, h]]) => ({ id: String(u), label: String(tree[u]), detail: `[${l},${h})` })), edges: [...ranges.keys()].filter(u => u !== 1).map(u => ({ id: String(u), from: String(u >> 1), to: String(u), directed: true })) });
            const build = (u: number, l: number, h: number) => { r.consume(); ranges.set(u, [l, h]); if (h - l === 1)
                tree[u] = a[l];
            else {
                const m = (l + h) >> 1;
                build(u * 2, l, m);
                build(u * 2 + 1, m, h);
                tree[u] = tree[u * 2] + tree[u * 2 + 1];
            } show([graph()], `Xây node [${l},${h})=${tree[u]}.`); };
            if (a.length)
                build(1, 0, a.length);
            else
                show([arrayPanel(a)], 'Mảng rỗng.');
            if (update) {
                const set = (u: number, l: number, h: number) => { r.consume(); if (h - l === 1)
                    tree[u] = value;
                else {
                    const m = (l + h) >> 1;
                    if (index < m)
                        set(u * 2, l, m);
                    else
                        set(u * 2 + 1, m, h);
                    tree[u] = tree[u * 2] + tree[u * 2 + 1];
                } show([graph()], `Cập nhật node [${l},${h}).`); };
                set(1, 0, a.length);
                a[index] = value;
            }
            const query = (u: number, x: number, y: number): number => { r.consume(); if (y <= l || h <= x)
                return 0; if (l <= x && y <= h) {
                show([graph()], `Lấy toàn node [${x},${y})=${tree[u]}.`);
                return tree[u];
            } const m = (x + y) >> 1; return query(u * 2, x, m) + query(u * 2 + 1, m, y); };
            const result = a.length ? query(1, 0, a.length) : 0;
            show([arrayPanel(a), tablePanel(['query', 'sum'], [[`[${l},${h})`, result]])], 'Query hoàn tất.');
            return { output: String(result) };
        }
        if (id.startsWith('trie-') || id === 'radix-compression') {
            const words = v.text ? v.text.split('|').map(x => parseText(x, 8).join('')) : [];
            requireCondition(words.length <= 6 && words.every(w => w.length), 'Tối đa 6 từ không rỗng.');
            const pattern = parseText(v.pattern, 8);
            interface TNode {
                children: Map<string, number>;
                end: boolean;
            }
            ;
            const nodes: TNode[] = [{ children: new Map(), end: false }];
            const reachable = () => { const set = new Set<number>(); const walk = (u: number) => { if (set.has(u))
                return; set.add(u); for (const to of nodes[u].children.values())
                walk(to); }; walk(0); return set; };
            const graph = (): GraphPanel => ({ kind: 'graph', id: 'trie', heading: 'Trie', nodes: nodes.map((n, i) => ({ id: String(i), label: n.end ? `${i}✓` : String(i) })).filter(n => reachable().has(Number(n.id))), edges: nodes.flatMap((n, i) => reachable().has(i) ? [...n.children].map(([c, to]) => ({ id: `${i}:${c}`, from: String(i), to: String(to), label: c, directed: true })) : []) });
            show([graph()], 'Root không đại diện ký tự.');
            for (const word of words) {
                let u = 0;
                for (const c of Array.from(word)) {
                    if (!nodes[u].children.has(c)) {
                        nodes[u].children.set(c, nodes.length);
                        nodes.push({ children: new Map(), end: false });
                    }
                    u = nodes[u].children.get(c)!;
                    show([graph()], `Thêm / đi qua ký tự ${c}.`);
                }
                nodes[u].end = true;
                show([graph()], `Đánh dấu kết thúc từ ${word}.`);
            }
            let u = 0, found = true;
            const path: {
                parent: number;
                char: string;
                child: number;
            }[] = [];
            for (const c of pattern) {
                const to = nodes[u].children.get(c);
                if (to === undefined) {
                    found = false;
                    break;
                }
                path.push({ parent: u, char: c, child: to });
                u = to;
            }
            found = found && nodes[u].end;
            if (id === 'trie-insert-search') {
                show([graph()], found ? 'Từ có terminal marker.' : 'Đường đi thiếu hoặc chưa phải kết thúc từ.');
                return { output: found ? 'Có' : 'Không có' };
            }
            if (id === 'trie-delete' && found) {
                nodes[u].end = false;
                for (let i = path.length - 1; i >= 0; i--) {
                    const e = path[i];
                    if (nodes[e.child].end || nodes[e.child].children.size)
                        break;
                    nodes[e.parent].children.delete(e.char);
                }
                show([graph()], 'Xóa marker; chỉ xóa nhánh không còn phục vụ từ khác.');
            }
            const remaining = [...new Set(words)].filter(w => id !== 'trie-delete' || !found || w !== pattern.join('')).sort();
            if (id === 'radix-compression') {
                const compressed: GraphPanel = { kind: 'graph', id: 'radix', heading: 'Radix trie nén', nodes: [], edges: [] };
                const walk = (at: number) => { compressed.nodes.push({ id: String(at), label: nodes[at].end ? `${at}✓` : String(at) }); for (const [first, to] of nodes[at].children) {
                    let c = first, end = to;
                    while (!nodes[end].end && nodes[end].children.size === 1) {
                        const [next, nextTo] = [...nodes[end].children][0];
                        c += next;
                        end = nextTo;
                    }
                    compressed.edges.push({ id: `${at}:${end}`, from: String(at), to: String(end), label: c, directed: true });
                    walk(end);
                } };
                walk(0);
                show([compressed], 'Nén các đường một nhánh không chứa terminal.');
            }
            return { output: remaining.join(', ') };
        }
        if (id === 'btree-insert' || id === 'bplus-range') {
            const a = ints(v.a, 15);
            requireCondition(new Set(a).size === a.length, 'Keys phải khác nhau.');
            interface Page {
                id: number;
                keys: number[];
                children: Page[];
                leaf: boolean;
                next: Page | null;
            }
            ;
            let next = 0;
            const page = (leaf: boolean): Page => ({ id: next++, keys: [], children: [], leaf, next: null });
            let root = page(true);
            const graph = (): GraphPanel => { const all: Page[] = []; const walk = (p: Page) => { all.push(p); p.children.forEach(walk); }; walk(root); return { kind: 'graph', id: 'pages', heading: id === 'btree-insert' ? 'B-tree t=2' : 'B+ tree · leaf links', nodes: all.map(p => ({ id: String(p.id), label: p.keys.join('|') || '∅', detail: p.leaf ? 'leaf' : 'internal' })), edges: all.flatMap(p => [...p.children.map(c => ({ id: `child${p.id}:${c.id}`, from: String(p.id), to: String(c.id), directed: true })), ...(p.next ? [{ id: `next${p.id}`, from: String(p.id), to: String(p.next.id), label: 'next', directed: true }] : [])]) }; };
            show([graph()], 'Khởi tạo root page rỗng.');
            if (id === 'btree-insert') {
                const split = (p: Page, i: number) => { const left = p.children[i], right = page(left.leaf), median = left.keys[1]; right.keys = left.keys.splice(2); left.keys.pop(); if (!left.leaf)
                    right.children = left.children.splice(2); p.keys.splice(i, 0, median); p.children.splice(i + 1, 0, right); show([graph()], `Split page, đẩy median ${median} lên parent.`); };
                const insert = (p: Page, key: number) => { r.consume(); if (p.leaf) {
                    p.keys.push(key);
                    p.keys.sort((a, b) => a - b);
                    show([graph()], `Chèn ${key} vào leaf.`);
                    return;
                } let i = 0; while (i < p.keys.length && key > p.keys[i])
                    i++; if (p.children[i].keys.length === 3) {
                    split(p, i);
                    if (key > p.keys[i])
                        i++;
                } insert(p.children[i], key); };
                for (const key of a) {
                    if (root.keys.length === 3) {
                        const old = root;
                        root = page(false);
                        root.children = [old];
                        split(root, 0);
                    }
                    insert(root, key);
                }
                const keys: number[] = [];
                const collect = (p: Page) => { p.keys.forEach((key, i) => { if (!p.leaf)
                    collect(p.children[i]); keys.push(key); }); if (!p.leaf)
                    collect(p.children[p.keys.length]); };
                collect(root);
                return { output: keys.join(', ') };
            }
            const insert = (p: Page, key: number): {
                separator: number;
                right: Page;
            } | null => { r.consume(); if (p.leaf) {
                p.keys.push(key);
                p.keys.sort((a, b) => a - b);
            }
            else {
                let i = 0;
                while (i < p.keys.length && key >= p.keys[i])
                    i++;
                const split = insert(p.children[i], key);
                if (split) {
                    p.keys.splice(i, 0, split.separator);
                    p.children.splice(i + 1, 0, split.right);
                }
            } show([graph()], `Chèn ${key} và cập nhật page ${p.id}.`); if (p.keys.length <= 3)
                return null; const right = page(p.leaf); if (p.leaf) {
                right.keys = p.keys.splice(2);
                right.next = p.next;
                p.next = right;
                show([graph()], 'Split leaf, sao chép separator và nối leaf links.');
                return { separator: right.keys[0], right };
            } const separator = p.keys[2]; right.keys = p.keys.splice(3); p.keys.pop(); right.children = p.children.splice(3); return { separator, right }; };
            for (const key of a) {
                const split = insert(root, key);
                if (split) {
                    const old = root;
                    root = page(false);
                    root.keys = [split.separator];
                    root.children = [old, split.right];
                    show([graph()], 'Tạo root mới sau split.');
                }
            }
            const query = v.query.trim().split(/\s+/);
            requireCondition(query.length === 2, 'Query dùng low high inclusive.');
            const low = num(query[0], -1000000, 1000000), high = num(query[1], low, 1000000);
            let p = root;
            while (!p.leaf) {
                let i = 0;
                while (i < p.keys.length && low >= p.keys[i])
                    i++;
                p = p.children[i];
            }
            const out: number[] = [];
            while (p) {
                r.consume();
                for (const key of p.keys)
                    if (key >= low && key <= high)
                        out.push(key);
                show([graph(), arrayPanel(out, [], 'Range output', 'out')], `Scan leaf ${p.id} rồi đi next link.`);
                if (p.keys.some(key => key > high))
                    break;
                p = p.next!;
            }
            return { output: out.join(', ') };
        }
        const a = ints(v.a, 15);
        let root: TreeNode | null = null;
        const draw = (msg: string, active: number[] = []) => show([binaryTreePanel(root, active, id === 'red-black-insert' ? 'Red-black tree' : 'Binary search tree')], msg);
        const transplant = (old: TreeNode, replacement: TreeNode | null) => { const p = old.parent; if (!p)
            root = replacement;
        else if (p.left === old)
            p.left = replacement;
        else
            p.right = replacement; if (replacement)
            replacement.parent = p; };
        const rotateLeft = (x: TreeNode) => { const y = x.right!; x.right = y.left; if (y.left)
            y.left.parent = x; transplant(x, y); y.left = x; x.parent = y; updateHeight(x); updateHeight(y); draw(`Rotate left tại ${x.key}.`, [x.key, y.key]); };
        const rotateRight = (x: TreeNode) => { const y = x.left!; x.left = y.right; if (y.right)
            y.right.parent = x; transplant(x, y); y.right = x; x.parent = y; updateHeight(x); updateHeight(y); draw(`Rotate right tại ${x.key}.`, [x.key, y.key]); };
        const insert = (key: number) => { let p: TreeNode | null = null, cur: TreeNode | null = root; while (cur) {
            r.consume();
            p = cur;
            draw(`So key ${key} với ${cur.key}.`, [cur.key]);
            if (key === cur.key) {
                draw('Key đã tồn tại; bỏ qua duplicate.', [key]);
                return null;
            }
            cur = key < cur.key ? cur.left : cur.right;
        } const n = node(key, p); if (!p)
            root = n;
        else if (key < p.key)
            p.left = n;
        else
            p.right = n; if (id !== 'red-black-insert')
            n.color = 'black'; draw(`Gắn node ${key}.`, [key]); return n; };
        draw('Cây rỗng.');
        for (const key of a) {
            const inserted = insert(key);
            if (!inserted)
                continue;
            if (id === 'avl-insert') {
                let cur: TreeNode | null = inserted.parent;
                while (cur) {
                    r.consume();
                    updateHeight(cur);
                    const balance = height(cur.left) - height(cur.right);
                    if (balance > 1) {
                        if (height(cur.left!.left) < height(cur.left!.right))
                            rotateLeft(cur.left!);
                        const old = cur;
                        rotateRight(cur);
                        cur = old.parent!.parent;
                    }
                    else if (balance < -1) {
                        if (height(cur.right!.right) < height(cur.right!.left))
                            rotateRight(cur.right!);
                        const old = cur;
                        rotateLeft(cur);
                        cur = old.parent!.parent;
                    }
                    else
                        cur = cur.parent;
                }
            }
            if (id === 'red-black-insert') {
                let cur = inserted;
                while (cur.parent?.color === 'red') {
                    r.consume();
                    const p = cur.parent, g = p.parent;
                    if (!g)
                        break;
                    if (p === g.left) {
                        const uncle = g.right;
                        if (uncle?.color === 'red') {
                            p.color = 'black';
                            uncle.color = 'black';
                            g.color = 'red';
                            cur = g;
                            draw('Parent và uncle đỏ: recolor, đẩy vi phạm lên grandparent.');
                        }
                        else {
                            if (cur === p.right) {
                                cur = p;
                                rotateLeft(cur);
                            }
                            cur.parent!.color = 'black';
                            cur.parent!.parent!.color = 'red';
                            rotateRight(cur.parent!.parent!);
                        }
                    }
                    else {
                        const uncle = g.left;
                        if (uncle?.color === 'red') {
                            p.color = 'black';
                            uncle.color = 'black';
                            g.color = 'red';
                            cur = g;
                            draw('Mirror recolor.');
                        }
                        else {
                            if (cur === p.left) {
                                cur = p;
                                rotateRight(cur);
                            }
                            cur.parent!.color = 'black';
                            cur.parent!.parent!.color = 'red';
                            rotateLeft(cur.parent!.parent!);
                        }
                    }
                }
                if (root)
                    (root as TreeNode).color = 'black';
                draw('Root luôn đen; repair hoàn tất.');
            }
        }
        if (id === 'bst-insert') {
            const target = num(v.target, -1000000, 1000000);
            insert(target);
            return { output: inorder(root).join(', ') };
        }
        if (id === 'bst-search' || id === 'bst-delete' || id === 'splay-access') {
            const target = num(v.target, -1000000, 1000000);
            let cur: TreeNode | null = root as TreeNode | null, last: TreeNode | null = null;
            while (cur && cur.key !== target) {
                r.consume();
                last = cur;
                draw(`Tìm ${target}: xét ${cur.key}.`, [cur.key]);
                cur = target < cur.key ? cur.left : cur.right;
            }
            if (id === 'bst-search') {
                draw(cur ? 'Tìm thấy.' : 'Không tìm thấy.', cur ? [cur.key] : []);
                return { output: cur ? 'Có' : 'Không có' };
            }
            if (id === 'splay-access') {
                const access = cur ?? last;
                if (!access) {
                    draw('Cây rỗng.');
                    return { output: 'Không có' };
                }
                while (access.parent) {
                    r.consume();
                    const p: TreeNode = access.parent;
                    const g: TreeNode | null = p.parent;
                    if (!g) {
                        if (access === p.left)
                            rotateRight(p);
                        else
                            rotateLeft(p);
                    }
                    else if (access === p.left && p === g.left) {
                        rotateRight(g);
                        rotateRight(p);
                    }
                    else if (access === p.right && p === g.right) {
                        rotateLeft(g);
                        rotateLeft(p);
                    }
                    else if (access === p.right && p === g.left) {
                        rotateLeft(p);
                        rotateRight(g);
                    }
                    else {
                        rotateRight(p);
                        rotateLeft(g);
                    }
                }
                draw(cur ? 'Splay node tìm thấy về root.' : 'Target vắng: splay node cuối được truy cập.', [access.key]);
                return { output: String(access.key) };
            }
            if (cur) {
                if (!cur.left)
                    transplant(cur, cur.right);
                else if (!cur.right)
                    transplant(cur, cur.left);
                else {
                    let succ = cur.right;
                    while (succ.left) {
                        r.consume();
                        succ = succ.left;
                    }
                    if (succ.parent !== cur) {
                        transplant(succ, succ.right);
                        succ.right = cur.right;
                        succ.right.parent = succ;
                    }
                    transplant(cur, succ);
                    succ.left = cur.left;
                    succ.left.parent = succ;
                }
                draw(`Xóa key ${target}, nối lại các parent/child links.`);
            }
            else
                draw('Target không có: cây giữ nguyên.');
        }
        draw('Hoàn tất cấu trúc cây.');
        return { output: inorder(root).join(', ') };
    };
export const mountScenarioById = (id: string, root: HTMLElement) => mountFamily(id, root, definitions, builders);
