/**
 * Aura Voice AI — Chat & Session Manager
 * Handles multi-session history, local storage persistence, markdown rendering, and export functions.
 */

import { STORAGE_KEYS } from './config.js';

export class ChatManager {
  constructor() {
    this.sessions = this.loadSessions();
    this.activeSessionId = this.loadActiveSessionId();

    if (!this.sessions[this.activeSessionId]) {
      this.createNewSession();
    }
  }

  loadSessions() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.warn('Failed to load sessions from storage:', e);
      return {};
    }
  }

  saveSessions() {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(this.sessions));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, this.activeSessionId);
    } catch (e) {
      console.error('Failed to save sessions to storage:', e);
    }
  }

  loadActiveSessionId() {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION) || '';
    } catch (e) {
      return '';
    }
  }

  createNewSession(title = 'New Conversation') {
    const id = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    this.sessions[id] = {
      id,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };
    this.activeSessionId = id;
    this.saveSessions();
    return this.sessions[id];
  }

  getActiveSession() {
    return this.sessions[this.activeSessionId] || null;
  }

  getMessages() {
    const session = this.getActiveSession();
    return session ? session.messages : [];
  }

  addMessage(role, content) {
    const session = this.getActiveSession();
    if (!session) return null;

    const message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      role, // 'user' or 'assistant'
      content,
      timestamp: new Date().toISOString()
    };

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();

    // Auto-update session title based on first user message
    if (role === 'user' && session.messages.filter(m => m.role === 'user').length === 1) {
      session.title = content.length > 32 ? content.substring(0, 32) + '...' : content;
    }

    this.saveSessions();
    return message;
  }

  switchSession(sessionId) {
    if (this.sessions[sessionId]) {
      this.activeSessionId = sessionId;
      this.saveSessions();
      return true;
    }
    return false;
  }

  deleteSession(sessionId) {
    delete this.sessions[sessionId];
    const sessionKeys = Object.keys(this.sessions);

    if (this.activeSessionId === sessionId) {
      if (sessionKeys.length > 0) {
        this.activeSessionId = sessionKeys[sessionKeys.length - 1];
      } else {
        this.createNewSession();
      }
    }
    this.saveSessions();
  }

  clearAllSessions() {
    this.sessions = {};
    this.createNewSession();
  }

  getAllSessionsList() {
    return Object.values(this.sessions).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  /**
   * Escape HTML to prevent XSS in raw user inputs
   */
  escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Simple, fast, and robust Markdown-to-HTML parser with syntax code-blocks and copy buttons.
   */
  renderMarkdown(text) {
    if (!text) return '';

    // 1. Code blocks with language header and copy button
    let html = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang.trim() || 'code';
      const escapedCode = this.escapeHTML(code.trim());
      const rawCodeData = encodeURIComponent(code.trim());
      return `
        <div class="code-block-container">
          <div class="code-header">
            <span class="code-lang">${language}</span>
            <button class="copy-code-btn" data-code="${rawCodeData}">
              <i class="fa-regular fa-copy"></i> Copy Code
            </button>
          </div>
          <pre><code>${escapedCode}</code></pre>
        </div>
      `;
    });

    // 2. Inline code `code`
    html = html.replace(/`([^`]+)`/g, (match, code) => {
      return `<code>${this.escapeHTML(code)}</code>`;
    });

    // 3. Headings
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 4. Bold & Italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 5. Unordered Lists
    html = html.replace(/^\s*[-*•]\s+(.*)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');

    // 6. Ordered Lists
    html = html.replace(/^\s*(\d+)\.\s+(.*)$/gim, '<li>$2</li>');

    // 7. Paragraphs & Line Breaks
    const paragraphs = html.split(/\n{2,}/);
    html = paragraphs.map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<div class="code-block-container"') || trimmed.startsWith('<ul>') || trimmed.startsWith('<ol>') || trimmed.startsWith('<h')) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }

  /**
   * Export conversation in various formats
   */
  exportConversation(format = 'markdown') {
    const session = this.getActiveSession();
    if (!session || session.messages.length === 0) {
      throw new Error('No messages in this conversation to export.');
    }

    const title = session.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'conversation';
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      const jsonContent = JSON.stringify(session, null, 2);
      this.downloadFile(`${title}_${dateStr}.json`, 'application/json', jsonContent);
    } else if (format === 'markdown') {
      let md = `# ${session.title}\n\n`;
      md += `*Exported on: ${new Date().toLocaleString()}*\n\n---\n\n`;
      session.messages.forEach(msg => {
        const sender = msg.role === 'user' ? '👤 **You**' : '✨ **Aura AI**';
        const time = new Date(msg.timestamp).toLocaleTimeString();
        md += `### ${sender} *(${time})*\n\n${msg.content}\n\n---\n\n`;
      });
      this.downloadFile(`${title}_${dateStr}.md`, 'text/markdown', md);
    } else {
      // Plain text
      let txt = `${session.title.toUpperCase()}\n`;
      txt += `Date: ${new Date().toLocaleString()}\n`;
      txt += `==========================================\n\n`;
      session.messages.forEach(msg => {
        const sender = msg.role === 'user' ? 'YOU' : 'AURA AI';
        const time = new Date(msg.timestamp).toLocaleTimeString();
        txt += `[${time}] ${sender}:\n${msg.content}\n\n`;
      });
      this.downloadFile(`${title}_${dateStr}.txt`, 'text/plain', txt);
    }
  }

  downloadFile(filename, mimeType, content) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const chatManager = new ChatManager();
