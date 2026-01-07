/* modal.js */

/**
 * Modal Module
 * @author Oathan Rex
 */

import { validateURL } from './utils.js';

/**
 * Focus Trap for accessibility
 */
class FocusTrap {
    constructor(container) {
        this.container = container;
        this.firstEl = null;
        this.lastEl = null;
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    activate() {
        const focusables = this.container.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusables.length === 0) return;

        this.firstEl = focusables[0];
        this.lastEl = focusables[focusables.length - 1];

        this.container.addEventListener('keydown', this.handleKeyDown);
        this.firstEl.focus();
    }

    deactivate() {
        this.container.removeEventListener('keydown', this.handleKeyDown);
    }

    handleKeyDown(e) {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            if (document.activeElement === this.firstEl) {
                e.preventDefault();
                this.lastEl.focus();
            }
        } else {
            if (document.activeElement === this.lastEl) {
                e.preventDefault();
                this.firstEl.focus();
            }
        }
    }
}

/**
 * Link Modal Controller
 */
export class LinkModal {
    constructor() {
        this.overlay = null;
        this.modal = null;
        this.urlInput = null;
        this.errorEl = null;
        this.cancelBtn = null;
        this.confirmBtn = null;
        this.focusTrap = null;
        this.previousFocus = null;
        this.onConfirm = null;
        this.isOpen = false;

        this.handleConfirm = this.handleConfirm.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleOverlayClick = this.handleOverlayClick.bind(this);
        this.handleInput = this.handleInput.bind(this);
    }

    initialize() {
        this.overlay = document.getElementById('link-modal');
        if (!this.overlay) return false;

        this.modal = this.overlay.querySelector('.modal');
        this.urlInput = document.getElementById('link-url');
        this.errorEl = document.getElementById('link-error');
        this.cancelBtn = document.getElementById('link-cancel');
        this.confirmBtn = document.getElementById('link-confirm');

        if (!this.modal || !this.urlInput || !this.cancelBtn || !this.confirmBtn) {
            return false;
        }

        this.focusTrap = new FocusTrap(this.modal);

        this.confirmBtn.addEventListener('click', this.handleConfirm);
        this.cancelBtn.addEventListener('click', this.handleCancel);
        this.overlay.addEventListener('click', this.handleOverlayClick);
        this.urlInput.addEventListener('input', this.handleInput);
        this.urlInput.addEventListener('keydown', this.handleKeyDown);

        return true;
    }

    open(options = {}) {
        if (this.isOpen) return;

        const { initialValue = '', onConfirm = null } = options;

        this.onConfirm = onConfirm;
        this.previousFocus = document.activeElement;

        this.urlInput.value = initialValue;
        this.clearError();

        this.overlay.classList.add('is-visible');
        this.overlay.setAttribute('aria-hidden', 'false');
        this.isOpen = true;

        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            this.focusTrap.activate();
        }, 50);
    }

    close() {
        if (!this.isOpen) return;

        this.overlay.classList.remove('is-visible');
        this.overlay.setAttribute('aria-hidden', 'true');
        this.isOpen = false;

        document.body.style.overflow = '';

        this.focusTrap.deactivate();

        if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
            this.previousFocus.focus();
        }

        this.onConfirm = null;
    }

    showError(message) {
        if (this.errorEl) {
            this.errorEl.textContent = message;
        }
        this.urlInput.setAttribute('aria-invalid', 'true');
    }

    clearError() {
        if (this.errorEl) {
            this.errorEl.textContent = '';
        }
        this.urlInput.removeAttribute('aria-invalid');
    }

    handleConfirm() {
        const url = this.urlInput.value.trim();

        if (!url) {
            this.showError('Please enter a URL');
            this.urlInput.focus();
            return;
        }

        const validation = validateURL(url);

        if (!validation.valid) {
            this.showError(validation.error || 'Invalid URL');
            this.urlInput.focus();
            return;
        }

        if (typeof this.onConfirm === 'function') {
            this.onConfirm(validation.url);
        }

        this.close();
    }

    handleCancel() {
        this.close();
    }

    handleOverlayClick(e) {
        if (e.target === this.overlay) {
            this.close();
        }
    }

    handleInput() {
        if (this.urlInput.value.trim()) {
            this.clearError();
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.handleConfirm();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.close();
        }
    }

    destroy() {
        if (this.confirmBtn) {
            this.confirmBtn.removeEventListener('click', this.handleConfirm);
        }
        if (this.cancelBtn) {
            this.cancelBtn.removeEventListener('click', this.handleCancel);
        }
        if (this.overlay) {
            this.overlay.removeEventListener('click', this.handleOverlayClick);
        }
        if (this.urlInput) {
            this.urlInput.removeEventListener('input', this.handleInput);
            this.urlInput.removeEventListener('keydown', this.handleKeyDown);
        }
        if (this.focusTrap) {
            this.focusTrap.deactivate();
        }

        this.overlay = null;
        this.modal = null;
        this.urlInput = null;
        this.errorEl = null;
        this.cancelBtn = null;
        this.confirmBtn = null;
        this.focusTrap = null;
        this.onConfirm = null;
    }
}
