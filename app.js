/* app.js */

/**
 * Main Application
 * @author Oathan Rex
 */

import { debounce, copyToClipboard, showStatus, announce, retry, timeout } from './utils.js';
import { calculateStats, StatsDisplay } from './stats.js';
import { generateCleanHTML, HTMLPreviewController } from './export.js';
import { ToolbarController, ToolbarAction } from './toolbar.js';
import { LinkModal } from './modal.js';

// Configuration
const CONFIG = {
    placeholder: 'Start writing your content here...',
    debounceMs: 150,
    cdnTimeout: 15000,
    retryAttempts: 3,
    retryDelay: 1000,
    statusDuration: 3000,
    messages: {
        loading: 'Loading editor...',
        loadError: 'Failed to load editor. Please check your connection and try again.',
        noContent: 'No content to export',
        copySuccess: 'HTML copied to clipboard',
        copyError: 'Failed to copy. Please try again.'
    }
};

// CDN sources with fallback
const CDN_SOURCES = [
    {
        name: 'jsdelivr',
        core: 'https://cdn.jsdelivr.net/npm/@tiptap/core@2.1.13/+esm',
        starterKit: 'https://cdn.jsdelivr.net/npm/@tiptap/starter-kit@2.1.13/+esm',
        link: 'https://cdn.jsdelivr.net/npm/@tiptap/extension-link@2.1.13/+esm',
        placeholder: 'https://cdn.jsdelivr.net/npm/@tiptap/extension-placeholder@2.1.13/+esm'
    }
];

/**
 * Load Tiptap modules from CDN
 */
async function loadTiptapModules(onStatus) {
    for (let i = 0; i < CDN_SOURCES.length; i++) {
        const source = CDN_SOURCES[i];

        try {
            const modules = await retry(
                async () => {
                    const loadWithTimeout = (url) => Promise.race([
                        import(url),
                        timeout(CONFIG.cdnTimeout, 'Module load timeout')
                    ]);

                    const [core, starterKit, link, placeholder] = await Promise.all([
                        loadWithTimeout(source.core),
                        loadWithTimeout(source.starterKit),
                        loadWithTimeout(source.link),
                        loadWithTimeout(source.placeholder)
                    ]);

                    return {
                        Editor: core.Editor,
                        StarterKit: starterKit.StarterKit,
                        Link: link.Link,
                        Placeholder: placeholder.Placeholder
                    };
                },
                {
                    attempts: CONFIG.retryAttempts,
                    delay: CONFIG.retryDelay,
                    onRetry: (attempt) => {
                        if (onStatus) {
                            onStatus('Retrying... (attempt ' + attempt + ')');
                        }
                    }
                }
            );

            if (!modules.Editor || !modules.StarterKit) {
                throw new Error('Invalid module structure');
            }

            return modules;

        } catch (error) {
            console.warn('Failed to load from ' + source.name + ':', error);

            if (i === CDN_SOURCES.length - 1) {
                throw new Error(CONFIG.messages.loadError);
            }
        }
    }

    throw new Error(CONFIG.messages.loadError);
}

/**
 * Create loading UI
 */
function createLoadingUI(container) {
    const div = document.createElement('div');
    div.className = 'editor-loading';
    div.setAttribute('role', 'status');
    div.innerHTML = '<div class="loading-spinner"></div><span class="loading-text">' + CONFIG.messages.loading + '</span>';

    container.innerHTML = '';
    container.appendChild(div);

    const textEl = div.querySelector('.loading-text');

    return {
        update(msg) {
            if (textEl) textEl.textContent = msg;
        },
        showError(msg, onRetry) {
            div.className = 'editor-error';
            div.innerHTML = '<span>' + msg + '</span>' + (onRetry ? '<button type="button" class="retry-btn">Retry</button>' : '');
            if (onRetry) {
                const btn = div.querySelector('.retry-btn');
                if (btn) btn.addEventListener('click', onRetry);
            }
        },
        remove() {
            if (div.parentNode) div.parentNode.removeChild(div);
        }
    };
}

/**
 * Main Application Class
 */
