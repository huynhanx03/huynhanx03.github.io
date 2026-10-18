export function parseInteger(raw: string, min: number, max: number): number {
    if (!/^-?\d+$/.test(raw.trim()))
        throw new Error('Cần nhập số nguyên.');
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n < min || n > max)
        throw new Error(`Số phải nằm trong [${min}, ${max}].`);
    return n;
}
export function parseIntegerArray(raw: string, maxLength = 24): number[] {
    const parts = raw.trim() ? raw.trim().split(/[\s,]+/) : [];
    if (parts.length > maxLength)
        throw new Error(`Tối đa ${maxLength} phần tử.`);
    return parts.map(x => parseInteger(x, -1000000, 1000000));
}
export function parseBigInteger(raw: string, min: bigint, max: bigint): bigint {
    if (!/^-?\d+$/.test(raw.trim()) || raw.length > 64)
        throw new Error('Cần số nguyên thập phân dài tối đa 64 ký tự.');
    const n = BigInt(raw);
    if (n < min || n > max)
        throw new Error(`Số phải nằm trong [${min}, ${max}].`);
    return n;
}
export function parseText(raw: string, max = 24): string[] { const a = Array.from(raw); if (a.length > max)
    throw new Error(`Tối đa ${max} ký tự Unicode.`); return a; }
export function parseBytes(raw: string, max = 24): number[] { const a = [...new TextEncoder().encode(raw)]; if (a.length > max)
    throw new Error(`Tối đa ${max} byte UTF-8.`); return a; }
export interface Edge {
    id: string;
    u: number;
    v: number;
    w: number;
    capacity?: number;
    cost?: number;
}
export interface Graph {
    n: number;
    edges: Edge[];
    directed: boolean;
    weighted?: boolean;
}
export function parseGraph(nRaw: string, raw: string, directed = false, weighted = false): Graph {
    const n = parseInteger(nRaw, 1, 12);
    const lines = raw.trim() ? raw.trim().split(/\n+/) : [];
    if (lines.length > 30)
        throw new Error('Tối đa 30 cạnh.');
    const edges = lines.map((line, i) => { const parts = line.trim().split(/[\s,]+/); if (parts.length !== (weighted ? 3 : 2))
        throw new Error(`Cạnh dòng ${i + 1}: dùng u v${weighted ? ' trọng_số' : ''}.`); return { id: `e${i}`, u: parseInteger(parts[0], 0, n - 1), v: parseInteger(parts[1], 0, n - 1), w: weighted ? parseInteger(parts[2], -100, 100) : 1 }; });
    return { n, edges, directed, weighted };
}
export function adjacency(g: Graph) { const a: {
    to: number;
    edge: Edge;
}[][] = Array.from({ length: g.n }, () => []); for (const e of g.edges) {
    a[e.u].push({ to: e.v, edge: e });
    if (!g.directed)
        a[e.v].push({ to: e.u, edge: e });
} a.forEach(row => row.sort((x, y) => x.to - y.to || x.edge.id.localeCompare(y.edge.id))); return a; }
export function parseJSON<T>(raw: string): T { if (raw.length > 4096)
    throw new Error('Input quá dài.'); try {
    return JSON.parse(raw) as T;
}
catch {
    throw new Error('Input JSON không hợp lệ.');
} }
export function requireCondition(ok: unknown, message: string): asserts ok { if (!ok)
    throw new Error(message); }
