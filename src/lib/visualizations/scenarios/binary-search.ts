import type { Scenario, Trace } from '../types';
import code from './lower-bound.go?raw';
import { visualizationCatalog } from '../catalog.mjs';
import { createIndexedArrayView } from '../views/indexed-array';
interface Input {
    array: number[];
    target: number;
}
interface State extends Input {
    lo: number;
    hi: number;
    mid: number | null;
}
export function parseBinaryInput(values: Record<string, string>): Input {
    const parts = values.array.trim() ? values.array.trim().split(/[\s,]+/) : [];
    const target = values.target.trim();
    const validInteger = (text: string) => /^-?\d+$/.test(text) && Number.isSafeInteger(Number(text));
    if (parts.length > 32)
        throw new Error('Dùng tối đa 32 phần tử để minh họa vẫn dễ đọc.');
    if (parts.some((part) => !validInteger(part)))
        throw new Error('Mảng cần chứa số nguyên, cách nhau bằng dấu phẩy hoặc khoảng trắng.');
    if (!validInteger(target))
        throw new Error('Target cần là số nguyên an toàn.');
    const array = parts.map(Number);
    if (array.some((value, i) => i > 0 && array[i - 1] > value))
        throw new Error('Binary search cần mảng đã sắp xếp không giảm.');
    return { array, target: Number(target) };
}
export function buildBinaryTrace({ array, target }: Input): Trace<State> {
    const frames: Trace<State>['frames'] = [];
    let lo = 0, hi = array.length, comparisons = 0;
    function add(mid: number | null, explanation: string, codeLines: number[]) {
        const label = mid !== null ? 'So sánh' : codeLines.includes(13) ? 'Kết quả' : codeLines.includes(4) ? 'Khởi tạo' : 'Thu hẹp khoảng';
        frames.push({ state: { array: [...array], target, lo, hi, mid }, label, explanation, variables: { lo, hi, mid: mid ?? '—', 'so sánh': comparisons }, codeLines });
    }
    add(null, `Bắt đầu với khoảng [0, ${hi}). Tìm vị trí đầu tiên có giá trị ≥ ${target}.`, [4]);
    while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        comparisons++;
        add(mid, `Xét a[${mid}] = ${array[mid]}. ${array[mid] < target ? `Giá trị này nhỏ hơn ${target}; các vị trí từ lo đến mid đều quá nhỏ.` : `Giá trị này ≥ ${target}; mid vẫn có thể là đáp án.`}`, [6, 7]);
        if (array[mid] < target) {
            lo = mid + 1;
            add(null, `Đặt lo = ${lo}. Khoảng còn xét là [${lo}, ${hi}); phần bên trái đã được loại bỏ.`, [8]);
        }
        else {
            hi = mid;
            add(null, `Đặt hi = ${hi}. Giữ mid làm ứng viên; tiếp tục tìm biên đầu tiên ở bên trái.`, [10]);
        }
    }
    const found = lo < array.length && array[lo] === target;
    const summary = found ? `Target ${target} có mặt ở chỉ số ${lo}.` : lo === array.length ? 'Không có phần tử ≥ target. Biên nằm ngay sau mảng.' : `Target không có trong mảng. Có thể chèn tại chỉ số ${lo} để giữ thứ tự.`;
    add(null, `lo = hi = ${lo}: hai biên gặp nhau. ${summary}`, [13]);
    return { frames, output: String(lo), summary };
}
function createArrayView(container: HTMLElement) {
    const view = createIndexedArrayView(container);
    return {
        render({ state }: {
            state: State;
        }, finished: boolean) {
            view.render({ values: state.array, range: [state.lo, state.hi], focus: state.mid, result: finished ? state.lo : null,
                label: finished ? `Biên kết quả: ${state.lo}` : `Khoảng [${state.lo}, ${state.hi})`, target: `target = ${state.target}` });
        },
    };
}
export const binarySearch: Scenario<Input, State> = {
    ...visualizationCatalog['binary-search'],
    parse: parseBinaryInput, build: buildBinaryTrace, createView: createArrayView,
    source: { language: 'Go', code },
};
