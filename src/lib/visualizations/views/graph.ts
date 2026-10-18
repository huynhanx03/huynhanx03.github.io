import type { GraphPanel } from '../core/scene';
const NS = 'http://www.w3.org/2000/svg';
let graphCount = 0;
const svgEl = <K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] => { const el = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v))); return el; };
export function renderGraph(container: HTMLElement, panel: GraphPanel) {
    let svg = container.querySelector<SVGSVGElement>('svg');
    if (!svg) {
        container.replaceChildren();
        const heading = document.createElement('p');
        heading.className = 'nv-panel-heading';
        container.append(heading);
        svg = svgEl('svg', { viewBox: '0 0 440 300', role: 'img', class: 'nv-graph' }) as SVGSVGElement;
        container.append(svg);
        svg.dataset.marker = `nv-arrow-${++graphCount}`;
    }
    container.querySelector('p')!.textContent = panel.heading;
    svg.setAttribute('viewBox', `0 0 ${panel.width ?? 440} ${panel.height ?? 300}`);
    svg.style.minWidth = panel.width ? `${panel.width}px` : '';
    svg.style.maxHeight = panel.height ? 'none' : '';
    container.style.overflowX = panel.width ? 'auto' : '';
    container.style.maxHeight = panel.height ? '440px' : '';
    container.style.overflowY = panel.height ? 'auto' : '';
    svg.setAttribute('aria-label', `${panel.heading}: ${panel.nodes.map(n => `${n.id} ${n.label} ${n.detail ?? ''}`).join('; ')}`);
    const positions = new Map(panel.nodes.map((n, i) => [n.id, { x: n.x ?? 220 + Math.cos(i / Math.max(1, panel.nodes.length) * Math.PI * 2 - Math.PI / 2) * 140, y: n.y ?? 150 + Math.sin(i / Math.max(1, panel.nodes.length) * Math.PI * 2 - Math.PI / 2) * 104 }]));
    let defs = svg.querySelector('defs');
    if (!defs) {
        defs = svgEl('defs');
        const marker = svgEl('marker', { id: svg.dataset.marker!, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' });
        marker.append(svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: 'context-stroke' }));
        defs.append(marker);
        svg.append(defs);
    }
    const live = new Set<string>();
    panel.edges.forEach(edge => {
        const from = positions.get(edge.from), to = positions.get(edge.to);
        if (!from || !to)
            return;
        const id = `edge:${edge.id}`;
        live.add(id);
        let group = Array.from(svg!.children).find(e => e.getAttribute('data-id') === id);
        if (!group) {
            group = svgEl('g', { 'data-id': id });
            group.append(svgEl('path'), svgEl('text', { 'text-anchor': 'middle', class: 'nv-edge-label' }));
            svg!.insertBefore(group, svg!.children[1] ?? null);
        }
        group.setAttribute('class', `nv-edge ${edge.state ?? ''}`);
        const peers = panel.edges.filter(e => (e.from === edge.from && e.to === edge.to) || (e.from === edge.to && e.to === edge.from));
        const ix = peers.findIndex(e => e.id === edge.id);
        const curve = (ix - (peers.length - 1) / 2) * 36 * (edge.from < edge.to ? 1 : -1);
        const dx = to.x - from.x, dy = to.y - from.y, len = Math.max(1, Math.hypot(dx, dy));
        const sx = from.x + dx / len * 22, sy = from.y + dy / len * 22, tx = to.x - dx / len * 25, ty = to.y - dy / len * 25;
        const cx = (from.x + to.x) / 2 - dy / len * curve, cy = (from.y + to.y) / 2 + dx / len * curve;
        const path = group.querySelector('path')!;
        path.setAttribute('d', edge.from === edge.to ? `M ${from.x - 14} ${from.y - 14} C ${from.x - 65 - ix * 18} ${from.y - 80 - ix * 25},${from.x + 65 + ix * 18} ${from.y - 80 - ix * 25},${from.x + 14} ${from.y - 14}` : `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`);
        if (edge.directed)
            path.setAttribute('marker-end', `url(#${svg!.dataset.marker})`);
        else
            path.removeAttribute('marker-end');
        const label = group.querySelector('text')!;
        label.textContent = edge.label ?? '';
        label.setAttribute('x', String(edge.from === edge.to ? from.x : (from.x + 2 * cx + to.x) / 4));
        label.setAttribute('y', String(edge.from === edge.to ? from.y - 56 - ix * 18 : (from.y + 2 * cy + to.y) / 4 - 7));
    });
    panel.nodes.forEach(n => { const pos = positions.get(n.id)!; const id = `node:${n.id}`; live.add(id); let group = Array.from(svg!.children).find(e => e.getAttribute('data-id') === id); if (!group) {
        group = svgEl('g', { 'data-id': id });
        group.append(svgEl('circle', { r: 21 }), svgEl('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'nv-node-label' }), svgEl('text', { 'text-anchor': 'middle', y: 38, class: 'nv-node-detail' }));
        svg!.append(group);
    } group.setAttribute('class', `nv-node ${n.state ?? ''}`); group.setAttribute('transform', `translate(${pos.x},${pos.y})`); const labels = group.querySelectorAll('text'); labels[0].textContent = n.label; labels[1].textContent = n.detail ?? ''; });
    Array.from(svg.children).forEach(el => { const id = el.getAttribute('data-id'); if (id && !live.has(id))
        el.remove(); });
}
