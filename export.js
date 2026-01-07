/* export.js */

/**
 * Export Module
 * Handles conversion of Tiptap JSON to clean HTML
 */

// Allowed HTML tags for export
const ALLOWED_TAGS = ['p', 'h2', 'h3', 'ul', 'li', 'strong', 'em', 'a', 'code', 'blockquote'];

/**
 * Convert Tiptap JSON to clean HTML
 * @param {Object} json - Tiptap JSON content
 * @returns {string} Clean HTML string
 */
export function generateCleanHTML(json) {
    if (!json || !json.content) {
        return '';
    }

    return processNodes(json.content);
}

/**
 * Process an array of nodes
 * @param {Array} nodes - Array of Tiptap nodes
 * @returns {string} HTML string
 */
function processNodes(nodes) {
    if (!nodes || !Array.isArray(nodes)) {
        return '';
    }

    return nodes.map(node => processNode(node)).join('\n');
}

/**
 * Process a single node
 * @param {Object} node - Tiptap node
 * @returns {string} HTML string
 */
function processNode(node) {
    if (!node) return '';

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
            // For unknown node types, try to process content
            if (node.content) {
                return processNodes(node.content);
            }
            return '';
    }
}

/**
 * Process paragraph node
 */
function processParagraph(node) {
    const content = processInlineContent(node.content);
    
    // Skip empty paragraphs
    if (!content.trim()) {
        return '';
    }
    
    return `<p>${content}</p>`;
}

/**
 * Process heading node
 */
function processHeading(node) {
    const level = node.attrs?.level || 2;
    const tag = level === 3 ? 'h3' : 'h2';
    const content = processInlineContent(node.content);
    
    if (!content.trim()) {
        return '';
    }
    
    return `<${tag}>${content}</${tag}>`;
}

/**
 * Process bullet list node
 */
function processBulletList(node) {
    if (!node.content || node.content.length === 0) {
        return '';
    }
    
    const items = node.content.map(item => processNode(item)).filter(Boolean);
    
    if (items.length === 0) {
        return '';
    }
    
    return `<ul>\n${items.join('\n')}\n</ul>`;
}

/**
 * Process list item node
 */
function processListItem(node) {
    if (!node.content) {
        return '';
    }
    
    // List items can contain paragraphs or other content
    const content = node.content.map(child => {
        if (child.type === 'paragraph') {
            return processInlineContent(child.content);
        }
        return processNode(child);
    }).join('');
    
    if (!content.trim()) {
        return '';
    }
    
    return `<li>${content}</li>`;
}

/**
 * Process blockquote node
 */
function processBlockquote(node) {
    if (!node.content) {
        return '';
    }
    
    const content = node.content.map(child => {
        if (child.type === 'paragraph') {
            return processInlineContent(child.content);
        }
        return processNode(child);
    }).filter(Boolean).join('\n');
    
    if (!content.trim()) {
        return '';
    }
    
    return `<blockquote>${content}</blockquote>`;
}

/**
 * Process inline content (text nodes with marks)
 */
function processInlineContent(content) {
    if (!content || !Array.isArray(content)) {
        return '';
    }
    
    return content.map(node => processText(node)).join('');
}

/**
 * Process text node with marks
 */
function processText(node) {
    if (!node || node.type !== 'text') {
        return '';
    }
    
    let text = escapeHTML(node.text || '');
    
    if (!node.marks || node.marks.length === 0) {
        return text;
    }
    
    // Apply marks in order
    node.marks.forEach(mark => {
        switch (mark.type) {
            case 'bold':
                text = `<strong>${text}</strong>`;
                break;
            case 'italic':
                text = `<em>${text}</em>`;
                break;
            case 'code':
                text = `<code>${text}</code>`;
                break;
            case 'link':
                const href = escapeAttribute(mark.attrs?.href || '#');
                text = `<a href="${href}">${text}</a>`;
                break;
        }
    });
    
    return text;
}

/**
 * Escape HTML special characters
 */
function escapeHTML(str) {
    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    };
    
    return str.replace(/[&<>]/g, char => escapeMap[char]);
}

/**
 * Escape attribute value
 */
function escapeAttribute(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Format HTML for display in preview
 */
export function formatHTMLForDisplay(html) {
    if (!html.trim()) {
        return 'No content to preview';
    }
    
    // Add line breaks and indentation for readability
    let formatted = html;
    
    // Add newlines after closing tags
    formatted = formatted.replace(/(<\/(?:p|h2|h3|ul|li|blockquote)>)/g, '$1\n');
    
    // Remove extra blank lines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    return formatted.trim();
}

/**
 * Validate that HTML only contains allowed tags
 */
export function validateHTML(html) {
    // Create a temporary element to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Check all elements
    const elements = temp.querySelectorAll('*');
    
    for (const el of elements) {
        if (!ALLOWED_TAGS.includes(el.tagName.toLowerCase())) {
            return false;
        }
    }
    
    return true;
}
