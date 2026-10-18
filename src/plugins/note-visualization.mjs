import { visualizationCatalog } from '../lib/visualizations/catalog.mjs';

const escape = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

/** Controlled Markdown embeds; never accept HTML, source code or arbitrary URLs. */
export function noteVisualization() {
  return (tree, file) => {
    function visit(node) {
      if (node.type === 'code' && node.lang === 'note-visualization') {
        let config;
        try { config = JSON.parse(node.value); } catch { file.fail('note-visualization cần cấu hình JSON hợp lệ.', node); }
        if (!config || typeof config !== 'object' || Array.isArray(config) || typeof config.id !== 'string' || !Object.hasOwn(visualizationCatalog, config.id)) file.fail('Scenario không được hỗ trợ.', node);
        const metadata = visualizationCatalog[config.id];
        const preset = config.preset ?? metadata.presets[0].id;
        if (!metadata.presets.some((item) => item.id === preset)) file.fail('Preset không được hỗ trợ.', node);
        if (Object.keys(config).some((key) => !['id', 'preset'].includes(key))) file.fail('Chỉ hỗ trợ id và preset trong cấu hình visualization.', node);
        node.type = 'html';
        node.value = `<note-visualization data-scenario="${escape(config.id)}" data-preset="${escape(preset)}" data-pagefind-ignore><div class="nv-fallback"><strong>${escape(metadata.title)} — minh họa tương tác</strong><p>Bật JavaScript để thay input và xem từng bước. ${escape(metadata.fallback)}</p></div></note-visualization>`;
        delete node.lang;
        delete node.meta;
      }
      if (node.children) node.children.forEach(visit);
    }
    visit(tree);
  };
}
