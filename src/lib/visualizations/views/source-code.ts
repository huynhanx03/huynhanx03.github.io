const goKeywords = new Set(['package', 'import', 'func', 'return', 'for', 'if', 'else', 'var', 'const', 'type', 'struct', 'range', 'switch', 'case', 'break', 'continue', 'defer', 'go', 'select', 'chan', 'map', 'interface']);
const goTypes = new Set(['int', 'int64', 'int32', 'uint', 'string', 'bool', 'float64', 'byte', 'rune', 'error']);
/** Small Go reference-code colorizer; unknown languages remain plain text. */
export function createSourceView(container: HTMLElement, language: string, source: string) {
    const rows = new Map<number, HTMLElement>();
    let blockComment = false;
    let rawString = false;
    source.trimEnd().split('\n').forEach((line, index) => {
        const row = document.createElement('div');
        row.className = 'nv-code-line';
        const number = document.createElement('span');
        number.className = 'nv-line-number';
        number.textContent = String(index + 1);
        const content = document.createElement('code');
        const tokens = language.toLowerCase() === 'go'
            ? line.match(/\/\/.*|\/\*|\*\/|`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b|:=|<=|>=|==|!=|[^\w\s]|\s+/g) ?? []
            : [line];
        tokens.forEach((token, i) => {
            let kind = '';
            if (language.toLowerCase() === 'go') {
                if (rawString) {
                    kind = 'string';
                    if (token === '`')
                        rawString = false;
                }
                else if (blockComment) {
                    kind = 'comment';
                    if (token === '*/')
                        blockComment = false;
                }
                else if (token === '/*') {
                    kind = 'comment';
                    blockComment = true;
                }
                else if (token.startsWith('//'))
                    kind = 'comment';
                else if (token === '`') {
                    kind = 'string';
                    rawString = true;
                }
                else if (/^["']/.test(token))
                    kind = 'string';
                else if (goKeywords.has(token))
                    kind = 'keyword';
                else if (goTypes.has(token))
                    kind = 'type';
                else if (/^\d/.test(token))
                    kind = 'number';
                else if (/^[A-Za-z_]\w*$/.test(token) && tokens.slice(i + 1).find((part) => part.trim()) === '(')
                    kind = 'function';
                else if (/^(?:[:<>=!+*/-]+)$/.test(token))
                    kind = 'operator';
            }
            if (!kind)
                content.append(document.createTextNode(token));
            else {
                const span = document.createElement('span');
                span.className = `nv-syntax-${kind}`;
                span.textContent = token;
                content.append(span);
            }
        });
        if (!line)
            content.textContent = ' ';
        row.append(number, content);
        container.append(row);
        rows.set(index + 1, row);
    });
    let highlighted = new Set<number>();
    return {
        highlight(lines: number[] = []) {
            const next = new Set(lines);
            highlighted.forEach((line) => { if (!next.has(line))
                rows.get(line)?.classList.remove('is-current'); });
            next.forEach((line) => rows.get(line)?.classList.add('is-current'));
            highlighted = next;
        },
    };
}
