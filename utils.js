/* utils.js */

/**
 * Utility Functions Module
 * Common helper functions used across the application
 */

/**
 * Create a debounced version of a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeoutId = null;
    
    return function debounced(...args) {
        const context = this;
        
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
            func.apply(context, args);
            timeoutId = null;
        }, wait);
    };
}

/**
 * Create a throttled version of a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle = false;
    
    return function throttled(...args) {
        const context = this;
        
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
    // Try modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.warn('Clipboard API failed, trying fallback:', error);
        }
    }
    
    // Fallback for older browsers or non-secure contexts
    return copyToClipboardFallback(text);
}

/**
 * Fallback clipboard copy using execCommand
 * @param {string} text - Text to copy
 * @returns {boolean} Success status
 */
function copyToClipboardFallback(text) {
    const textArea = document.createElement('textarea');
    
    // Style to hide the textarea
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    let success = false;
    
    try {
        success = document.execCommand('copy');
    } catch (error) {
        console.error('Fallback copy failed:', error);
    }
    
    document.body.removeChild(textArea);
    return success;
}

/**
 * Show status message with auto-clear
 * @param {HTMLElement} element - Status element
 * @param {string} message - Message to display
 * @param {string} type - Message type ('success' or 'error')
 * @param {number} duration - Duration in milliseconds
 */
export function showStatus(element, message, type = 'success', duration = 3000) {
    if (!element) return;
    
    // Clear existing classes
    element.classList.remove('success', 'error');
    
    // Set message and type
    element.textContent = message;
    element.classList.add(type);
    
    // Clear after duration
    setTimeout(() => {
        element.textContent = '';
        element.classList.remove(type);
    }, duration);
}

/**
 * Generate a unique ID
 * @param {string} prefix - Optional prefix
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'id') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Check if the current environment supports a feature
 * @param {string} feature - Feature to check
 * @returns {boolean} Support status
 */
export function supportsFeature(feature) {
    switch (feature) {
        case 'clipboard':
            return !!(navigator.clipboard && window.isSecureContext);
        case 'modules':
            return 'noModule' in HTMLScriptElement.prototype;
        case 'customElements':
            return 'customElements' in window;
        default:
            return false;
    }
}

/**
 * Sanitize a string for safe HTML insertion
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(str) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return str.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Parse URL and validate it
 * @param {string} url - URL to parse
 * @returns {Object|null} Parsed URL object or null if invalid
 */
export function parseURL(url) {
    try {
        const parsed = new URL(url);
        
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return null;
        }
        
        return parsed;
    } catch (error) {
        return null;
    }
}

/**
 * Format number with locale-specific separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
    return num.toLocaleString();
}

/**
 * Check if value is empty (null, undefined, or empty string)
 * @param {*} value - Value to check
 * @returns {boolean} Is empty
 */
export function isEmpty(value) {
    return value === null || value === undefined || value === '';
}

/**
 * Clamp a number between min and max values
 * @param {number} num - Number to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped number
 */
export function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}
