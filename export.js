/* export.js */

/**
 * HTML Export Module
 * @author Oathan Rex
 */

import { escapeHTML, escapeAttribute, validateURL } from './utils.js';

/**
 * Generate clean HTML from Tiptap JSON
 */
export function generateCleanHTML(json) {
    if (!json || !json.content || !Array.isArray(json.content)) {
        return '';
    }

    const parts = [];
    for (const node of json.content) {
        const html = processNode(node);
        if (html) {
            parts.push(html);
        }
    }
    return parts.join('\n');
}

function processNode(node) {
    if (!node || !node.type) return '';

    switch (node.type) {
        case 'paragraph':
            return processParagraph(node);
        case 'heading':
            return processHeading(node);
        case 'bulletList':
            return processBulletList(node);
        case 'listItem':
            return processListItem(node);
        case 'blockquote':
            return processBlockquote(node);
        case 'text':
            return processText(node);
        default:
            if (node.content && Array.isArray(node.content)) {
                return node.content.map(processNode).filter(Boolean).join('');
            }
            return '';
    }
}

function processParagraph(node) {
    const content = processInline(node.content);
    if (!content || !content.trim()) return '';
    return '<p>' + content + '</p>';
}

function processHeading(node) {
    const level = (node.attrs && typeof node.attrs.level === 'number') ? node.attrs.level : 2;
    const tag = level === 3 ? 'h3' : 'h2';
    const content = processInline(node.content);
    if (!content || !content.trim()) return '';
    return '<' + tag + '>' + content + '</' + tag + '>';
}

function processBulletList(node) {
    if (!node.content || !Array.isArray(node.content) || node.content.length === 0) {
        return '';
    }
    const items = node.content.map(processNode).filter(Boolean);
    if (items.length === 0) return '';
    return '<ul>\n' + items.join('\n') + '\n</ul>';
}

function processListItem(node) {
    if (!node.content || !Array.isArray(node.content)) return '';

    const parts = [];
    for (const child of node.content) {
        if (child.type === 'paragraph') {
            const text = processInline(child.content);
            if (text) parts.push(text);
        } else if (child.type === 'bulletList') {
            const nested = processBulletList(child);
            if (nested) parts.push(nested);
        } else {
            const processed = processNode(child);
            if (processed) parts.push(processed);
        }
    }

    if (parts.length === 0) return '';
    return '<li>' + parts.join('') + '</li>';
}

function processBlockquote(node) {
    if (!node.content || !Array.isArray(node.content)) return '';

    const parts = [];
    for (const child of node.content) {
        if (child.type === 'paragraph') {
            const text = processInline(child.content);
            if (text) parts.push(text);
        } else {
            const processed = processNode(child);
            if (processed) parts.push(processed);
        }
    }

    if (parts.length === 0) return '';
    return '<blockquote>' + parts.join('<br>') + '</blockquote>';
}

function processInline(content) {
    if (!content || !Array.isArray(content)) return '';
    return content.map(processText).join('');
}

function processText(node) {
    if (!node || node.type !== 'text' || typeof node.text !== 'string') {
        return '';
    }

    let text = escapeHTML(node.text);

    if (!node.marks || !Array.isArray(node.marks) || node.marks.length === 0) {
        return text;
    }

    // Sort marks for consistent output
    const sorted = [...node.marks].sort((a, b) => {
        const order = ['link', 'bold', 'italic', 'code'];
        return order.indexOf(a.type) - order.indexOf(b.type);
    });

    const open = [];
    const close = [];

    for (const mark of sorted) {
        switch (mark.type) {
            case 'bold':
                open.push('<strong>');
                close.unshift('</strong>');
                break;
            case 'italic':
                open.push('<em>');
                close.unshift('</em>');
                break;
            case 'code':
                open.push('<code>');
                close.unshift('</code>');
                break;
            case 'link': {
                const href = (mark.attrs && mark.attrs.href) ? mark.attrs.href : '';
                const validation = validateURL(href);
                if (validation.valid) {
                    open.push('<a href="' + escapeAttribute(validation.url) + '">');
                    close.unshift('</a>');
                }
                break;
            }
        }
    }

    return open.join('') + text + close.join('');
}

/**
 * Format HTML for preview display
 */
export function formatHTMLForDisplay(html) {
    if (!html || typeof html !== 'string' || !html.trim()) {
        return '';
    }

    let formatted = html
        .replace(/(<\/(?:p|h2|h3|ul|li|blockquote)>)/g, '$1\n')
        .replace(/(<ul>)/g, '$1\n')
        .replace(/(<li>)/g, '  $1')
        .replace(/\n{3,}/g, '\n\n');

    return formatted.trim();
}

/**
 * HTML Preview Controller
 */
export class HTMLPreviewController {
    constructor() {
        this.element = null;
        this.lastHTML = null;
    }

    initialize(elementId) {
        this.element = document.getElementById(elementId);
        return this.element !== null;
    }

    update(html) {
        if (!this.element) return;
        if (this.lastHTML === html) return;

        this.lastHTML = html;
        this.element.textContent = formatHTMLForDisplay(html) || '';
    }

    destroy() {
        this.element = null;
        this.lastHTML = null;
    }
}
