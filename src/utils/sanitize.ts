export const sanitizeHtml = (html: string): string => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const allowedTags = new Set(['p', 'br', 'b', 'i', 'u', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'blockquote', 'pre', 'code', 'span', 'div', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td']);
    const allowedAttrs = new Set(['href', 'target', 'src', 'alt', 'class', 'style', 'width', 'height']);
    const walk = (node: Node): Node | null => {
        if (node.nodeType === 3) return node.cloneNode(false);
        if (node.nodeType !== 1) return null;
        const el = node as Element;
        const tag = el.tagName.toLowerCase();
        if (!allowedTags.has(tag)) return null;
        const clone = document.createElement(tag);
        for (const attr of Array.from(el.attributes)) {
            if (allowedAttrs.has(attr.name)) clone.setAttribute(attr.name, attr.value);
        }
        for (const child of Array.from(el.childNodes)) {
            const cloned = walk(child);
            if (cloned) clone.appendChild(cloned);
        }
        return clone;
    };
    const result = walk(doc.body);
    return result ? (result as Element).innerHTML : '';
};
