import type { LessonScene, Panel } from '../core/scene';
import type { Frame } from '../types';
import { renderGraph } from './graph';
import { createArrayView } from './array';
const text = (tag: string, value: string | number, className = '') => { const el = document.createElement(tag); el.textContent = String(value); el.className = className; return el; };
/** All panels render text, never user HTML. Graph nodes keep stable IDs and positions. */
export function createLessonSceneView(container: HTMLElement) {
    const panels = new Map<string, HTMLElement>();
    const arrays = new Map<string, ReturnType<typeof createArrayView>>();
    return { render(frame: Frame<LessonScene>) {
            const live = new Set(frame.state.panels.map(p => p.id));
            panels.forEach((el, id) => { if (!live.has(id)) {
                arrays.get(id)?.destroy();
                arrays.delete(id);
                el.remove();
                panels.delete(id);
            } });
            frame.state.panels.forEach((panel: Panel) => {
                let el = panels.get(panel.id);
                if (!el) {
                    el = document.createElement('section');
                    el.className = 'nv-scene-panel';
                    container.append(el);
                    panels.set(panel.id, el);
                }
                if (panel.kind === 'array') {
                    let view = arrays.get(panel.id);
                    if (!view) { view = createArrayView(el); arrays.set(panel.id, view); }
                    view.render(panel);
                    return;
                }
                arrays.get(panel.id)?.destroy();
                arrays.delete(panel.id);
                if (panel.kind === 'graph') {
                    renderGraph(el, panel);
                    return;
                }
                el.replaceChildren(text('p', panel.heading, 'nv-panel-heading'));
                const body = document.createElement('div');
                body.className = `nv-panel-${panel.kind}`;
                el.append(body);
                if (panel.kind === 'string') {
                    const values = panel.text;
                    body.classList.add('nv-scene-cells');
                    if (panel.kind === 'string')
                        body.style.setProperty('--nv-text-columns', String(Math.max(1, values.length, (panel.offset ?? 0) + (panel.pattern?.length ?? 0))));
                    values.forEach((v, i) => { const cell = document.createElement('div'); cell.className = 'nv-scene-cell'; cell.classList.toggle('is-active', panel.active?.includes(i) ?? false); cell.classList.toggle('is-done', panel.matches?.includes(i) ?? false); cell.append(text('strong', v), text('small', i)); body.append(cell); });
                    if (!values.length)
                        body.append(text('span', '∅ Rỗng', 'nv-scene-empty'));
                    if (panel.kind === 'string' && panel.pattern) {
                        const p = document.createElement('div');
                        p.className = 'nv-pattern-row';
                        p.style.setProperty('--offset', String(panel.offset ?? 0));
                        panel.pattern.forEach(v => p.append(text('span', v)));
                        body.append(p);
                    }
                }
                else if (panel.kind === 'table') {
                    const wrap = document.createElement('div');
                    wrap.className = 'nv-table-scroll';
                    const t = document.createElement('table');
                    const head = document.createElement('thead');
                    const tr = document.createElement('tr');
                    panel.columns.forEach(c => tr.append(text('th', c)));
                    head.append(tr);
                    t.append(head);
                    const tb = document.createElement('tbody');
                    panel.rows.forEach((row, i) => { const rr = document.createElement('tr'); row.forEach((v, j) => { const cell = text('td', v); if (panel.active?.some(([a, b]) => a === i && b === j))
                        cell.className = 'is-active'; rr.append(cell); }); tb.append(rr); });
                    t.append(tb);
                    wrap.append(t);
                    body.append(wrap);
                }
                else if (panel.kind === 'stack') {
                    body.append(text('span', panel.mode === 'queue' ? 'front →' : 'top ↓', 'nv-stack-label'));
                    const values = panel.mode === 'stack' ? [...panel.values].reverse() : panel.values;
                    values.forEach(v => body.append(text('span', v, 'nv-stack-entry')));
                    if (!values.length)
                        body.append(text('span', '∅ Rỗng', 'nv-scene-empty'));
                }
                else if (panel.kind === 'intervals') {
                    const extent = Math.max(1, ...panel.intervals.map(x => x.end));
                    panel.intervals.forEach(iv => { const row = document.createElement('div'); row.className = 'nv-interval-row'; row.append(text('span', iv.label)); const track = document.createElement('div'); const bar = document.createElement('span'); bar.className = `nv-interval-item ${iv.state ?? ''}`; bar.style.left = `${iv.start / extent * 100}%`; bar.style.width = `${(iv.end - iv.start) / extent * 100}%`; bar.textContent = `${iv.start}–${iv.end}`; track.append(bar); row.append(track); body.append(row); });
                }
                else if (panel.kind === 'board') {
                    body.style.gridTemplateColumns = `repeat(${panel.size},1fr)`;
                    for (let i = 0; i < panel.size; i++)
                        for (let j = 0; j < panel.size; j++) {
                            const cell = text('span', panel.pieces.some(([r, c]) => r === i && c === j) ? '♛' : '');
                            cell.className = (i + j) % 2 ? 'nv-board-dark' : 'nv-board-light';
                            if (panel.active?.some(([r, c]) => r === i && c === j))
                                cell.classList.add('is-active');
                            cell.setAttribute('aria-label', `Hàng ${i}, cột ${j}${cell.textContent ? ' có quân hậu' : ''}`);
                            body.append(cell);
                        }
                }
            });
        }, destroy() { arrays.forEach(view => view.destroy()); arrays.clear(); panels.clear(); } };
}
