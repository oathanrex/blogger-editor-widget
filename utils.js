/* utils.js */

/**
 * Utility Functions
 * @author Oathan Rex
 */

// Pre-compiled regex patterns
const REGEX = {
    whitespace: /\s+/g,
    htmlEntities: /[&<>"']/g,
    closingTags: /(<\/(?:p|h2|h3|ul|li|blockquote)>)/g,
    multiNewlines: /\n{3,}/g,
    cjk: /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g,
    zeroWidth: /[\u200B-\u200D\uFEFF]/g
};

const HTML_ENTITY_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

/**
 * Debounce function with flush and cancel
 */
export function debounce(func, wait) {
    let timeoutId = null;
    let lastArgs = null;
    let lastThis = null;

    function debounced(...args) {
        lastArgs = args;
        lastThis = this;

        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            timeoutId = null;
            func.apply(lastThis, lastArgs);
            lastArgs = null;
            lastThis = null;
        }, wait);
    }

    debounced.flush = function() {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
            if (lastArgs !== null) {
                func.apply(lastThis, lastArgs);
                lastArgs = null;
                lastThis = null;
            }
        }
    };

    debounced.cancel = function() {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
            lastArgs = null;
            lastThis = null;
        }
    };

    return debounced;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
    if (typeof text !== 'string' || !text) {
        return false;
    }

    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn('Clipboard API failed:', err);
        }
    }

    return copyFallback(text);
}

function copyFallback(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;opacity:0;z-index:-1';
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');
    
    document.body.appendChild(textarea);

    try {
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        return document.execCommand('copy');
    } catch (err) {
        console.error('Copy fallback failed:', err);
        return false;
    } finally {
        document.body.removeChild(textarea);
    }
}

/**
 * Escape HTML entities
 */
export function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(REGEX.htmlEntities, char => HTML_ENTITY_MAP[char]);
}

/**
 * Escape HTML attribute value
 */
export function escapeAttribute(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Validate URL - prevents XSS via javascript: protocol
 */
export function validateURL(url) {
    if (!url || typeof url !== 'string') {
        return { valid: false, url: '', error: 'URL is required' };
    }

    const trimmed = url.trim();

    // Block dangerous protocols
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
        return { valid: false, url: '', error: 'Invalid URL protocol' };
    }

    try {
        const parsed = new URL(trimmed);
        
        if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
            return { valid: false, url: '', error: 'Only HTTP, HTTPS, and mailto links are allowed' };
        }

        return { valid: true, url: parsed.href };
    } catch {
        // Try adding https://
        if (!trimmed.includes('://') && !trimmed.startsWith('mailto:')) {
            try {
                const withProtocol = 'https://' + trimmed;
                const parsed = new URL(withProtocol);
                return { valid: true, url: parsed.href };
            } catch {
                return { valid: false, url: '', error: 'Invalid URL format' };
            }
        }
        return { valid: false, url: '', error: 'Invalid URL format' };
    }
}

/**
 * Normalize text (remove zero-width characters)
 */
export function normalizeText(text) {
    if (typeof text !== 'string') return '';
    return text.replace(REGEX.zeroWidth, '');
}

/**
 * Check for CJK characters
 */
export function containsCJK(text) {
    if (typeof text !== 'string') return false;
    return REGEX.cjk.test(text);
}

/**
 * Count CJK characters
 */
export function countCJK(text) {
    if (typeof text !== 'string') return 0;
    const matches = text.match(REGEX.cjk);
    return matches ? matches.length : 0;
}

/**
 * Format number with locale separators
 */
export function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString();
}

/**
 * Create timeout promise
 */
export function timeout(ms, message = 'Timeout') {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error(message)), ms);
    });
}

/**
 * Retry async operation with backoff
 */
export async function retry(operation, options = {}) {
    const { attempts = 3, delay = 1000, backoff = 1.5, onRetry = null } = options;

    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (attempt < attempts) {
                const wait = delay * Math.pow(backoff, attempt - 1);
                if (onRetry) {
                    onRetry(attempt, wait, error);
                }
                await new Promise(resolve => setTimeout(resolve, wait));
            }
        }
    }

    throw lastError;
}

/**
 * Show status message
 */
export function showStatus(element, message, type = 'success', duration = 3000) {
    if (!element) return;

    element.classList.remove('success', 'error');
    element.textContent = message;
    element.classList.add(type);

    if (duration > 0) {
        setTimeout(() => {
            element.textContent = '';
            element.classList.remove(type);
        }, duration);
    }
}

/**
 * Announce to screen readers
 */
export function announce(message) {
    const announcer = document.getElementById('announcer');
    if (announcer && message) {
        announcer.textContent = '';
        setTimeout(() => {
            announcer.textContent = message;
        }, 50);
    }
}
