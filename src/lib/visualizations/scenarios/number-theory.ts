import { definitions } from '../catalog/number-theory.mjs';
import { mountFamily, emit, type Builder } from '../core/scenario';
import { arrayPanel, tablePanel, type Panel } from '../core/scene';
import { parseBigInteger as big, parseInteger as num, requireCondition } from '../core/input';
import { gcd, mod, powMod, isSmallPrime } from '../core/math';
const builders: Record<string, Builder> = {};
for (const id of Object.keys(definitions))
    builders[id] = (v, r) => {
        const rows: (number | string)[][] = [];
        const show = (msg: string, columns: string[], row: (number | string)[], extra: Panel[] = []) => { rows.push(row); emit(r, [tablePanel(columns, rows.slice(-24)), ...extra], msg, {}, 'Số học'); };
        const get = (s: string, min = -1000000n, max = 1000000000000000000n) => big(s, min, max);
        if (id === 'normalize-modulo') {
            const a = get(v.a), m = get(v.mod, 1n), out = mod(a, m);
            show('Chuẩn hóa bằng ((a % m)+m)%m.', ['a', 'm', 'r'], [String(a), String(m), String(out)]);
            return { output: String(out) };
        }
        if (id === 'euclid' || id === 'extended-euclid' || id === 'modular-inverse' || id === 'crt-merge') {
            let a = id === 'crt-merge' ? get(v.m, 1n) : get(v.a), b = id === 'crt-merge' || id === 'modular-inverse' ? get(v.mod, 1n) : get(v.b);
            const originalA = a, originalB = b;
            let x = 1n, y = 0n, xx = 0n, yy = 1n;
            show('Khởi tạo hệ số Bézout.', ['a', 'b', 'x', 'y'], [String(a), String(b), String(x), String(y)]);
            while (b) {
                r.consume();
                const q = a / b;
                [a, b] = [b, a - q * b];
                [x, xx] = [xx, x - q * xx];
                [y, yy] = [yy, y - q * yy];
                show(`Chia Euclid q=${q}.`, ['a', 'b', 'x', 'y'], [String(a), String(b), String(x), String(y)]);
            }
            if (a < 0n) {
                a = -a;
                x = -x;
                y = -y;
            }
            if (id === 'modular-inverse') {
                if (a !== 1n)
                    return { output: 'Không có nghịch đảo' };
                const inv = mod(x, originalB);
                show('GCD=1, chuẩn hóa hệ số x thành inverse.', ['a', 'b', 'x', 'y'], [String(originalA), String(originalB), String(inv), '']);
                return { output: String(inv) };
            }
            if (id === 'crt-merge') {
                const first = mod(get(v.x), originalA), second = mod(get(v.y), originalB), difference = second - first;
                if (difference % a !== 0n)
                    return { output: 'Vô nghiệm' };
                const k = mod(difference / a * x, originalB / a), lcm = originalA / a * originalB, result = mod(first + originalA * k, lcm);
                show('Tương thích theo gcd; ghép và chuẩn hóa theo lcm.', ['a', 'b', 'x', 'y'], [String(originalA), String(originalB), String(result), `mod ${lcm}`]);
                return { output: `${result} (mod ${lcm})` };
            }
            return { output: String(a), summary: `${originalA}·(${x}) + ${originalB}·(${y}) = ${a}.` };
        }
        if (id === 'binary-power') {
            let a = get(v.base), e = get(v.exponent, 0n, 10000n);
            const m = get(v.mod, 1n);
            a = mod(a, m);
            let result = 1n % m;
            show('Khởi tạo result.', ['base', 'exp', 'result'], [String(a), String(e), String(result)]);
            while (e) {
                r.consume();
                if (e & 1n)
                    result = result * a % m;
                e >>= 1n;
                a = a * a % m;
                show('Xét bit thấp, bình phương base rồi dịch exp.', ['base', 'exp', 'result'], [String(a), String(e), String(result)]);
            }
            return { output: String(result) };
        }
        if (id === 'eratosthenes' || id === 'spf-factorization') {
            const n = num(v.n, 1, 100), spf = Array(n + 1).fill(0);
            emit(r, [arrayPanel(spf.map((_, i) => i < 2 ? '×' : '·'), [], 'Sieve / SPF')], 'Khởi tạo: 0 và 1 không phải số nguyên tố.');
            for (let i = 2; i <= n; i++)
                if (!spf[i]) {
                    spf[i] = i;
                    for (let j = i * i; j <= n; j += i) {
                        r.consume();
                        if (!spf[j])
                            spf[j] = i;
                    }
                    emit(r, [arrayPanel(spf.map((x, j) => j < 2 ? '×' : x === j ? 'P' : x || '·'), [i], 'Sieve / SPF')], `p=${i}, gạch từ p²; giữ smallest prime factor.`);
                }
            if (id === 'eratosthenes')
                return { output: spf.map((x, i) => i >= 2 && x === i ? i : -1).filter(x => x >= 0).join(', ') };
            let x = n;
            const factors = new Map<number, number>();
            while (x > 1) {
                const p = spf[x];
                factors.set(p, (factors.get(p) ?? 0) + 1);
                x /= p;
                show(`Chia ${p} theo SPF.`, ['còn lại', 'prime', 'exponent'], [x, p, factors.get(p)!]);
            }
            return { output: [...factors].map(([p, e]) => `${p}^${e}`).join(' × ') };
        }
        if (['trial-factorization', 'divisor-count-sum', 'totient', 'mobius'].includes(id)) {
            let n = get(v.n, 1n, 1000000n);
            const original = n, factors: [
                bigint,
                number
            ][] = [];
            for (let p = 2n; p * p <= n; p++) {
                r.consume();
                if (n % p)
                    continue;
                let e = 0;
                while (n % p === 0n) {
                    n /= p;
                    e++;
                    show(`Tách thừa số ${p}.`, ['prime', 'exp', 'remaining'], [String(p), e, String(n)]);
                }
                factors.push([p, e]);
            }
            if (n > 1n)
                factors.push([n, 1]);
            show('Phân tích hoàn tất.', ['prime', 'exp', 'remaining'], ['—', '—', String(n)]);
            if (id === 'trial-factorization')
                return { output: factors.map(([p, e]) => `${p}^${e}`).join(' × ') };
            let count = 1n, sum = 1n, phi = original;
            for (const [p, e] of factors) {
                count *= BigInt(e + 1);
                let geometric = 1n, power = 1n;
                for (let j = 1; j <= e; j++) {
                    power *= p;
                    geometric += power;
                }
                sum *= geometric;
                phi = phi / p * (p - 1n);
                show(`Gộp đóng góp prime ${p}.`, ['prime', 'exp', 'remaining'], [String(p), e, `d=${count}; sigma=${sum}; phi=${phi}`]);
            }
            return { output: id === 'divisor-count-sum' ? `${count}; ${sum}` : id === 'totient' ? String(phi) : factors.some(([, e]) => e > 1) ? '0' : String(factors.length % 2 ? -1 : 1) };
        }
        if (id === 'miller-rabin') {
            const n = get(v.n, 2n, 1000000n);
            if (n === 2n || n === 3n) {
                show('Prime nhỏ.', ['n'], [String(n)]);
                return { output: 'Nguyên tố' };
            }
            if (n % 2n === 0n) {
                show('Số chẵn >2.', ['n'], [String(n)]);
                return { output: 'Hợp số' };
            }
            let d = n - 1n, s = 0;
            while (!(d & 1n)) {
                d >>= 1n;
                s++;
            }
            for (const base of [2n, 3n, 5n, 7n, 11n]) {
                if (base >= n)
                    continue;
                let x = powMod(base, d, n, () => r.consume());
                show('Tính a^d mod n.', ['base', 'd', 's', 'x'], [String(base), String(d), s, String(x)]);
                if (x === 1n || x === n - 1n)
                    continue;
                let pass = false;
                for (let j = 1; j < s; j++) {
                    x = x * x % n;
                    show('Bình phương để tìm −1.', ['base', 'd', 's', 'x'], [String(base), String(d), j, String(x)]);
                    if (x === n - 1n) {
                        pass = true;
                        break;
                    }
                }
                if (!pass)
                    return { output: 'Hợp số' };
            }
            return { output: 'Nguyên tố', summary: 'Bases cố định đủ cho miền giáo dục được giới hạn, không tuyên bố toàn miền 64-bit.' };
        }
        if (id === 'pollard-rho') {
            const n = get(v.n, 2n, 1000000n);
            if (isSmallPrime(n)) {
                show('n nguyên tố trong miền nhỏ.', ['n'], [String(n)]);
                return { output: 'Nguyên tố' };
            }
            if (n % 2n === 0n) {
                show('Tách factor 2.', ['factor'], ['2']);
                return { output: '2' };
            }
            let operations = 0;
            for (let c = 1n; c <= 16n; c++) {
                let x = 2n, y = 2n, d = 1n;
                const f = (z: bigint) => (z * z + c) % n;
                while (d === 1n) {
                    if (++operations > 20000)
                        throw new Error('Pollard–Rho vượt budget; hãy đổi input nhỏ hơn.');
                    r.consume();
                    x = f(x);
                    y = f(f(y));
                    d = gcd(x - y, n);
                    show(`Floyd với c=${c}; gcd(x−y,n).`, ['x', 'y', 'gcd'], [String(x), String(y), String(d)]);
                }
                if (d !== n)
                    return { output: String(d), summary: `Factor ${d}, factor còn lại ${n / d}.` };
                show('Va chạm vô ích, retry c kế tiếp.', ['x', 'y', 'gcd'], [String(x), String(y), String(d)]);
            }
            throw new Error('Chưa tìm được factor trong budget deterministic.');
        }
        if (id === 'binomial-pascal') {
            const n = num(v.n, 0, 20), k = num(v.k, 0, n), m = get(v.mod, 1n);
            const dp: bigint[][] = [];
            for (let i = 0; i <= n; i++) {
                r.consume();
                const row = Array(i + 1).fill(1n % m);
                for (let j = 1; j < i; j++)
                    row[j] = (dp[i - 1][j - 1] + dp[i - 1][j]) % m;
                dp.push(row);
                emit(r, [tablePanel(['n', ...Array.from({ length: n + 1 }, (_, j) => String(j))], dp.map((row, i) => [i, ...Array.from({ length: n + 1 }, (_, j) => row[j] === undefined ? '—' : String(row[j]))]))], `Hàng Pascal ${i}.`);
            }
            return { output: String(dp[n][k]) };
        }
        if (id === 'lucas' || id === 'wilson-factorial') {
            let n = get(v.n, 0n, 10000n);
            const p = get(v.p, 2n, 97n);
            requireCondition(isSmallPrime(p), 'p phải nguyên tố.');
            const fact = [1n];
            for (let i = 1n; i < p; i++)
                fact.push(fact[Number(i - 1n)] * i % p);
            if (id === 'wilson-factorial') {
                let out = 1n;
                show('Bảng giai thừa <p.', ['n', 'result'], [String(n), String(out)]);
                while (n > 1n) {
                    r.consume();
                    if ((n / p) & 1n)
                        out = p - out;
                    out = out * fact[Number(n % p)] % p;
                    show('Block đầy dùng (p−1)! ≡ −1; tiếp tục n/p.', ['n', 'result'], [String(n), String(out)]);
                    n /= p;
                }
                return { output: String(out) };
            }
            let k = get(v.k, 0n, 10000n), out = 1n;
            if (k > n) {
                show('k>n.', ['n', 'k'], [String(n), String(k)]);
                return { output: '0' };
            }
            show('Tách chữ số base p.', ['n digit', 'k digit', 'product'], ['—', '—', '1']);
            while (n || k) {
                r.consume();
                const ni = n % p, ki = k % p;
                if (ki > ni) {
                    out = 0n;
                    show('Chữ số k vượt chữ số n.', ['n digit', 'k digit', 'product'], [String(ni), String(ki), '0']);
                    break;
                }
                const choose = fact[Number(ni)] * powMod(fact[Number(ki)] * fact[Number(ni - ki)] % p, p - 2n, p, () => r.consume()) % p;
                out = out * choose % p;
                show('Nhân tổ hợp tại chữ số này.', ['n digit', 'k digit', 'product'], [String(ni), String(ki), String(out)]);
                n /= p;
                k /= p;
            }
            return { output: String(out) };
        }
        const p = get(v.p, 2n, 997n);
        requireCondition(isSmallPrime(p), 'p phải là số nguyên tố.');
        const a = mod(get(v.a), p);
        if (id === 'bsgs') {
            const g = mod(get(v.base), p);
            requireCondition(g !== 0n, 'Base phải thuộc nhóm nhân, khác 0 modulo p.');
            const m = BigInt(Math.ceil(Math.sqrt(Number(p - 1n)))), baby = new Map<string, bigint>();
            let cur = 1n;
            for (let j = 0n; j < m; j++) {
                r.consume();
                if (!baby.has(String(cur)))
                    baby.set(String(cur), j);
                show('Baby step g^j.', ['j', 'value'], [String(j), String(cur)]);
                cur = cur * g % p;
            }
            const factor = powMod(powMod(g, m, p), p - 2n, p), candidates: bigint[] = [];
            cur = a;
            for (let i = 0n; i <= m; i++) {
                r.consume();
                const j = baby.get(String(cur));
                show('Giant step h·g^(−im).', ['j', 'value'], [String(i), String(cur)]);
                if (j !== undefined) {
                    const x = i * m + j;
                    if (x < p - 1n && powMod(g, x, p) === a)
                        candidates.push(x);
                }
                cur = cur * factor % p;
            }
            return { output: candidates.length ? String(candidates.reduce((x, y) => x < y ? x : y)) : 'Vô nghiệm' };
        }
        const roots = (x: bigint) => [x, mod(-x, p)].filter((x, i, a) => a.indexOf(x) === i).sort((x, y) => x < y ? -1 : 1).join(', ');
        if (a === 0n || p === 2n) {
            show('Trường hợp đặc biệt a=0 hoặc p=2.', ['a', 'p'], [String(a), String(p)]);
            return { output: id === 'euler-criterion' ? 'Có nghiệm' : roots(a) };
        }
        const criterion = powMod(a, (p - 1n) / 2n, p, () => r.consume());
        show('Euler criterion.', ['a', 'p', 'a^((p−1)/2)'], [String(a), String(p), String(criterion)]);
        if (criterion !== 1n)
            return { output: 'Vô nghiệm' };
        if (id === 'euler-criterion')
            return { output: 'Có nghiệm' };
        if (id === 'sqrt-mod-3') {
            requireCondition(p % 4n === 3n, 'Công thức này cần p≡3 mod4.');
            const x = powMod(a, (p + 1n) / 4n, p);
            show('Lấy a^((p+1)/4) rồi verify.', ['a', 'p', 'root'], [String(a), String(p), String(x)]);
            requireCondition(x * x % p === a, 'Root verification thất bại.');
            return { output: roots(x) };
        }
        let q = p - 1n, s = 0;
        while (q % 2n === 0n) {
            q /= 2n;
            s++;
        }
        let z = 2n;
        while (powMod(z, (p - 1n) / 2n, p) !== p - 1n) {
            r.consume();
            z++;
        }
        let c = powMod(z, q, p), x = powMod(a, (q + 1n) / 2n, p), t = powMod(a, q, p), m = s;
        show('Khởi tạo Tonelli–Shanks: x²≡a·t.', ['x', 't', 'c', 'm'], [String(x), String(t), String(c), m]);
        while (t !== 1n) {
            r.consume();
            let i = 0, tt = t;
            while (tt !== 1n && i < m) {
                r.consume();
                tt = tt * tt % p;
                i++;
            }
            requireCondition(i < m, 'Không tìm được bậc phù hợp.');
            const b = powMod(c, 1n << BigInt(m - i - 1), p);
            x = x * b % p;
            t = t * b % p * b % p;
            c = b * b % p;
            m = i;
            show('Giảm bậc t bằng các lần bình phương.', ['x', 't', 'c', 'm'], [String(x), String(t), String(c), m]);
        }
        requireCondition(x * x % p === a, 'Root verification thất bại.');
        return { output: roots(x) };
    };
export const mountScenarioById = (id: string, root: HTMLElement) => mountFamily(id, root, definitions, builders);