class ContentEditorApp {
    constructor() {
        this.editor = null;
        this.editorEl = null;
        this.toolbar = null;
        this.statsDisplay = null;
        this.htmlPreview = null;
        this.linkModal = null;
        this.copyBtn = null;
        this.statusEl = null;
        this.updateHandler = null;
        this.isInitialized = false;

        this.handleEditorUpdate = this.handleEditorUpdate.bind(this);
        this.handleToolbarAction = this.handleToolbarAction.bind(this);
        this.handleCopyClick = this.handleCopyClick.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    }

    async initialize() {
        try {
            this.editorEl = document.getElementById('editor');
            if (!this.editorEl) {
                throw new Error('Editor container not found');
            }

            const loadingUI = createLoadingUI(this.editorEl);

            // Initialize controllers
            this.initControllers();

            // Load Tiptap
            const modules = await loadTiptapModules((msg) => loadingUI.update(msg));

            loadingUI.remove();

            // Create editor
            await this.createEditor(modules);

            // Setup events
            this.setupEvents();

            // Initial update
            this.handleEditorUpdate();

            this.isInitialized = true;
            announce('Editor ready');

        } catch (error) {
            console.error('Initialization failed:', error);
            this.handleInitError(error);
        }
    }

    initControllers() {
        this.statsDisplay = new StatsDisplay();
        this.statsDisplay.initialize();

        this.htmlPreview = new HTMLPreviewController();
        this.htmlPreview.initialize('html-preview');

        this.toolbar = new ToolbarController();
        this.toolbar.initialize({ onAction: this.handleToolbarAction });

        this.linkModal = new LinkModal();
        this.linkModal.initialize();

        this.copyBtn = document.getElementById('copy-html-btn');
        this.statusEl = document.getElementById('export-status');
    }

    async createEditor(modules) {
        const { Editor, StarterKit, Link, Placeholder } = modules;

        this.editor = new Editor({
            element: this.editorEl,
            extensions: [
                StarterKit.configure({
                    heading: { levels: [2, 3] },
                    bulletList: true,
                    orderedList: false,
                    codeBlock: false,
                    horizontalRule: false
                }),
                Link.configure({
                    openOnClick: false,
                    HTMLAttributes: {
                        rel: 'noopener noreferrer',
                        target: '_blank'
                    }
                }),
                Placeholder.configure({
                    placeholder: CONFIG.placeholder
                })
            ],
            content: '',
            autofocus: true,
            editorProps: {
                attributes: {
                    class: 'ProseMirror',
                    role: 'textbox',
                    'aria-multiline': 'true',
                    'aria-label': 'Document content'
                }
            },
            onUpdate: () => {
                if (this.updateHandler) {
                    this.updateHandler();
                }
            }
        });

        this.updateHandler = debounce(this.handleEditorUpdate, CONFIG.debounceMs);
    }

    setupEvents() {
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', this.handleCopyClick);
        }
        window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    handleEditorUpdate() {
        if (!this.editor) return;

        const text = this.editor.getText();
        const stats = calculateStats(text);
        this.statsDisplay.update(stats);

        const html = generateCleanHTML(this.editor.getJSON());
        this.htmlPreview.update(html);

        this.updateToolbarStates();
    }

    updateToolbarStates() {
        if (!this.editor || !this.toolbar) return;

        const states = {
            [ToolbarAction.BOLD]: this.editor.isActive('bold'),
            [ToolbarAction.ITALIC]: this.editor.isActive('italic'),
            [ToolbarAction.CODE]: this.editor.isActive('code'),
            [ToolbarAction.HEADING2]: this.editor.isActive('heading', { level: 2 }),
            [ToolbarAction.HEADING3]: this.editor.isActive('heading', { level: 3 }),
            [ToolbarAction.PARAGRAPH]: this.editor.isActive('paragraph'),
            [ToolbarAction.BULLET_LIST]: this.editor.isActive('bulletList'),
            [ToolbarAction.BLOCKQUOTE]: this.editor.isActive('blockquote'),
            [ToolbarAction.LINK]: this.editor.isActive('link')
        };

        this.toolbar.updateStates(states);
    }

