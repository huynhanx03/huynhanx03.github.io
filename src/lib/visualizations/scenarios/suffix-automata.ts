import { definitions } from '../catalog/suffix-automata.mjs';
import { mountFamily, emit, type Builder } from '../core/scenario';
import { arrayPanel, stringPanel, tablePanel, type GraphPanel } from '../core/scene';
import { parseText, parseInteger as num, requireCondition } from '../core/input';
const builders: Record<string, Builder> = {};
for (const id of Object.keys(definitions))
    builders[id] = (v, r) => {
        const text = parseText(v.text, 16), pattern = id.startsWith('aho-') ? [] : parseText(v.pattern ?? '', 16);
        emit(r, [stringPanel(text)], 'Khởi tạo; vị trí dùng Unicode code points.');
        if (id.startsWith('aho-')) {
            const patterns = v.pattern ? v.pattern.split('|').map(x => parseText(x, 8)) : [];
            requireCondition(patterns.length <= 5 && patterns.every(p => p.length > 0), 'Tối đa 5 pattern không rỗng, ngăn bằng |.');
            requireCondition(new Set(patterns.map(p => p.join(''))).size === patterns.length, 'Pattern phải khác nhau.');
            interface Node {
                next: Map<string, number>;
                fail: number;
                out: number[];
            }
            ;
            const states: Node[] = [{ next: new Map(), fail: 0, out: [] }];
            const graph = (active: number[] = []): GraphPanel => ({ kind: 'graph', id: 'aho', heading: 'Trie / failure links', nodes: states.map((n, i) => ({ id: String(i), label: String(i), detail: `fail=${n.fail} out=${n.out.join(',')}`, state: active.includes(i) ? 'active' : undefined })), edges: states.flatMap((n, i) => [...[...n.next].map(([c, to]) => ({ id: `t${i}:${c}`, from: String(i), to: String(to), label: c, directed: true })), ...(i && id !== 'aho-trie' ? [{ id: `f${i}`, from: String(i), to: String(n.fail), label: 'fail', directed: true, state: 'muted' as const }] : [])]) });
            patterns.forEach((p, index) => { let state = 0; for (const c of p) {
                r.consume();
                if (!states[state].next.has(c)) {
                    states[state].next.set(c, states.length);
                    states.push({ next: new Map(), fail: 0, out: [] });
                }
                state = states[state].next.get(c)!;
                emit(r, [graph([state])], `Chèn ký tự ${c} của pattern ${index}.`);
            } states[state].out.push(index); });
            emit(r, [graph()], 'Trie đã xây xong.');
            if (id === 'aho-trie')
                return { output: String(states.length) };
            const q = [...states[0].next.values()];
            while (q.length) {
                r.consume();
                const u = q.shift()!;
                for (const [c, to] of states[u].next) {
                    let fail = states[u].fail;
                    while (fail && !states[fail].next.has(c)) {
                        r.consume();
                        fail = states[fail].fail;
                    }
                    states[to].fail = states[fail].next.get(c) ?? 0;
                    states[to].out.push(...states[states[to].fail].out);
                    q.push(to);
                    emit(r, [graph([to]), arrayPanel(q, [], 'BFS queue', 'q')], `fail[${to}]=${states[to].fail}; kế thừa output của failure state.`);
                }
            }
            if (id === 'aho-failure')
                return { output: String(states.length) };
            let state = 0;
            const matches: string[] = [];
            for (let i = 0; i < text.length; i++) {
                r.consume();
                const c = text[i];
                while (state && !states[state].next.has(c)) {
                    state = states[state].fail;
                    emit(r, [graph([state]), stringPanel(text, [i], 'Text', 'text')], 'Đi theo failure link.');
                }
                state = states[state].next.get(c) ?? 0;
                for (const index of states[state].out)
                    matches.push(`${patterns[index].join('')}@${i - patterns[index].length + 1}`);
                emit(r, [graph([state]), stringPanel(text, [i], 'Text', 'text'), arrayPanel(matches, [], 'Matches', 'matches')], `Đọc ${c}, state=${state}.`);
            }
            return { output: matches.join(', ') };
        }
        if (id.startsWith('sam-')) {
            interface State {
                len: number;
                link: number;
                next: Map<string, number>;
                clone: boolean;
            }
            ;
            const states: State[] = [{ len: 0, link: -1, next: new Map(), clone: false }];
            let last = 0;
            const graph = (active: number[] = []): GraphPanel => ({ kind: 'graph', id: 'sam', heading: 'Suffix automaton', nodes: states.map((s, i) => ({ id: String(i), label: String(i), detail: `len=${s.len}${s.clone ? ' clone' : ''}`, state: active.includes(i) ? 'active' : undefined })), edges: states.flatMap((s, i) => [...[...s.next].map(([c, to]) => ({ id: `t${i}:${c}`, from: String(i), to: String(to), label: c, directed: true })), ...(s.link >= 0 ? [{ id: `s${i}`, from: String(i), to: String(s.link), label: 'link', directed: true, state: 'muted' as const }] : [])]) });
            emit(r, [graph()], 'State gốc len=0, link=-1.');
            for (const c of text) {
                r.consume();
                const cur = states.length;
                states.push({ len: states[last].len + 1, link: 0, next: new Map(), clone: false });
                let p = last;
                while (p >= 0 && !states[p].next.has(c)) {
                    r.consume();
                    states[p].next.set(c, cur);
                    emit(r, [graph([p, cur])], `Thêm transition ${c} tới cur=${cur}.`);
                    p = states[p].link;
                }
                if (p < 0)
                    states[cur].link = 0;
                else {
                    const q = states[p].next.get(c)!;
                    if (states[p].len + 1 === states[q].len)
                        states[cur].link = q;
                    else {
                        const clone = states.length;
                        states.push({ len: states[p].len + 1, link: states[q].link, next: new Map(states[q].next), clone: true });
                        emit(r, [graph([clone, q])], 'Tạo clone sao chép transitions, giảm len để tách endpos class.');
                        while (p >= 0 && states[p].next.get(c) === q) {
                            r.consume();
                            states[p].next.set(c, clone);
                            p = states[p].link;
                        }
                        states[q].link = states[cur].link = clone;
                    }
                }
                last = cur;
                emit(r, [graph([cur]), tablePanel(['state', 'len', 'link'], states.map((s, i) => [i, s.len, s.link]))], `Hoàn tất extend ${c}.`);
            }
            const count = states.slice(1).reduce((sum, s) => sum + s.len - states[s.link].len, 0);
            emit(r, [graph(), tablePanel(['state', 'đóng góp'], states.slice(1).map((s, i) => [i + 1, s.len - states[s.link].len]))], 'Đếm bằng tổng len[v]−len[link[v]].');
            return { output: id === 'sam-extend' ? String(states.length) : String(count) };
        }
        if (id.startsWith('suffix-trie') || id === 'suffix-tree-search') {
            const sentinel = Symbol('terminal'), seq: (string | symbol)[] = [...text, sentinel];
            interface Node {
                edges: Map<string | symbol, {
                    label: (string | symbol)[];
                    to: number;
                }>;
                suffix: number | null;
            }
            ;
            const nodes: Node[] = [{ edges: new Map(), suffix: null }];
            const graph = (): GraphPanel => ({ kind: 'graph', id: 'suffix-tree', heading: 'Suffix trie nén · O(n²)', nodes: nodes.map((n, i) => ({ id: String(i), label: n.suffix !== null ? `s${n.suffix}` : String(i) })).filter(n => n.id === '0' || nodes.some(x => [...x.edges.values()].some(e => String(e.to) === n.id))), edges: nodes.flatMap((n, i) => [...n.edges.values()].map((e, j) => ({ id: `${i}:${j}`, from: String(i), to: String(e.to), label: e.label.map(x => typeof x === 'symbol' ? '⟂' : x).join(''), directed: true }))) });
            for (let start = 0; start < seq.length; start++) {
                let u = 0;
                for (let j = start; j < seq.length; j++) {
                    r.consume();
                    const c = seq[j];
                    if (!nodes[u].edges.has(c)) {
                        nodes[u].edges.set(c, { label: [c], to: nodes.length });
                        nodes.push({ edges: new Map(), suffix: null });
                    }
                    u = nodes[u].edges.get(c)!.to;
                }
                nodes[u].suffix = start;
                emit(r, [tablePanel(['suffix vừa chèn'], [[start]])], `Chèn hậu tố ${start} vào trie đơn giản.`);
            }
            const compress = (u: number) => { for (const edge of nodes[u].edges.values()) {
                r.consume();
                while (nodes[edge.to].suffix === null && nodes[edge.to].edges.size === 1) {
                    const next = [...nodes[edge.to].edges.values()][0];
                    edge.label.push(...next.label);
                    const old = edge.to;
                    edge.to = next.to;
                    nodes[old].edges.clear();
                }
                compress(edge.to);
            } };
            compress(0);
            emit(r, [graph()], 'Nén các đường một nhánh. Terminal ⟂ là ký hiệu nội bộ ngoài input.');
            if (id === 'suffix-trie-compress')
                return { output: `${seq.length} hậu tố` };
            let u = 0, pos = 0, ok = true;
            while (pos < pattern.length) {
                r.consume();
                const edge = nodes[u].edges.get(pattern[pos]);
                if (!edge) {
                    ok = false;
                    break;
                }
                for (const c of edge.label) {
                    if (pos >= pattern.length)
                        break;
                    if (c !== pattern[pos++]) {
                        ok = false;
                        break;
                    }
                }
                if (!ok)
                    break;
                u = edge.to;
                emit(r, [graph()], `Đi qua cạnh tới node ${u}.`);
            }
            const matches: number[] = [];
            const leaves = (at: number) => { r.consume(); if (nodes[at].suffix !== null)
                matches.push(nodes[at].suffix!); for (const e of nodes[at].edges.values())
                leaves(e.to); };
            if (ok)
                leaves(u);
            matches.sort((a, b) => a - b);
            emit(r, [graph(), arrayPanel(matches, [], 'Suffix leaves', 'matches')], ok ? 'Các lá dưới điểm khớp cho vị trí xuất hiện.' : 'Không tìm thấy đường khớp.');
            return { output: matches.join(', ') };
        }
        if (id === 'approximate-matching') {
            const k = num(v.k, 0, 4), dp = Array.from({ length: pattern.length + 1 }, () => Array(text.length + 1).fill(0));
            for (let i = 1; i <= pattern.length; i++)
                dp[i][0] = i;
            for (let j = 1; j <= text.length; j++)
                for (let i = 1; i <= pattern.length; i++) {
                    r.consume();
                    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + Number(pattern[i - 1] !== text[j - 1]));
                    emit(r, [tablePanel(['p/t', 'ε', ...text], dp.map((row, x) => [x ? pattern[x - 1] : 'ε', ...row]), 'Approximate DP', 'dp', [[i, j + 1]])], 'Hàng đầu = 0 cho phép bắt đầu mẫu ở bất kỳ vị trí text.');
                }
            const out = dp[pattern.length].map((d, i) => d <= k ? i : -1).filter(i => i >= 0);
            emit(r, [arrayPanel(out, [], 'Vị trí kết thúc')], `Giữ các vị trí kết thúc có distance ≤${k}.`);
            return { output: out.join(', ') };
        }
        const n = text.length;
        let sa = Array.from({ length: n }, (_, i) => i);
        const alphabet = [...new Set(text)].sort();
        let rank = text.map(c => alphabet.indexOf(c));
        emit(r, [tablePanel(['i', 'suffix', 'rank'], sa.map(i => [i, text.slice(i).join(''), rank[i]]))], 'Rank ban đầu từ ký tự.');
        for (let span = 1; span < n; span *= 2) {
            r.consume();
            sa.sort((a, b) => rank[a] - rank[b] || (rank[a + span] ?? -1) - (rank[b + span] ?? -1));
            const next = Array(n).fill(0);
            for (let j = 1; j < n; j++) {
                const a = sa[j - 1], b = sa[j];
                next[b] = next[a] + Number(rank[a] !== rank[b] || (rank[a + span] ?? -1) !== (rank[b + span] ?? -1));
            }
            rank = next;
            emit(r, [tablePanel(['SA', 'suffix', 'rank'], sa.map(i => [i, text.slice(i).join(''), rank[i]]))], `Doubling với span=${span}.`);
            if (n && rank[sa[n - 1]] === n - 1)
                break;
        }
        if (id === 'suffix-doubling')
            return { output: sa.join(', ') };
        const inverse = Array(n).fill(0);
        sa.forEach((i, k) => inverse[i] = k);
        const lcp = Array(Math.max(0, n - 1)).fill(0);
        let h = 0;
        for (let i = 0; i < n; i++) {
            r.consume();
            const k = inverse[i];
            if (k === n - 1) {
                h = 0;
                continue;
            }
            const j = sa[k + 1];
            while (i + h < n && j + h < n && text[i + h] === text[j + h]) {
                r.consume();
                h++;
            }
            lcp[k] = h;
            emit(r, [tablePanel(['SA', 'suffix', 'LCP tiếp'], sa.map((x, k) => [x, text.slice(x).join(''), lcp[k] ?? '—']))], `Kasai tại i=${i}: reuse h rồi giảm tối đa một.`);
            if (h)
                h--;
        }
        if (id === 'kasai-lcp')
            return { output: lcp.join(', ') };
        const compare = (start: number) => { for (let i = 0; i < pattern.length; i++) {
            r.consume();
            const c = text[start + i];
            if (c === undefined)
                return -1;
            if (c !== pattern[i])
                return c < pattern[i] ? -1 : 1;
        } return 0; };
        let lo = 0, hi = n;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            emit(r, [arrayPanel(sa, [mid], 'Suffix array'), stringPanel(pattern, [], 'Pattern', 'pattern')], `Binary search biên trái: suffix ${sa[mid]}.`, { lo, hi, mid });
            if (compare(sa[mid]) < 0)
                lo = mid + 1;
            else
                hi = mid;
        }
        const out: number[] = [];
        for (let i = lo; i < n && compare(sa[i]) === 0; i++)
            out.push(sa[i]);
        if (!pattern.length)
            out.push(n);
        out.sort((a, b) => a - b);
        emit(r, [arrayPanel(out, [], 'Matches')], 'Các suffix có pattern làm tiền tố.');
        return { output: out.join(', ') };
    };
export const mountScenarioById = (id: string, root: HTMLElement) => mountFamily(id, root, definitions, builders);
