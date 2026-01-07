/* stats.js */

/**
 * Statistics Module
 * @author Oathan Rex
 */

import { normalizeText, containsCJK, countCJK, formatNumber } from './utils.js';

const WORDS_PER_MINUTE = 200;
const WORD_SPLIT = /\s+/;

/**
 * Calculate document statistics
 */
export function calculateStats(text) {
    if (!text || typeof text !== 'string') {
        return { words: 0, characters: 0, readingTimeMinutes: 0 };
    }

    const normalized = normalizeText(text);
    const trimmed = normalized.trim();

    if (!trimmed) {
        return { words: 0, characters: 0, readingTimeMinutes: 0 };
    }

    const characters = trimmed.replace(/\s/g, '').length;
    const words = calculateWordCount(trimmed);
    const readingTimeMinutes = Math.ceil(words / WORDS_PER_MINUTE);

    return { words, characters, readingTimeMinutes };
}

function calculateWordCount(text) {
    if (!text) return 0;

    if (containsCJK(text)) {
        const cjkCount = countCJK(text);
        const westernText = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g, ' ');
        const westernWords = westernText.split(WORD_SPLIT).filter(w => w.length > 0);
        return cjkCount + westernWords.length;
    }

    return text.split(WORD_SPLIT).filter(w => w.length > 0).length;
}

/**
 * Format reading time
 */
export function formatReadingTime(minutes) {
    if (minutes <= 0) return '0 min';
    if (minutes === 1) return '1 min';
    return minutes + ' min';
}

/**
 * Stats Display Controller
 */
export class StatsDisplay {
    constructor() {
        this.wordEl = null;
        this.charEl = null;
        this.timeEl = null;
        this.lastStats = null;
    }

    initialize() {
        this.wordEl = document.getElementById('word-count');
        this.charEl = document.getElementById('char-count');
        this.timeEl = document.getElementById('reading-time');
        return !!(this.wordEl && this.charEl && this.timeEl);
    }

    update(stats) {
        if (!stats) return;

        // Skip if unchanged
        if (this.lastStats &&
            this.lastStats.words === stats.words &&
            this.lastStats.characters === stats.characters &&
            this.lastStats.readingTimeMinutes === stats.readingTimeMinutes) {
            return;
        }

        this.lastStats = { ...stats };

        if (this.wordEl) {
            this.wordEl.textContent = formatNumber(stats.words);
        }
        if (this.charEl) {
            this.charEl.textContent = formatNumber(stats.characters);
        }
        if (this.timeEl) {
            this.timeEl.textContent = formatReadingTime(stats.readingTimeMinutes);
        }
    }

    destroy() {
        this.wordEl = null;
        this.charEl = null;
        this.timeEl = null;
        this.lastStats = null;
    }
}