    handleToolbarAction(action) {
        if (!this.editor) return;

        switch (action) {
            case ToolbarAction.BOLD:
                this.editor.chain().focus().toggleBold().run();
                break;
            case ToolbarAction.ITALIC:
                this.editor.chain().focus().toggleItalic().run();
                break;
            case ToolbarAction.CODE:
                this.editor.chain().focus().toggleCode().run();
                break;
            case ToolbarAction.HEADING2:
                this.editor.chain().focus().toggleHeading({ level: 2 }).run();
                break;
            case ToolbarAction.HEADING3:
                this.editor.chain().focus().toggleHeading({ level: 3 }).run();
                break;
            case ToolbarAction.PARAGRAPH:
                this.editor.chain().focus().setParagraph().run();
                break;
            case ToolbarAction.BULLET_LIST:
                this.editor.chain().focus().toggleBulletList().run();
                break;
            case ToolbarAction.BLOCKQUOTE:
                this.editor.chain().focus().toggleBlockquote().run();
                break;
            case ToolbarAction.LINK:
                this.openLinkModal();
                break;
        }

        this.updateToolbarStates();
    }

    openLinkModal() {
        if (!this.linkModal || !this.editor) return;

        let initialValue = '';
        if (this.editor.isActive('link')) {
            const attrs = this.editor.getAttributes('link');
            initialValue = attrs.href || '';
        }

        this.linkModal.open({
            initialValue,
            onConfirm: (url) => {
                this.editor.chain().focus().setLink({ href: url }).run();
                this.updateToolbarStates();
            }
        });
    }

    async handleCopyClick() {
        if (!this.editor) return;

        const html = generateCleanHTML(this.editor.getJSON());

        if (!html.trim()) {
            showStatus(this.statusEl, CONFIG.messages.noContent, 'error', CONFIG.statusDuration);
            announce(CONFIG.messages.noContent);
            return;
        }

        if (this.copyBtn) {
            this.copyBtn.disabled = true;
        }

        try {
            const success = await copyToClipboard(html);

            if (success) {
                showStatus(this.statusEl, CONFIG.messages.copySuccess, 'success', CONFIG.statusDuration);
                announce(CONFIG.messages.copySuccess);
            } else {
                showStatus(this.statusEl, CONFIG.messages.copyError, 'error', CONFIG.statusDuration);
                announce(CONFIG.messages.copyError);
            }
        } catch (err) {
            console.error('Copy failed:', err);
            showStatus(this.statusEl, CONFIG.messages.copyError, 'error', CONFIG.statusDuration);
        } finally {
            if (this.copyBtn) {
                this.copyBtn.disabled = false;
            }
        }
    }

    handleBeforeUnload() {
        if (this.updateHandler && typeof this.updateHandler.flush === 'function') {
            this.updateHandler.flush();
        }
    }

    handleInitError(error) {
        if (this.editorEl) {
            const loadingUI = createLoadingUI(this.editorEl);
            loadingUI.showError(
                error.message || CONFIG.messages.loadError,
                () => this.initialize()
            );
        }
    }

    destroy() {
        if (this.updateHandler && typeof this.updateHandler.flush === 'function') {
            this.updateHandler.flush();
        }

        window.removeEventListener('beforeunload', this.handleBeforeUnload);

        if (this.copyBtn) {
            this.copyBtn.removeEventListener('click', this.handleCopyClick);
        }

        if (this.editor) {
            this.editor.destroy();
            this.editor = null;
        }

        if (this.toolbar) {
            this.toolbar.destroy();
            this.toolbar = null;
        }

        if (this.statsDisplay) {
            this.statsDisplay.destroy();
            this.statsDisplay = null;
        }

        if (this.htmlPreview) {
            this.htmlPreview.destroy();
            this.htmlPreview = null;
        }

        if (this.linkModal) {
            this.linkModal.destroy();
            this.linkModal = null;
        }

        this.isInitialized = false;
    }
}

// Initialize
const app = new ContentEditorApp();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
    app.initialize();
}

window.addEventListener('unload', () => app.destroy());

export { app };
