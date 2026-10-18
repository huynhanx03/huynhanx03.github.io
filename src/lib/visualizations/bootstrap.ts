import { mountScenario } from './player';
import { visualizationCatalog } from './catalog.mjs';
const familyLoaders = {
    'graph-advanced': () => import('./scenarios/graph-advanced'),
    'tree-queries': () => import('./scenarios/tree-queries'),
    structures: () => import('./scenarios/structures'),
    'number-theory': () => import('./scenarios/number-theory'),
    combinatorics: () => import('./scenarios/combinatorics'),
    games: () => import('./scenarios/games'),
    'suffix-automata': () => import('./scenarios/suffix-automata'),
    'string-matching': () => import('./scenarios/string-matching'),
    compression: () => import('./scenarios/compression'),
    'graph-paths': () => import('./scenarios/graph-paths'),
    'search-dp': () => import('./scenarios/search-dp'),
    foundations: () => import('./scenarios/foundations'),
    sorting: () => import('./scenarios/sorting'),
};
/** Custom-element lifecycle handles navigation and independently repeated embeds. */
class NoteVisualization extends HTMLElement {
    private cleanup?: () => void;
    private generation = 0;
    async connectedCallback() {
        const generation = ++this.generation;
        const id = this.dataset.scenario ?? '';
        if (!visualizationCatalog[id])
            return;
        const fallback = this.innerHTML;
        try {
            if (id === 'binary-search') {
                const { binarySearch } = await import('./scenarios/binary-search');
                if (!this.isConnected || generation !== this.generation)
                    return;
                this.cleanup = mountScenario(this, binarySearch);
            }
            else {
                const family = visualizationCatalog[id].family as keyof typeof familyLoaders;
                const loader = familyLoaders[family];
                if (!loader)
                    throw new Error('Family chưa đăng ký.');
                const module = await loader();
                if (!this.isConnected || generation !== this.generation)
                    return;
                this.cleanup = module.mountScenarioById(id, this);
            }
        }
        catch {
            if (!this.isConnected || generation !== this.generation)
                return;
            this.innerHTML = fallback;
            const message = document.createElement('p');
            message.textContent = 'Không tải được minh họa. Hãy tải lại trang; phần giải thích của bài vẫn đọc được.';
            this.append(message);
        }
    }
    disconnectedCallback() { this.generation++; this.cleanup?.(); this.cleanup = undefined; }
}
if (!customElements.get('note-visualization'))
    customElements.define('note-visualization', NoteVisualization);
