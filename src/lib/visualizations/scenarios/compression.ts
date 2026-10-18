import { definitions } from '../catalog/compression.mjs';
import { mountFamily, emit, type Builder } from '../core/scenario';
import { arrayPanel, tablePanel, type GraphPanel } from '../core/scene';
import { parseBytes, parseInteger as num, requireCondition } from '../core/input';
const builders: Record<string, Builder> = {};
for (const id of Object.keys(definitions))
    builders[id] = (v, r) => {
        const input = parseBytes(v.text, 24);
        const tokens: (string | number)[][] = [];
        const output: number[] = [];
        const show = (msg: string, active: number[] = []) => emit(r, [arrayPanel(input, active, 'Input bytes'), tablePanel(id === 'rle-codec' ? ['byte', 'count'] : id === 'lz77-codec' ? ['type', 'offset/byte', 'length'] : ['byte', 'code'], tokens, 'Encoding', 'tokens'), arrayPanel(output, [], 'Decoded bytes', 'decoded')], msg, {}, 'Codec');
        show('Khởi tạo codec.');
        if (id === 'rle-codec') {
            let i = 0;
            while (i < input.length) {
                const start = i, value = input[i];
                while (i < input.length && input[i] === value) {
                    r.consume();
                    i++;
                }
                tokens.push([value, i - start]);
                show(`Run byte ${value} dài ${i - start}.`, Array.from({ length: i - start }, (_, j) => start + j));
            }
            for (const [value, count] of tokens) {
                for (let j = 0; j < Number(count); j++)
                    output.push(Number(value));
                show('Decode một run theo count.');
            }
        }
        else if (id === 'lz77-codec') {
            const window = num(v.window, 1, 16);
            let i = 0;
            while (i < input.length) {
                r.consume();
                let bestLength = 0, bestOffset = 0;
                for (let off = 1; off <= Math.min(window, i); off++) {
                    let len = 0;
                    while (i + len < input.length && input[i + len] === input[i + len - off]) {
                        r.consume();
                        len++;
                    }
                    if (len > bestLength) {
                        bestLength = len;
                        bestOffset = off;
                    }
                }
                if (bestLength >= 3) {
                    tokens.push(['match', bestOffset, bestLength]);
                    show(`Tham chiếu offset=${bestOffset}, len=${bestLength}; cho phép overlap.`, [i]);
                    i += bestLength;
                }
                else {
                    tokens.push(['literal', input[i], 1]);
                    show('Xuất literal byte.', [i++]);
                }
            }
            for (const [kind, value, length] of tokens) {
                if (kind === 'literal')
                    output.push(Number(value));
                else
                    for (let j = 0; j < Number(length); j++) {
                        r.consume();
                        output.push(output[output.length - Number(value)]);
                        show('Copy tuần tự từ output đã có; byte vừa ghi có thể thành nguồn.');
                    }
                show('Decode token.');
            }
        }
        else {
            interface Node {
                id: number;
                freq: number;
                byte?: number;
                left?: Node;
                right?: Node;
            }
            ;
            let next = 0;
            const freq = new Map<number, number>();
            input.forEach(x => freq.set(x, (freq.get(x) ?? 0) + 1));
            const heap: Node[] = [...freq].sort(([a], [b]) => a - b).map(([byte, freq]) => ({ id: next++, byte, freq }));
            const all = [...heap];
            const graph = (): GraphPanel => ({ kind: 'graph', id: 'huffman', heading: 'Cây Huffman', nodes: all.map(n => ({ id: String(n.id), label: n.byte === undefined ? String(n.freq) : `${n.byte}`, detail: `freq=${n.freq}` })), edges: all.flatMap(n => [...(n.left ? [{ id: `${n.id}L`, from: String(n.id), to: String(n.left.id), label: '0', directed: true }] : []), ...(n.right ? [{ id: `${n.id}R`, from: String(n.id), to: String(n.right.id), label: '1', directed: true }] : [])]) });
            while (heap.length > 1) {
                r.consume();
                heap.sort((a, b) => a.freq - b.freq || a.id - b.id);
                const left = heap.shift()!, right = heap.shift()!, parent = { id: next++, freq: left.freq + right.freq, left, right };
                heap.push(parent);
                all.push(parent);
                emit(r, [graph(), tablePanel(['id', 'freq'], heap.map(n => [n.id, n.freq]))], 'Gộp hai nút tần suất nhỏ nhất.');
            }
            const root = heap[0];
            const codes = new Map<number, string>();
            const rec = (n: Node, path: string) => { r.consume(); if (n.byte !== undefined)
                codes.set(n.byte, path || '0');
            else {
                rec(n.left!, path + '0');
                rec(n.right!, path + '1');
            } };
            if (root)
                rec(root, '');
            codes.forEach((code, byte) => tokens.push([byte, code]));
            const encoded = input.map(x => codes.get(x)!).join('');
            show('Mã prefix-free; decoder còn giữ số byte đầu ra để bỏ padding.');
            if (root?.byte !== undefined) {
                for (let i = 0; i < input.length; i++)
                    output.push(root.byte);
            }
            else if (root) {
                let node = root;
                for (const bit of encoded) {
                    r.consume();
                    node = bit === '0' ? node.left! : node.right!;
                    if (node.byte !== undefined) {
                        output.push(node.byte);
                        node = root;
                        show('Đọc tới lá: xuất byte và quay về gốc.');
                    }
                }
            }
            emit(r, [graph(), tablePanel(['bits', 'decoded length'], [[encoded, output.length]])], 'Decode kết thúc ở đúng số byte yêu cầu.');
        }
        requireCondition(output.length === input.length && output.every((x, i) => x === input[i]), 'Codec không khôi phục đúng input.');
        show('Round trip khôi phục đúng dãy byte.');
        return { output: new TextDecoder().decode(Uint8Array.from(output)), summary: 'Output là dãy byte giải mã lại, không phải ước lượng tỷ lệ nén.' };
    };
export const mountScenarioById = (id: string, root: HTMLElement) => mountFamily(id, root, definitions, builders);
