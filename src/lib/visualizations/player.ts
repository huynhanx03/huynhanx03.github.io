import type { Scenario, Trace } from './types';
import { createSourceView } from './views/source-code';
import { enhanceSelect } from '../ui/select';
const MAX_FRAMES = 2048;
let instanceCount = 0;
/** One independent clock per embed. No algorithm or renderer-specific branches. */
export function mountScenario<Input, State>(root: HTMLElement, scenario: Scenario<Input, State>): () => void {
    const initialPreset = scenario.presets.find((p) => p.id === root.dataset.preset) ?? scenario.presets[0];
    const prefix = `nv-${++instanceCount}`;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const events = new AbortController();
    root.innerHTML = `
    <section class="nv-shell" aria-label="Minh họa tương tác">
      <header class="nv-header"><div class="nv-title-group"><span class="nv-symbol" aria-hidden="true"><span></span><span></span><span></span></span><div><strong data-title></strong><span data-subtitle></span></div></div><span class="nv-live-badge">THỬ & KHÁM PHÁ</span></header>
      <div class="nv-tabs"><button type="button" data-tab="visual" aria-pressed="true">Minh họa</button><button type="button" data-tab="code" aria-pressed="false">Kèm code mẫu</button><span class="nv-mode-label" data-mode>Thủ công</span></div>
      <div class="nv-workspace" data-workspace><div class="nv-body" data-panel="visual">
        <div class="nv-example-row"><label class="nv-preset"><span>Ví dụ</span><select data-presets aria-label="Ví dụ"></select></label><button type="button" class="nv-text-action" data-edit aria-expanded="false" aria-controls="${prefix}-inputs">Sửa input ↗</button></div>
        <div class="nv-input-editor" id="${prefix}-inputs" hidden><div class="nv-inputs" data-fields></div>
        <div class="nv-actions"><button type="button" class="nv-primary" data-steps>Áp dụng input</button><button type="button" data-apply>Xem kết quả</button></div></div>
        <p class="nv-error" data-error role="alert" hidden></p>
        <p class="nv-dirty" data-dirty hidden>Input đã thay đổi. Bấm Áp dụng input để bắt đầu lại với dữ liệu mới.</p>
        <div class="nv-stage" data-view></div>
        <div class="nv-variables" data-variables></div>
        <div class="nv-explanation"><span class="nv-step-kicker" data-step-label></span><p data-explanation aria-live="polite"></p></div>
        <div class="nv-transport"><div class="nv-scrubber"><input type="range" min="0" value="0" max="1" data-scrub aria-label="Vị trí bước"><span data-count></span></div>
        <div class="nv-controls"><div class="nv-play-group"><button type="button" data-prev aria-label="Bước trước">←</button><button type="button" class="nv-play" data-play aria-pressed="false">▶ Tự chạy</button><button type="button" data-next aria-label="Bước tiếp">→</button></div><div class="nv-options"><button type="button" data-reset aria-label="Về bước đầu" title="Về bước đầu">↺</button><button type="button" data-loop aria-pressed="false" aria-label="Lặp mô phỏng">↻ Lặp</button><label class="nv-speed"><span class="nv-sr-only">Tốc độ</span><select data-speed aria-label="Tốc độ"><option value="1600">0.5×</option><option value="800" selected>1×</option><option value="400">2×</option></select></label></div></div></div>
        <div class="nv-output"><div><span class="nv-output-label">OUTPUT</span><strong data-output></strong></div><p data-summary></p></div>
      </div>
      <div class="nv-body nv-code-panel" data-panel="code" hidden><div class="nv-code-header"><span>CODE MẪU</span><span data-language></span></div><div class="nv-source" data-source></div><p class="nv-code-caption">Dòng sáng tương ứng với bước hiện tại. Go là code tham chiếu; mô phỏng chạy trong trình duyệt.</p></div></div>
      <footer class="nv-footer">Khám phá từng bước theo nhịp của bạn.</footer>
    </section>`;
    const get = <T extends HTMLElement = HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
    get('[data-title]').textContent = scenario.title;
    get('[data-subtitle]').textContent = scenario.subtitle;
    get('.nv-footer').textContent = scenario.limits ?? 'Mảng ≤32 phần tử; tiến/lùi, tua và loop dùng cùng trace.';
    const controls = new Map<string, HTMLInputElement | HTMLTextAreaElement>();
    scenario.fields.forEach((field) => {
        const label = document.createElement('label');
        label.htmlFor = `${prefix}-${field.name}`;
        label.textContent = field.label;
        const input = field.multiline ? document.createElement('textarea') : document.createElement('input');
        input.id = label.htmlFor;
        input.name = field.name;
        input.placeholder = field.placeholder ?? '';
        input.value = initialPreset.values[field.name] ?? '';
        input.spellcheck = false;
        if (input instanceof HTMLTextAreaElement)
            input.rows = 4;
        label.append(input);
        get('[data-fields]').append(label);
        controls.set(field.name, input);
    });
    const select = get<HTMLSelectElement>('[data-presets]');
    scenario.presets.forEach((preset) => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.label;
        select.append(option);
    });
    select.value = initialPreset.id;
    const selectViews = [enhanceSelect(select, { label: 'Ví dụ' }), enhanceSelect(get<HTMLSelectElement>('[data-speed]'), { label: 'Tốc độ', compact: true })];
    let sourceView: ReturnType<typeof createSourceView> | undefined;
    if (scenario.source) {
        get('[data-language]').textContent = scenario.source.language;
        sourceView = createSourceView(get('[data-source]'), scenario.source.language, scenario.source.code);
    }
    else {
        get('[data-tab="code"]').hidden = true;
    }
    const view = scenario.createView(get('[data-view]'));
    let trace: Trace<State> = { frames: [], output: '', summary: '' };
    let position = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let playing = false;
    let loop = false;
    let disposed = false;
    let dirty = false;
    const variables = new Map<string, {
        node: HTMLElement;
        value: HTMLElement;
    }>();
    function listen(element: EventTarget, event: string, handler: () => void) {
        element.addEventListener(event, handler, { signal: events.signal });
    }
    function stop() {
        playing = false;
        if (timer !== null)
            clearTimeout(timer);
        timer = null;
        get('[data-play]').textContent = '▶ Tự chạy';
        get('[data-play]').setAttribute('aria-pressed', 'false');
        get('[data-mode]').textContent = 'Thủ công';
    }
    function render() {
        if (!trace.frames.length)
            return;
        const frame = trace.frames[position];
        const finished = position === trace.frames.length - 1;
        root.dataset.phase = finished ? 'finished' : playing ? 'playing' : 'manual';
        root.style.setProperty('--nv-motion', `${Math.max(140, Math.min(500, Number(get<HTMLSelectElement>('[data-speed]').value) * .45))}ms`);
        get('[data-mode]').textContent = playing ? 'Đang chạy' : finished ? 'Hoàn tất' : 'Thủ công';
        view.render(frame, finished);
        variables.forEach(({ node }, name) => { if (!(name in frame.variables)) {
            node.remove();
            variables.delete(name);
        } });
        Object.entries(frame.variables).forEach(([name, value]) => {
            let entry = variables.get(name);
            if (!entry) {
                const node = document.createElement('span');
                const label = document.createElement('span');
                label.textContent = name;
                const text = document.createElement('strong');
                node.append(label, text);
                get('[data-variables]').append(node);
                entry = { node, value: text };
                variables.set(name, entry);
            }
            if (entry.value.textContent && entry.value.textContent !== String(value) && !reducedMotion.matches) {
                entry.value.getAnimations().forEach((animation) => animation.cancel());
                entry.value.animate([{ transform: 'translateY(-3px)', opacity: .5 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 240, easing: 'ease-out' });
            }
            entry.value.textContent = String(value);
        });
        get('[data-explanation]').setAttribute('aria-live', playing ? 'off' : 'polite');
        get('[data-explanation]').textContent = frame.explanation;
        get('[data-step-label]').textContent = finished ? 'HOÀN TẤT' : `BƯỚC ${position + 1}${frame.label ? ` · ${frame.label}` : ''}`;
        get('[data-count]').textContent = `${position + 1} / ${trace.frames.length}`;
        const scrub = get<HTMLInputElement>('[data-scrub]');
        scrub.max = String(trace.frames.length - 1);
        scrub.value = String(position);
        scrub.style.setProperty('--nv-progress', `${position / Math.max(1, trace.frames.length - 1) * 100}%`);
        get<HTMLButtonElement>('[data-prev]').disabled = position === 0;
        get<HTMLButtonElement>('[data-next]').disabled = finished;
        get('[data-output]').textContent = finished ? trace.output : '—';
        get('[data-summary]').textContent = finished ? trace.summary : 'Kết quả xuất hiện khi mô phỏng hoàn tất.';
        get('[data-output]').classList.toggle('is-finished', finished);
        sourceView?.highlight(frame.codeLines);
    }
    function apply(showResult: boolean) {
        stop();
        try {
            const values = Object.fromEntries(Array.from(controls, ([key, input]) => [key, input.value]));
            const next = scenario.build(scenario.parse(values));
            if (!next.frames.length || next.frames.length > MAX_FRAMES)
                throw new Error('Kịch bản cần từ 1 đến 2.048 bước.');
            trace = next;
            root.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('.nv-transport button, .nv-transport input, .nv-transport select').forEach(el => { el.disabled = false; });
            position = showResult ? trace.frames.length - 1 : 0;
            dirty = false;
            get('[data-dirty]').hidden = true;
            get('[data-error]').hidden = true;
            render();
        }
        catch (error) {
            get('[data-error]').textContent = error instanceof Error ? error.message : 'Không thể tạo mô phỏng.';
            get('[data-error]').hidden = false;
            dirty = true;
            get('[data-dirty]').hidden = false;
            get('[data-summary]').textContent = trace.frames.length ? 'Đang giữ kết quả của input trước; input mới chưa được áp dụng.' : 'Chưa có mô phỏng hợp lệ. Hãy sửa input hoặc chọn ví dụ khác.';
            if (!trace.frames.length)
                root.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('.nv-transport button, .nv-transport input, .nv-transport select').forEach(el => { el.disabled = true; });
        }
    }
    function tick() {
        if (!playing || disposed || !trace.frames.length)
            return;
        const ended = position === trace.frames.length - 1;
        if (ended && !loop) {
            stop();
            render();
            return;
        }
        timer = setTimeout(() => {
            if (!playing || disposed || !trace.frames.length)
                return;
            position = ended ? 0 : position + 1;
            render();
            tick();
        }, ended ? 1400 : Number(get<HTMLSelectElement>('[data-speed]').value));
    }
    function move(index: number) { if (!trace.frames.length)
        return; stop(); position = index; render(); }
    listen(get('[data-apply]'), 'click', () => apply(true));
    listen(get('[data-steps]'), 'click', () => apply(false));
    listen(get('[data-edit]'), 'click', () => {
        const panel = get('[id="' + prefix + '-inputs"]');
        panel.hidden = !panel.hidden;
        get('[data-edit]').setAttribute('aria-expanded', String(!panel.hidden));
        get('[data-edit]').textContent = panel.hidden ? 'Sửa input ↗' : 'Thu gọn ↑';
    });
    controls.forEach((input) => listen(input, 'input', () => { stop(); dirty = true; get('[data-dirty]').hidden = false; }));
    listen(select, 'change', () => {
        const preset = scenario.presets.find((p) => p.id === select.value)!;
        controls.forEach((input, name) => { input.value = preset.values[name] ?? ''; });
        dirty = true;
        apply(false);
    });
    listen(get('[data-prev]'), 'click', () => move(Math.max(0, position - 1)));
    listen(get('[data-next]'), 'click', () => move(Math.min(trace.frames.length - 1, position + 1)));
    listen(get('[data-reset]'), 'click', () => move(0));
    listen(get('[data-scrub]'), 'input', () => move(Number(get<HTMLInputElement>('[data-scrub]').value)));
    listen(get('[data-play]'), 'click', () => {
        if (playing) {
            stop();
            render();
            return;
        }
        if (dirty) {
            apply(false);
            if (dirty)
                return;
        }
        if (position === trace.frames.length - 1)
            position = 0;
        playing = true;
        get('[data-play]').textContent = 'Ⅱ Tạm dừng';
        get('[data-play]').setAttribute('aria-pressed', 'true');
        render();
        tick();
    });
    listen(get('[data-loop]'), 'click', () => {
        loop = !loop;
        get('[data-loop]').setAttribute('aria-pressed', String(loop));
    });
    listen(get('[data-speed]'), 'change', () => { if (playing) {
        if (timer !== null)
            clearTimeout(timer);
        tick();
    } });
    root.querySelectorAll<HTMLElement>('[data-tab]').forEach((button) => listen(button, 'click', () => {
        root.querySelectorAll<HTMLElement>('[data-tab]').forEach((tab) => tab.setAttribute('aria-pressed', String(tab === button)));
        get('[data-panel="code"]').hidden = button.dataset.tab !== 'code';
        get('[data-workspace]').classList.toggle('is-code', button.dataset.tab === 'code');
    }));
    listen(document, 'visibilitychange', () => { if (document.hidden) {
        stop();
        render();
    } });
    root.classList.toggle('nv-reduced-motion', reducedMotion.matches);
    listen(reducedMotion, 'change', () => root.classList.toggle('nv-reduced-motion', reducedMotion.matches));
    apply(false);
    return () => { disposed = true; stop(); events.abort(); selectViews.forEach(selectView => selectView.destroy()); view.destroy?.(); };
}
