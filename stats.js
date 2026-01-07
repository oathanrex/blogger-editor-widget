/* stats.js */

/**
 * Statistics Module
 * Calculates and displays document statistics
 */

// Words per minute for reading time calculation
const WORDS_PER_MINUTE = 200;

/**
 * Calculate document statistics from text content
 * @param {string} text - Plain text content
 * @returns {Object} Statistics object
 */
export function calculateStats(text) {
    const trimmedText = text.trim();
    
    // Character count (excluding leading/trailing whitespace)
    const charCount = trimmedText.length;
    
    // Word count
    const words = trimmedText.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    
    // Reading time calculation
    const readingTimeMinutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
    
    return {
        words: wordCount,
        characters: charCount,
        readingTime: readingTimeMinutes
    };
}

/**
 * Format reading time for display
 * @param {number} minutes - Reading time in minutes
 * @returns {string} Formatted reading time
 */
export function formatReadingTime(minutes) {
    if (minutes === 0) {
        return '0 min';
    } else if (minutes === 1) {
        return '1 min';
    } else {
        return `${minutes} min`;
    }
}

/**
 * Update the stats display in the UI
 * @param {Object} stats - Statistics object from calculateStats
 */
export function updateStatsDisplay(stats) {
    const wordCountEl = document.getElementById('word-count');
    const charCountEl = document.getElementById('char-count');
    const readingTimeEl = document.getElementById('reading-time');

    if (wordCountEl) {
        wordCountEl.textContent = stats.words.toLocaleString();
    }

    if (charCountEl) {
        charCountEl.textContent = stats.characters.toLocaleString();
    }

    if (readingTimeEl) {
        readingTimeEl.textContent = formatReadingTime(stats.readingTime);
    }
}
