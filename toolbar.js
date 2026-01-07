/* toolbar.js */

/**
 * Toolbar Module
 * @author Oathan Rex
 */

export const ToolbarAction = Object.freeze({
    HEADING2: 'heading2',
    HEADING3: 'heading3',
    PARAGRAPH: 'paragraph',
    BOLD: 'bold',
    ITALIC: 'italic',
    CODE: 'code',
    BULLET_LIST: 'bulletList',
    BLOCKQUOTE: 'blockquote',
    LINK: 'link'
});

/**
 * Toolbar Controller
 */
export class ToolbarController {
    constructor() {
        this.element = null;
        this.buttons = new Map();
        this.onAction = null;
        this.handleClick = this.handleClick.bind(this);
    }

    initialize(options = {}) {
        this.element = document.getElementById('toolbar');

        if (!this.element) {
            console.error('Toolbar element not found');
            return false;
        }

        this.onAction = options.onAction || null;

        const btns = this.element.querySelectorAll('.toolbar-btn[data-action]');
        btns.forEach(btn => {
            const action = btn.getAttribute('data-action');
            if (action) {
                this.buttons.set(action, btn);
            }
        });

        this.element.addEventListener('click', this.handleClick);
        return true;
    }

    handleClick(e) {
        const btn = e.target.closest('.toolbar-btn[data-action]');
        if (!btn || btn.disabled) return;

        const action = btn.getAttribute('data-action');
        if (action && typeof this.onAction === 'function') {
            this.onAction(action);
        }
    }

    updateStates(activeStates) {
        if (!activeStates) return;

        this.buttons.forEach((btn, action) => {
            const isActive = activeStates[action] || false;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });
    }

    destroy() {
        if (this.element) {
            this.element.removeEventListener('click', this.handleClick);
        }
        this.element = null;
        this.buttons.clear();
        this.onAction = null;
    }
}
