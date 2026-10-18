import type { ArrayPanel, Scalar } from '../core/scene';

/** Keep item identity separate from its slot so equal values can move independently. */
export function createArrayView(container: HTMLElement) {
    const heading = document.createElement('p');
    heading.className = 'nv-panel-heading';
    const body = document.createElement('div');
    body.className = 'nv-array-motion';
    const scroll = document.createElement('div');
    scroll.className = 'nv-array-scroll';
    const track = document.createElement('div');
    track.className = 'nv-array-track';
    scroll.append(track);
    const pocket = document.createElement('div');
    pocket.className = 'nv-array-pocket';
    const pocketLabel = document.createElement('span');
    pocketLabel.className = 'nv-stack-label';
    const pocketSlot = document.createElement('div');
    pocketSlot.className = 'nv-array-held-slot';
    pocket.append(pocketLabel, pocketSlot);
    body.append(scroll, pocket);
    container.replaceChildren(heading, body);
    const cells = new Map<string, HTMLElement>();
    const animations = new Map<string, Animation>();
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let initialized = false;
    const cancel = () => {
        animations.forEach(a => a.cancel());
        animations.clear();
        cells.forEach(cell => { cell.style.zIndex = ''; });
    };
    const onMotion = () => { if (motion.matches) cancel(); };
    motion.addEventListener('change', onMotion);

    return {
        render(panel: ArrayPanel) {
            // Read the current visual positions before cancelling an interrupted move.
            const before = new Map([...cells].map(([key, cell]) => [key, cell.getBoundingClientRect()]));
            cancel();
            heading.textContent = panel.heading;
            const values = [...panel.values, ...(panel.held ? [panel.held.value] : [])];
            const width = Math.max(40, Math.min(96, Math.max(0, ...values.map(v => String(v).length)) * 8 + 16));
            body.style.setProperty('--nv-cell-width', `${width}px`);
            pocket.hidden = !panel.held;
            pocketLabel.textContent = panel.held?.label ?? 'Key đang giữ';
            const live = new Set<string>();
            const occurrences = new Map<string, number>();
            const itemKey = (base: string) => {
                const occurrence = occurrences.get(base) ?? 0;
                occurrences.set(base, occurrence + 1);
                return JSON.stringify([base, occurrence]);
            };
            const put = (slot: HTMLElement, base: string, value: Scalar, label: string, active: boolean, done: boolean, held = false) => {
                const key = itemKey(base);
                live.add(key);
                let cell = cells.get(key);
                if (!cell) {
                    cell = document.createElement('div');
                    cell.className = 'nv-scene-cell nv-array-item';
                    cell.append(document.createElement('strong'), document.createElement('small'));
                    cells.set(key, cell);
                }
                cell.dataset.itemKey = base;
                cell.classList.toggle('is-active', active);
                cell.classList.toggle('is-done', done);
                cell.classList.toggle('is-held', held);
                cell.classList.toggle('is-gap', value === '□');
                cell.querySelector('strong')!.textContent = String(value);
                cell.querySelector('small')!.textContent = label;
                slot.append(cell);
            };
            // Slot labels stay still while their items travel between slots.
            track.querySelector('.nv-scene-empty')?.remove();
            const slots = Array.from(track.children) as HTMLElement[];
            panel.values.forEach((value, i) => {
                let slot = slots[i];
                if (!slot || !slot.classList.contains('nv-array-slot')) {
                    slot = document.createElement('div');
                    slot.className = 'nv-array-slot';
                    const index = document.createElement('span');
                    index.className = 'nv-array-index';
                    slot.append(index);
                    track.append(slot);
                }
                slot.querySelector('.nv-array-index')!.textContent = String(i);
                put(slot, panel.keys?.[i] ?? `slot:${i}`, value, panel.labels?.[i] ?? '', panel.active?.includes(i) ?? false, panel.result?.includes(i) ?? false);
            });
            if (panel.held) put(pocketSlot, panel.held.key, panel.held.value, panel.held.itemLabel ?? '', true, false, true);
            cells.forEach((cell, key) => {
                if (!live.has(key)) { cell.remove(); cells.delete(key); }
            });
            Array.from(track.children).slice(panel.values.length).forEach(slot => slot.remove());
            if (!panel.values.length) {
                const empty = document.createElement('span');
                empty.className = 'nv-scene-empty';
                empty.textContent = '∅ Rỗng';
                track.append(empty);
            }
            const duration = Number.parseFloat(getComputedStyle(container).getPropertyValue('--nv-motion')) || 360;
            if (initialized && !motion.matches) cells.forEach((cell, key) => {
                const from = before.get(key);
                const to = cell.getBoundingClientRect();
                if (!from || !from.width || !to.width) return;
                const dx = from.left - to.left, dy = from.top - to.top;
                if (Math.abs(dx) + Math.abs(dy) < 1 || cell.classList.contains('is-gap')) return;
                cell.style.zIndex = '2';
                // Opposing moves use opposite arcs, avoiding overlap during a swap.
                const arc = Math.abs(dy) < 8 ? (dx > 0 ? -14 : 14) : 0;
                const animation = cell.animate([
                    { transform: `translate(${dx}px, ${dy}px)` },
                    { transform: `translate(${dx * .5}px, ${dy * .5 + arc}px)`, offset: .5 },
                    { transform: 'translate(0, 0)' },
                ], { duration, easing: 'cubic-bezier(.4,0,.2,1)' });
                animations.set(key, animation);
                animation.onfinish = () => {
                    if (animations.get(key) !== animation) return;
                    cell.style.zIndex = '';
                    animations.delete(key);
                };
            });
            initialized = true;
        },
        destroy() { cancel(); motion.removeEventListener('change', onMotion); cells.clear(); },
    };
}
