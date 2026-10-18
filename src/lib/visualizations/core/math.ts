export const mod = (a: bigint, m: bigint) => ((a % m) + m) % m;
export function gcd(a: bigint, b: bigint): bigint { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b)
    [a, b] = [b, a % b]; return a; }
export function extendedGcd(a: bigint, b: bigint): [
    bigint,
    bigint,
    bigint
] { let x = 1n, y = 0n, xx = 0n, yy = 1n; while (b) {
    const q = a / b;
    [a, b] = [b, a - q * b];
    [x, xx] = [xx, x - q * xx];
    [y, yy] = [yy, y - q * yy];
} if (a < 0n)
    return [-a, -x, -y]; return [a, x, y]; }
export function powMod(a: bigint, e: bigint, m: bigint, consume: () => void = () => { }): bigint { a = mod(a, m); let result = 1n % m; while (e) {
    consume();
    if (e & 1n)
        result = result * a % m;
    a = a * a % m;
    e >>= 1n;
} return result; }
export function isSmallPrime(n: bigint): boolean { if (n < 2n)
    return false; for (let d = 2n; d * d <= n; d++)
    if (n % d === 0n)
        return false; return true; }
