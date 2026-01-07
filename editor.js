/* editor.js */

import { calculateStats, updateStatsDisplay } from './stats.js';
import { generateCleanHTML, formatHTMLForDisplay } from './export.js';
import { debounce, copyToClipboard, showStatus } from './utils.js';

/**
 * Main Editor Module
 * Initializes and manages the Tiptap editor instance
 */

// CDN URLs for Tiptap core modules
const TIPTAP_CDN = {
    core: 'https://cdn.jsdelivr.net/npm/@tiptap/core@2.1.13/+esm',
    starterKit: 'https://cdn.jsdelivr.net/npm/@tiptap/starter-kit@2.1.13/+esm',
    link: 'https://cdn.jsdelivr.net/npm/@tiptap/extension-link@2.1.13/+esm',
    placeholder: 'https://cdn.jsdelivr.net/npm/@tiptap/extension-placeholder@2.1.13/+esm'
};

// Editor instance reference
let editor = null;

/**
 * Load Tiptap modules from CDN
 */
async function loadTiptapModules() {
    try {
        const [coreModule, starterKitModule, linkModule, placeholderModule] = await Promise.all([
            import(TIPTAP_CDN.core),
            import(TIPTAP_CDN.starterKit),
            import(TIPTAP_CDN.link),
            import(TIPTAP_CDN.placeholder)
        ]);

        return {
            Editor: coreModule.Editor,
            StarterKit: starterKitModule.StarterKit,
            Link: linkModule.Link,
            Placeholder: placeholderModule.Placeholder
        };
    } catch (error) {
        console.error('Failed to load Tiptap modules:', error);
        throw new Error('Failed to load editor. Please refresh the page.');
    }
}

/**
 * Initialize the Tiptap editor
 */
async function initEditor() {
    const editorElement = document.getElementById('editor');
    
    if (!editorElement) {
        console.error('Editor element not found');
        return;
    }

    // Show loading state
    editorElement.innerHTML = '<p style="color: #9b9b9b;">Loading editor...</p>';

    try {
        const { Editor, StarterKit, Link, Placeholder } = await loadTiptapModules();

        // Create editor instance
        editor = new Editor({
            element: editorElement,
            extensions: [
                StarterKit.configure({
                    heading: {
                        levels: [2, 3]
                    },
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
                    placeholder: 'Start writing your content here...'
                })
            ],
            content: '',
            autofocus: true,
            editorProps: {
                attributes: {
                    class: 'ProseMirror'
                }
            },
            onUpdate: debounce(handleEditorUpdate, 150)
        });

        // Initial stats update
        handleEditorUpdate();

        // Setup toolbar
        setupToolbar();

        // Setup export button
        setupExportButton();

        // Setup link modal
        setupLinkModal();

    } catch (error) {
        editorElement.innerHTML = '<p style="color: #d33;">Failed to load editor. Please refresh the page.</p>';
        console.error('Editor initialization failed:', error);
    }
}

/**
 * Handle editor content updates
 */
function handleEditorUpdate() {
    if (!editor) return;

    const text = editor.getText();
    const stats = calculateStats(text);
    
    // Update stats display
    updateStatsDisplay(stats);

    // Update HTML preview
    const html = generateCleanHTML(editor.getJSON());
    const previewElement = document.getElementById('html-preview');
    
    if (previewElement) {
        previewElement.textContent = formatHTMLForDisplay(html);
    }

    // Update toolbar button states
    updateToolbarState();
}

/**
 * Update toolbar button active states
 */
function updateToolbarState() {
    if (!editor) return;

    const buttons = document.querySelectorAll('.toolbar-btn[data-action]');

    buttons.forEach(button => {
        const action = button.getAttribute('data-action');
        let isActive = false;

        switch (action) {
            case 'bold':
                isActive = editor.isActive('bold');
                break;
            case 'italic':
                isActive = editor.isActive('italic');
                break;
            case 'code':
                isActive = editor.isActive('code');
                break;
            case 'heading2':
                isActive = editor.isActive('heading', { level: 2 });
                break;
            case 'heading3':
                isActive = editor.isActive('heading', { level: 3 });
                break;
            case 'bulletList':
                isActive = editor.isActive('bulletList');
                break;
            case 'blockquote':
                isActive = editor.isActive('blockquote');
                break;
            case 'link':
                isActive = editor.isActive('link');
                break;
        }

        button.classList.toggle('is-active', isActive);
    });
}

