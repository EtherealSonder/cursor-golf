/** FI-5A: SVG structure reader. This is a deliberately restricted SVG reader, not a general XML engine.
 * Rejects declarations/entities and unsupported structural syntax instead of silently misparsing it.
 * Embedded image data and <defs> are ignored as gameplay candidates.
 */
export interface SvgElement {
    readonly tag: string;
    readonly attributes: Readonly<Record<string, string>>;
    readonly children: readonly SvgElement[];
    readonly parent?: SvgElement;
    readonly order: number;
    readonly inDefinitions: boolean;
}
export interface SvgDocument {
    readonly root: SvgElement;
    readonly viewBox: readonly [number, number, number, number];
    readonly elements: readonly SvgElement[];
}
const namePattern = /^[A-Za-z_][\w:.-]*$/;
function decode(value: string): string {
    return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g, (_, entity: string) => {
        switch (entity) {
            case 'amp': return '&'; case 'lt': return '<'; case 'gt': return '>';
            case 'quot': return '"'; case 'apos': return "'";
        }
        const code = entity.startsWith('#x') ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        if (!Number.isFinite(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) throw new Error('Invalid XML character entity');
        return String.fromCodePoint(code);
    });
}
function attributes(source: string): Record<string, string> {
    const result: Record<string, string> = {};
    let index = 0;
    while (index < source.length) {
        while (/\s/.test(source[index] ?? '')) index++;
        if (index === source.length) break;
        const match = /^[A-Za-z_][\w:.-]*/.exec(source.slice(index));
        if (!match) throw new Error(`Invalid SVG attribute near ${source.slice(index, index + 35)}`);
        const key = match[0]; index += key.length;
        while (/\s/.test(source[index] ?? '')) index++;
        if (source[index++] !== '=') throw new Error(`SVG attribute ${key} is missing '='`);
        while (/\s/.test(source[index] ?? '')) index++;
        const quote = source[index++];
        if (quote !== '"' && quote !== "'") throw new Error(`SVG attribute ${key} must be quoted`);
        const end = source.indexOf(quote, index);
        if (end < 0) throw new Error(`Unterminated SVG attribute ${key}`);
        if (Object.prototype.hasOwnProperty.call(result, key)) throw new Error(`Duplicate SVG attribute ${key}`);
        result[key] = decode(source.slice(index, end)); index = end + 1;
    }
    return result;
}
/** Scan tag ends respecting quotes, including embedded base64 image data. */
function tagEnd(source: string, start: number): number {
    let quote = '';
    for (let i = start; i < source.length; i++) {
        const c = source[i];
        if (quote) { if (c === quote) quote = ''; }
        else if (c === '"' || c === "'") quote = c;
        else if (c === '>') return i;
    }
    throw new Error('Unterminated SVG tag');
}
export function parseFigmaSvg(svg: string): SvgDocument {
    if (svg.length > 30_000_000) throw new Error('SVG exceeds 30 MB safety limit');
    const stack: SvgElement[] = [];
    const elements: SvgElement[] = [];
    let root: SvgElement | undefined;
    let cursor = 0;
    while (cursor < svg.length) {
        const start = svg.indexOf('<', cursor);
        if (start < 0) break;
        if (svg.startsWith('<!--', start)) {
            const end = svg.indexOf('-->', start + 4);
            if (end < 0) throw new Error('Unterminated SVG comment');
            cursor = end + 3; continue;
        }
        if (svg.startsWith('<?', start)) {
            const end = svg.indexOf('?>', start + 2);
            if (end < 0) throw new Error('Unterminated XML processing instruction');
            cursor = end + 2; continue;
        }
        if (svg.startsWith('<![CDATA[', start)) {
            const end = svg.indexOf(']]>', start + 9);
            if (end < 0) throw new Error('Unterminated CDATA');
            cursor = end + 3; continue;
        }
        if (svg.startsWith('<!', start)) throw new Error('SVG declarations and external entities are not supported');
        const end = tagEnd(svg, start + 1);
        let body = svg.slice(start + 1, end).trim(); cursor = end + 1;
        if (body.startsWith('/')) {
            const name = body.slice(1).trim();
            if (stack.at(-1)?.tag !== name) throw new Error(`Mismatched SVG closing tag ${name}`);
            stack.pop(); continue;
        }
        const selfClosing = body.endsWith('/');
        if (selfClosing) body = body.slice(0, -1).trimEnd();
        const name = /^[^\s]+/.exec(body)?.[0] ?? '';
        if (!namePattern.test(name)) throw new Error(`Invalid SVG tag ${name}`);
        const parent = stack.at(-1);
        const node: SvgElement = {
            tag: name, attributes: attributes(body.slice(name.length)), children: [],
            ...(parent ? { parent } : {}), order: elements.length,
            inDefinitions: (parent?.inDefinitions ?? false) || name === 'defs' || name === 'symbol' || name === 'pattern' || name === 'clipPath' || name === 'mask',
        };
        if (parent) (parent.children as SvgElement[]).push(node);
        else if (root) throw new Error('Multiple SVG roots');
        else root = node;
        elements.push(node);
        if (!selfClosing) stack.push(node);
    }
    if (stack.length) throw new Error(`Unclosed SVG tag ${stack.at(-1)?.tag}`);
    if (!root || root.tag !== 'svg') throw new Error('Expected SVG root element');
    const rawViewBox = root.attributes.viewBox;
    let box: number[];
    if (rawViewBox) box = rawViewBox.trim().split(/[\s,]+/).map(Number);
    else box = [0, 0, Number(root.attributes.width), Number(root.attributes.height)];
    if (box.length !== 4 || box.some(v => !Number.isFinite(v)) || box[2] <= 0 || box[3] <= 0) {
        throw new Error('SVG requires a valid viewBox or numeric width and height');
    }
    return { root, viewBox: box as unknown as readonly [number, number, number, number], elements };
}
