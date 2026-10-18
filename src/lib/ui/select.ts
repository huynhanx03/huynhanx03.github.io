let sequence = 0;
let closeActive: (() => void) | undefined;
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();

/** Enhance a native select; keep its value/change contract and no-JS fallback. */
export function enhanceSelect(select: HTMLSelectElement, options: { label: string; searchPlaceholder?: string; compact?: boolean; showLabel?: boolean } ) {
    const events = new AbortController();
    const wrapper = document.createElement('span');
    wrapper.className = `ui-select${options.compact ? ' is-compact' : ''}`;
    const trigger = document.createElement('button');
    const value = document.createElement('span');
    const chevron = document.createElement('span');
    trigger.type = 'button';
    trigger.className = 'ui-select-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    value.className = 'ui-select-value';
    chevron.className = 'ui-select-chevron';
    chevron.textContent = '⌄';
    chevron.setAttribute('aria-hidden', 'true');
    if (options.showLabel) {
        const label = document.createElement('span');
        label.className = 'ui-select-label';
        label.textContent = options.label;
        trigger.append(label);
    }
    trigger.append(value, chevron);
    select.before(wrapper);
    wrapper.append(select, trigger);
    const wasHidden = select.hidden;
    select.hidden = true;
    const menu = document.createElement('div');
    menu.className = 'ui-select-menu';
    menu.hidden = true;
    // Portal escapes clipped cards and inherits root theme tokens in both themes.
    document.body.append(menu);
    const list = document.createElement('div');
    list.className = 'ui-select-list';
    list.id = `ui-select-${++sequence}`;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', options.label);
    trigger.setAttribute('aria-controls', list.id);
    let search: HTMLInputElement | undefined;
    if (options.searchPlaceholder) {
        search = document.createElement('input');
        search.type = 'search';
        search.className = 'ui-select-search';
        search.placeholder = options.searchPlaceholder;
        search.setAttribute('aria-label', options.searchPlaceholder);
        menu.append(search);
    }
    menu.append(list);
    const empty = document.createElement('p');
    empty.className = 'ui-select-empty';
    empty.textContent = document.documentElement.lang === 'vi' ? 'Không có lựa chọn phù hợp.' : 'No matching options.';
    empty.hidden = true;
    menu.append(empty);
    const buttons = Array.from(select.options).map(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ui-select-option';
        button.setAttribute('role', 'option');
        button.tabIndex = -1;
        button.disabled = option.disabled;
        const label = document.createElement('span');
        label.textContent = option.text;
        const check = document.createElement('span');
        check.className = 'ui-select-check';
        check.textContent = '✓';
        check.setAttribute('aria-hidden', 'true');
        button.append(label, check);
        list.append(button);
        button.addEventListener('click', () => {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            close(true);
        }, { signal: events.signal });
        return { button, option };
    });
    function sync() {
        value.textContent = select.selectedOptions[0]?.text ?? '';
        trigger.setAttribute('aria-label', `${options.label}: ${value.textContent}`);
        trigger.disabled = select.disabled;
        buttons.forEach(({ button, option }) => button.setAttribute('aria-selected', String(option.selected)));
    }
    function position() {
        const rect = trigger.getBoundingClientRect();
        const margin = 10;
        const width = Math.min(rect.width, window.innerWidth - margin * 2);
        menu.style.width = `${width}px`;
        menu.style.left = `${Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin))}px`;
        const below = window.innerHeight - rect.bottom - margin;
        const above = rect.top - margin;
        const up = below < Math.min(menu.scrollHeight, 220) && above > below;
        menu.style.maxHeight = `${Math.max(60, (up ? above : below) - 8)}px`;
        menu.style.top = `${up ? Math.max(margin, rect.top - menu.offsetHeight - 8) : rect.bottom + 8}px`;
        menu.dataset.side = up ? 'up' : 'down';
    }
    function close(focus = false) {
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        if (closeActive === close) closeActive = undefined;
        if (focus) trigger.focus();
    }
    const visible = () => buttons.filter(x => !x.button.hidden && !x.button.disabled);
    function open(last = false) {
        if (trigger.disabled) return;
        closeActive?.();
        closeActive = close;
        empty.hidden = true;
        if (search) search.value = '';
        buttons.forEach(({ button }) => { button.hidden = false; });
        menu.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        position();
        const choices = visible();
        (search ?? choices.find(x => x.option.selected)?.button ?? choices[last ? choices.length - 1 : 0]?.button)?.focus();
    }
    let typed = '', typedAt = 0;
    const keydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
        if (event.key === 'Tab') { close(true); return; }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            if (menu.hidden) { open(event.key === 'ArrowUp'); return; }
            const choices = visible();
            const current = choices.findIndex(x => x.button === document.activeElement);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : current < 0 ? (event.key === 'ArrowDown' ? 0 : choices.length - 1) : (current + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length;
            choices[next]?.button.focus();
        } else if (event.target !== search && event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') {
            if (Date.now() - typedAt > 700) typed = '';
            typedAt = Date.now(); typed += normalize(event.key);
            if (menu.hidden) open();
            visible().find(x => normalize(x.option.text).startsWith(typed))?.button.focus();
        }
    };
    trigger.addEventListener('click', () => menu.hidden ? open() : close(), { signal: events.signal });
    trigger.addEventListener('keydown', keydown, { signal: events.signal });
    menu.addEventListener('keydown', keydown, { signal: events.signal });
    select.addEventListener('change', sync, { signal: events.signal });
    search?.addEventListener('input', () => {
        buttons.forEach(({ button, option }) => { button.hidden = !normalize(option.text).includes(normalize(search!.value)); });
        empty.hidden = visible().length > 0;
        position();
    }, { signal: events.signal });
    document.addEventListener('pointerdown', event => {
        if (!wrapper.contains(event.target as Node) && !menu.contains(event.target as Node)) close();
    }, { signal: events.signal });
    document.addEventListener('focusin', event => {
        if (!wrapper.contains(event.target as Node) && !menu.contains(event.target as Node)) close();
    }, { signal: events.signal });
    window.addEventListener('resize', () => { if (!menu.hidden) position(); }, { signal: events.signal });
    document.addEventListener('scroll', () => { if (!menu.hidden) position(); }, { capture: true, signal: events.signal });
    sync();
    return { sync, close, destroy() { close(); events.abort(); menu.remove(); wrapper.before(select); select.hidden = wasHidden; wrapper.remove(); } };
}