/**
 * Setup toolbar button event listeners
 */
function setupToolbar() {
    const toolbar = document.getElementById('toolbar');
    
    if (!toolbar) return;

    toolbar.addEventListener('click', (event) => {
        const button = event.target.closest('.toolbar-btn');
        
        if (!button || !editor) return;

        const action = button.getAttribute('data-action');

        switch (action) {
            case 'bold':
                editor.chain().focus().toggleBold().run();
                break;
            case 'italic':
                editor.chain().focus().toggleItalic().run();
                break;
            case 'code':
                editor.chain().focus().toggleCode().run();
                break;
            case 'heading2':
                editor.chain().focus().toggleHeading({ level: 2 }).run();
                break;
            case 'heading3':
                editor.chain().focus().toggleHeading({ level: 3 }).run();
                break;
            case 'paragraph':
                editor.chain().focus().setParagraph().run();
                break;
            case 'bulletList':
                editor.chain().focus().toggleBulletList().run();
                break;
            case 'blockquote':
                editor.chain().focus().toggleBlockquote().run();
                break;
            case 'link':
                openLinkModal();
                break;
        }

        updateToolbarState();
    });
}

/**
 * Setup link modal functionality
 */
function setupLinkModal() {
    const modal = document.getElementById('link-modal');
    const urlInput = document.getElementById('link-url');
    const cancelBtn = document.getElementById('link-cancel');
    const confirmBtn = document.getElementById('link-confirm');

    if (!modal || !urlInput || !cancelBtn || !confirmBtn) return;

    cancelBtn.addEventListener('click', closeLinkModal);

    confirmBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        
        if (url && editor) {
            editor.chain().focus().setLink({ href: url }).run();
        }
        
        closeLinkModal();
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeLinkModal();
        }
    });

    urlInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            confirmBtn.click();
        } else if (event.key === 'Escape') {
            closeLinkModal();
        }
    });
}

/**
 * Open the link modal
 */
function openLinkModal() {
    const modal = document.getElementById('link-modal');
    const urlInput = document.getElementById('link-url');

    if (!modal || !urlInput) return;

    // Pre-fill with existing link if any
    if (editor && editor.isActive('link')) {
        const attrs = editor.getAttributes('link');
        urlInput.value = attrs.href || '';
    } else {
        urlInput.value = '';
    }

    modal.classList.add('is-visible');
    urlInput.focus();
}

/**
 * Close the link modal
 */
function closeLinkModal() {
    const modal = document.getElementById('link-modal');
    const urlInput = document.getElementById('link-url');

    if (modal) {
        modal.classList.remove('is-visible');
    }

    if (urlInput) {
        urlInput.value = '';
    }

    if (editor) {
        editor.commands.focus();
    }
}

/**
 * Setup export/copy button
 */
function setupExportButton() {
    const copyBtn = document.getElementById('copy-html-btn');
    const statusEl = document.getElementById('export-status');

    if (!copyBtn) return;

    copyBtn.addEventListener('click', async () => {
        if (!editor) return;

        const html = generateCleanHTML(editor.getJSON());

        if (!html.trim()) {
            showStatus(statusEl, 'No content to export', 'error');
            return;
        }

        const success = await copyToClipboard(html);

        if (success) {
            showStatus(statusEl, 'HTML copied to clipboard', 'success');
        } else {
            showStatus(statusEl, 'Failed to copy. Try again.', 'error');
        }
    });
}

// Initialize editor when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditor);
} else {
    initEditor();
}

export { editor };
