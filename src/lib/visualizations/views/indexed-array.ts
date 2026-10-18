/** Reusable array scene. Position animation belongs here, never in the player. */
export interface IndexedArrayScene {
    values: number[];
    range: [
        number,
        number
    ];
    focus: number | null;
    result: number | null;
    label: string;
    target: string;
}
export function createIndexedArrayView(container: HTMLElement) {
    container.innerHTML = '<div class="nv-stage-meta"><span data-interval></span><span class="nv-target" data-target></span></div><div class="nv-array-scroll"><div class="nv-array-board"><div class="nv-interval-band"></div><span class="nv-marker nv-marker-mid" aria-hidden="true">mid</span><div class="nv-array"></div><span class="nv-marker nv-marker-lo" aria-hidden="true">lo</span><span class="nv-marker nv-marker-hi" aria-hidden="true">hi</span></div></div><div class="nv-legend"><span class="nv-legend-range">Còn xét</span><span class="nv-legend-mid">Đang so sánh</span><span class="nv-legend-out">Đã loại</span></div>';
    const board = container.querySelector<HTMLElement>('.nv-array-board')!;
    const grid = container.querySelector<HTMLElement>('.nv-array')!;
    const band = container.querySelector<HTMLElement>('.nv-interval-band')!;
    const loMarker = container.querySelector<HTMLElement>('.nv-marker-lo')!;
    const hiMarker = container.querySelector<HTMLElement>('.nv-marker-hi')!;
    const midMarker = container.querySelector<HTMLElement>('.nv-marker-mid')!;
    const scroll = container.querySelector<HTMLElement>('.nv-array-scroll')!;
    let key: string | undefined;
    let lastFocus: number | null = null;
    return {
        render(scene: IndexedArrayScene) {
            const [lo, hi] = scene.range;
            const length = scene.values.length;
            const columns = length + 1;
            const nextKey = JSON.stringify(scene.values);
            if (key !== nextKey) {
                key = nextKey;
                lastFocus = null;
                grid.replaceChildren();
                board.style.setProperty('--nv-columns', String(columns));
                grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
                [...scene.values, null].forEach((value, index) => {
                    const cell = document.createElement('div');
                    cell.className = 'nv-cell';
                    if (value === null)
                        cell.classList.add('nv-sentinel');
                    const text = document.createElement('span');
                    text.className = 'nv-cell-value';
                    text.textContent = value === null ? '∅' : String(value);
                    text.title = value === null ? 'Biên sau mảng, không phải phần tử' : String(value);
                    const label = document.createElement('span');
                    label.className = 'nv-cell-index';
                    label.textContent = value === null ? `n=${length}` : String(index);
                    cell.append(text, label);
                    grid.append(cell);
                });
            }
            Array.from(grid.children).forEach((element, index) => {
                const cell = element as HTMLElement;
                cell.dataset.state = scene.result === index ? 'result' : scene.focus === index ? 'mid' : index < lo || index >= hi ? 'out' : 'active';
            });
            const place = (marker: HTMLElement, index: number) => { marker.style.left = `${(index + .5) / columns * 100}%`; };
            place(loMarker, lo);
            place(hiMarker, hi);
            const merged = lo === hi;
            loMarker.textContent = merged ? 'lo = hi' : 'lo';
            loMarker.classList.toggle('nv-marker-result', scene.result !== null);
            hiMarker.classList.toggle('is-hidden', merged);
            midMarker.classList.toggle('is-hidden', scene.focus === null);
            if (scene.focus !== null)
                place(midMarker, scene.focus);
            band.style.width = `${(hi - lo) / columns * 100}%`;
            band.style.left = `${lo / columns * 100}%`;
            container.querySelector('[data-interval]')!.textContent = scene.label;
            container.querySelector('[data-target]')!.textContent = scene.target;
            grid.setAttribute('role', 'img');
            grid.setAttribute('aria-label', `Mảng ${scene.values.join(', ') || 'rỗng'}, lo ${lo}, hi ${hi}, mid ${scene.focus ?? 'chưa chọn'}. Ô n=${length} là biên sau mảng.`);
            const focus = scene.focus ?? scene.result;
            if (focus !== null && focus !== lastFocus) {
                const cell = grid.children[focus] as HTMLElement | undefined;
                if (cell) {
                    const left = cell.offsetLeft;
                    if (left < scroll.scrollLeft || left + cell.offsetWidth > scroll.scrollLeft + scroll.clientWidth) {
                        scroll.scrollTo({ left: Math.max(0, left - (scroll.clientWidth - cell.offsetWidth) / 2), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
                    }
                }
            }
            lastFocus = focus;
        },
    };
}
