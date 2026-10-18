import { definitions } from '../catalog/string-matching.mjs';
import { mountFamily, emit, type Builder } from '../core/scenario';
import { arrayPanel, tablePanel, stringPanel, type Panel } from '../core/scene';
import { parseText, parseBytes, parseInteger as num, requireCondition } from '../core/input';
const builders: Record<string, Builder> = {};
const prefix = (p: number[], step: (i: number, j: number, pi: number[], msg: string) => void) => { const pi = Array(p.length).fill(0); for (let i = 1; i < p.length; i++) {
    let j = pi[i - 1];
    while (j > 0 && p[i] !== p[j]) {
        step(i, j, pi, 'Fallback theo pi[j-1].');
        j = pi[j - 1];
    }
    if (p[i] === p[j])
        j++;
    pi[i] = j;
    step(i, j, pi, 'Ghi border dài nhất.');
} return pi; };
for (const id of Object.keys(definitions))
    builders[id] = (v, r) => {
        const byteMode = ['prefix-function', 'kmp-search', 'boyer-moore', 'hash-prefix', 'hash-substring', 'hash-window'].includes(id);
        const t = byteMode ? parseBytes(v.text ?? '', 24) : parseText(v.text ?? '', 24), p = byteMode ? parseBytes(v.pattern ?? '', 16) : parseText(v.pattern ?? '', 16);
        const visual = (msg: string, active: number[] = [], extra: Panel[] = [], vars: Record<string, string | number> = {}) => emit(r, [stringPanel(t, active, byteMode ? 'Text · UTF-8 bytes' : 'Text · code points'), ...extra], msg, vars, 'Chuỗi');
        visual('Khởi tạo; các vị trí dùng đúng đơn vị ký tự được ghi trên panel.');
        if (id === 'prefix-function') {
            const pi = prefix(p as number[], (i, j, a, msg) => { r.consume(); emit(r, [stringPanel(p, [i, j], 'Pattern · bytes'), arrayPanel(a, [i], 'pi', 'pi')], msg, { i, j }); });
            emit(r, [arrayPanel(pi, [], 'pi')], 'Bảng prefix hoàn tất.');
            return { output: pi.join(', ') };
        }
        if (id === 'kmp-search') {
            if (!p.length) {
                visual('Mẫu rỗng khớp tại mọi ranh giới byte.');
                return { output: Array.from({ length: t.length + 1 }, (_, i) => i).join(', ') };
            }
            const pi = prefix(p as number[], (i, j, a, msg) => emit(r, [stringPanel(p, [i, j], 'Pattern · bytes'), arrayPanel(a, [i], 'pi', 'pi')], msg));
            const matches: number[] = [];
            let j = 0;
            for (let i = 0; i < t.length; i++) {
                r.consume();
                while (j > 0 && t[i] !== p[j]) {
                    visual(`Sai khớp: j=${j} → pi[j-1]=${pi[j - 1]}.`, [i], [arrayPanel(pi, [j - 1], 'pi', 'pi')], { i, j });
                    j = pi[j - 1];
                }
                if (t[i] === p[j])
                    j++;
                visual(`Đọc byte ${i}; đã khớp ${j} byte của mẫu.`, [i], [stringPanel(p, [], 'Pattern', 'pattern')], { i, j });
                if (j === p.length) {
                    matches.push(i - p.length + 1);
                    visual('Ghi vị trí khớp, rồi fallback để tìm cả lần chồng lấn.', [i], [arrayPanel(matches, [], 'Matches', 'matches')]);
                    j = pi[j - 1];
                }
            }
            visual('Quét xong.', [], [arrayPanel(matches, [], 'Matches', 'matches')]);
            return { output: matches.join(', ') };
        }
        if (id === 'boyer-moore') {
            if (!p.length) {
                visual('Mẫu rỗng: mọi byte boundary.');
                return { output: Array.from({ length: t.length + 1 }, (_, i) => i).join(', ') };
            }
            const m = p.length, shift = Array(m + 1).fill(0), border = Array(m + 1).fill(0);
            let i = m, j = m + 1;
            border[i] = j;
            while (i > 0) {
                r.consume();
                while (j <= m && p[i - 1] !== p[j - 1]) {
                    if (shift[j] === 0)
                        shift[j] = j - i;
                    j = border[j];
                }
                i--;
                j--;
                border[i] = j;
            }
            j = border[0];
            for (i = 0; i <= m; i++) {
                if (shift[i] === 0)
                    shift[i] = j;
                if (i === j)
                    j = border[j];
            }
            const last = new Map(p.map((x, i) => [x, i]));
            visual('Đã xây bảng good suffix và bad character.', [], [arrayPanel(shift, [], 'Good-suffix shift', 'shift')]);
            const matches: number[] = [];
            let s = 0;
            while (s <= t.length - m) {
                r.consume();
                j = m - 1;
                while (j >= 0 && p[j] === t[s + j]) {
                    visual('So mẫu từ phải sang trái.', [s + j], [{ kind: 'string', id: 'alignment', heading: 'Pattern alignment', text: t, pattern: p, offset: s, active: [s + j] }], { s, j });
                    j--;
                }
                if (j < 0) {
                    matches.push(s);
                    visual(`Khớp tại ${s}; dịch good suffix ${shift[0]}.`, [], [arrayPanel(matches, [], 'Matches', 'matches')]);
                    s += shift[0];
                }
                else {
                    const bad = Math.max(1, j - (last.get(t[s + j]) ?? -1)), good = shift[j + 1];
                    visual(`Sai tại j=${j}; bad=${bad}, good=${good}, dịch ${Math.max(bad, good)}.`, [s + j], [], { s, j });
                    s += Math.max(bad, good);
                }
            }
            return { output: matches.join(', ') };
        }
        if (id.startsWith('hash-')) {
            const base = 31n, mod = 97n, h = [0n], powers = [1n];
            for (let i = 0; i < t.length; i++) {
                r.consume();
                h.push((h[i] * base + BigInt(t[i])) % mod);
                powers.push(powers[i] * base % mod);
                visual(`prefixHash[${i + 1}]=${h[i + 1]}.`, [i], [arrayPanel(h.map(String), [i + 1], 'Hash', 'hash')]);
            }
            const segment = (l: number, z: number) => (h[z] - h[l] * powers[z - l] % mod + mod) % mod;
            if (id === 'hash-prefix')
                return { output: String(h[t.length]) };
            if (id === 'hash-substring') {
                const parts = v.query.trim().split(/\s+/);
                requireCondition(parts.length === 2, 'Dùng query l r.');
                const l = num(parts[0], 0, t.length), z = num(parts[1], l, t.length), hash = segment(l, z);
                visual(`Hash [${l},${z})=${hash}.`, Array.from({ length: z - l }, (_, i) => l + i));
                return { output: String(hash) };
            }
            let ph = 0n;
            for (const x of p)
                ph = (ph * base + BigInt(x)) % mod;
            const matches: number[] = [];
            for (let s = 0; s + p.length <= t.length; s++) {
                r.consume();
                const hash = segment(s, s + p.length), candidate = hash === ph;
                const equal = candidate && p.every((x, i) => x === t[s + i]);
                visual(`Cửa sổ ${s}: hash=${hash}; ${candidate ? equal ? 'verify byte: khớp' : 'hash trùng nhưng byte khác' : 'khác hash'}.`, Array.from({ length: p.length }, (_, i) => s + i), [tablePanel(['hash mẫu', 'hash cửa sổ', 'verify'], [[String(ph), String(hash), equal ? 'match' : 'no']])]);
                if (equal)
                    matches.push(s);
            }
            return { output: matches.join(', ') };
        }
        if (id.startsWith('manacher-')) {
            const odd = id === 'manacher-odd', radius = Array(t.length).fill(0);
            let l = 0, h = -1;
            for (let i = 0; i < t.length; i++) {
                r.consume();
                let k = i > h ? (odd ? 1 : 0) : Math.min(radius[l + h - i + (odd ? 0 : 1)], h - i + 1);
                visual(`Tâm ${i}, lấy radius từ mirror khi trong [${l},${h}].`, [i], [arrayPanel(radius, [i], 'Radius', 'radius')], { l, r: h, k });
                while (i - k - (odd ? 0 : 1) >= 0 && i + k < t.length && t[i - k - (odd ? 0 : 1)] === t[i + k]) {
                    r.consume();
                    visual('Mở rộng vì hai ký tự đối xứng bằng nhau.', [i - k - (odd ? 0 : 1), i + k], [], { i, k });
                    k++;
                }
                radius[i] = k;
                if (i + k - 1 > h) {
                    l = i - k + (odd ? 1 : 0);
                    h = i + k - 1;
                }
                visual(`Ghi radius[${i}]=${k}.`, [i], [arrayPanel(radius, [i], 'Radius', 'radius')], { l, r: h });
            }
            return { output: radius.join(', ') };
        }
        let seq: (string | number | symbol)[] = t;
        if (id === 'z-pattern')
            seq = [...p, Symbol('separator'), ...t];
        const z = Array(seq.length).fill(0);
        let l = 0, h = 0;
        for (let i = 1; i < seq.length; i++) {
            r.consume();
            if (i <= h)
                z[i] = Math.min(h - i + 1, z[i - l]);
            while (i + z[i] < seq.length && seq[z[i]] === seq[i + z[i]]) {
                r.consume();
                z[i]++;
            }
            if (i + z[i] - 1 > h) {
                l = i;
                h = i + z[i] - 1;
            }
            emit(r, [stringPanel(seq.map(x => typeof x === 'symbol' ? '⟂' : x), [i], 'Z sequence'), arrayPanel(z, [i], 'Z', 'z')], `Z[${i}]=${z[i]}, Z-box=[${l},${h}].`, { l, r: h });
        }
        if (id === 'z-box')
            return { output: z.join(', ') };
        const matches: number[] = [];
        if (!p.length)
            for (let i = 0; i <= t.length; i++)
                matches.push(i);
        else
            for (let i = p.length + 1; i < z.length; i++)
                if (z[i] >= p.length)
                    matches.push(i - p.length - 1);
        visual('Tìm mẫu từ các giá trị Z.', [], [arrayPanel(matches, [], 'Matches', 'matches')]);
        return { output: matches.join(', ') };
    };
export const mountScenarioById = (id: string, root: HTMLElement) => mountFamily(id, root, definitions, builders);
