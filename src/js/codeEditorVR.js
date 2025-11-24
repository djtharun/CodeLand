// src/js/codeEditorVR.js

class CodeEditorVR {
  constructor(scene) {
    this.scene = scene;
    this.code = '';
    this.language = 'javascript';
    this.currentPage = 0;
    this.linesPerPage = 25;
    this.editorContainer = null;
    this.highlightedLine = -1;
    this.suggestions = [];
  }

  initialize() {
    this.createEditorPanel();
    this.createPageControls();
    return true;
  }

  createEditorPanel() {
    this.editorContainer = document.createElement('a-entity');
    this.editorContainer.setAttribute('id', 'codeEditor');
    this.editorContainer.setAttribute('position', '-8 3 -10');

    // Editor background
    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '12');
    bg.setAttribute('height', '10');
    bg.setAttribute('color', '#1e1e1e');
    bg.setAttribute('opacity', '0.95');
    
    // Border glow
    const border = document.createElement('a-plane');
    border.setAttribute('width', '12.1');
    border.setAttribute('height', '10.1');
    border.setAttribute('color', '#00ff88');
    border.setAttribute('opacity', '0.3');
    border.setAttribute('position', '0 0 -0.01');

    // Title bar
    const titleBar = document.createElement('a-plane');
    titleBar.setAttribute('width', '12');
    titleBar.setAttribute('height', '0.6');
    titleBar.setAttribute('position', '0 4.7 0.01');
    titleBar.setAttribute('color', '#0f1419');

    const titleText = document.createElement('a-text');
    titleText.setAttribute('value', '📝 CODE EDITOR');
    titleText.setAttribute('align', 'center');
    titleText.setAttribute('position', '0 4.7 0.02');
    titleText.setAttribute('color', '#00ff88');
    titleText.setAttribute('width', '6');

    this.editorContainer.appendChild(border);
    this.editorContainer.appendChild(bg);
    this.editorContainer.appendChild(titleBar);
    this.editorContainer.appendChild(titleText);

    this.scene.appendChild(this.editorContainer);
  }

  createPageControls() {
    const controls = document.createElement('a-entity');
    controls.setAttribute('position', '-8 -2 -10');

    // Previous page button
    const prevBtn = this.createControlButton('◀ PREV', '-2 0 0', () => this.previousPage());
    controls.appendChild(prevBtn);

    // Page indicator
    const pageIndicator = document.createElement('a-text');
    pageIndicator.setAttribute('id', 'pageIndicator');
    pageIndicator.setAttribute('value', 'Page 1/1');
    pageIndicator.setAttribute('align', 'center');
    pageIndicator.setAttribute('position', '0 0 0');
    pageIndicator.setAttribute('color', '#ffffff');
    pageIndicator.setAttribute('width', '3');
    controls.appendChild(pageIndicator);

    // Next page button
    const nextBtn = this.createControlButton('NEXT ▶', '2 0 0', () => this.nextPage());
    controls.appendChild(nextBtn);

    this.scene.appendChild(controls);
  }

  createControlButton(text, position, onClick) {
    const btnEntity = document.createElement('a-entity');
    btnEntity.setAttribute('position', position);

    const btn = document.createElement('a-box');
    btn.setAttribute('width', '1.5');
    btn.setAttribute('height', '0.4');
    btn.setAttribute('depth', '0.1');
    btn.setAttribute('color', '#3498db');
    btn.setAttribute('opacity', '0.9');
    btn.setAttribute('class', 'clickable');

    btn.addEventListener('click', onClick);
    btn.addEventListener('mouseenter', () => {
      btn.setAttribute('scale', '1.05 1.05 1.05');
    });
    btn.addEventListener('mouseleave', () => {
      btn.setAttribute('scale', '1 1 1');
    });

    const btnText = document.createElement('a-text');
    btnText.setAttribute('value', text);
    btnText.setAttribute('align', 'center');
    btnText.setAttribute('position', '0 0 0.06');
    btnText.setAttribute('color', '#ffffff');
    btnText.setAttribute('width', '1.4');

    btnEntity.appendChild(btn);
    btnEntity.appendChild(btnText);

    return btnEntity;
  }

  displayCode(code, language) {
    this.code = code;
    this.language = language;
    this.currentPage = 0;
    this.renderCurrentPage();
  }

  renderCurrentPage() {
    // Remove existing code lines
    const existing = this.editorContainer.querySelectorAll('[data-code-line]');
    existing.forEach(el => el.parentNode.removeChild(el));

    const lines = this.code.split('\n');
    const totalPages = Math.ceil(lines.length / this.linesPerPage);
    const startLine = this.currentPage * this.linesPerPage;
    const endLine = Math.min(startLine + this.linesPerPage, lines.length);

    const yStart = 4;
    const lineHeight = 0.35;
    const xStart = -5.8;

    for (let i = startLine; i < endLine; i++) {
      const line = lines[i];
      const displayIdx = i - startLine;
      const yPos = yStart - (displayIdx * lineHeight);

      this.renderCodeLine(i + 1, line, xStart, yPos);
    }

    // Update page indicator
    const indicator = document.getElementById('pageIndicator');
    if (indicator) {
      indicator.setAttribute('value', `Page ${this.currentPage + 1}/${totalPages}`);
    }
  }

  renderCodeLine(lineNum, code, x, y) {
    const lineEntity = document.createElement('a-entity');
    lineEntity.setAttribute('data-code-line', lineNum);
    lineEntity.setAttribute('position', `${x} ${y} 0.01`);

    // Highlight if this is the current execution line
    if (lineNum === this.highlightedLine) {
      const highlight = document.createElement('a-plane');
      highlight.setAttribute('width', '11.5');
      highlight.setAttribute('height', '0.32');
      highlight.setAttribute('color', '#ffaa00');
      highlight.setAttribute('opacity', '0.3');
      highlight.setAttribute('position', '5.75 0 -0.005');
      lineEntity.appendChild(highlight);
    }

    // Line number
    const lineNumText = document.createElement('a-text');
    lineNumText.setAttribute('value', String(lineNum).padStart(4, ' '));
    lineNumText.setAttribute('align', 'right');
    lineNumText.setAttribute('position', '0.5 0 0');
    lineNumText.setAttribute('color', '#858585');
    lineNumText.setAttribute('width', '2');
    lineNumText.setAttribute('font', 'monoid');
    lineEntity.appendChild(lineNumText);

    // Syntax highlighted code
    const tokens = this.tokenizeCode(code);
    let xOffset = 0.7;

    tokens.forEach(token => {
      const tokenText = document.createElement('a-text');
      tokenText.setAttribute('value', token.value);
      tokenText.setAttribute('align', 'left');
      tokenText.setAttribute('position', `${xOffset} 0 0`);
      tokenText.setAttribute('color', this.getTokenColor(token.type));
      tokenText.setAttribute('width', '10');
      tokenText.setAttribute('font', 'monoid');
      
      lineEntity.appendChild(tokenText);
      xOffset += token.value.length * 0.15; // Approximate character width
    });

    this.editorContainer.appendChild(lineEntity);
  }

  tokenizeCode(code) {
    // Simple syntax tokenizer
    const tokens = [];
    
    // Comments
    if (code.trim().startsWith('//')) {
      return [{ type: 'comment', value: code }];
    }

    // Keywords
    const keywords = [
      'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while',
      'return', 'class', 'extends', 'import', 'export', 'from', 'async',
      'await', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super',
      'def', 'print', 'lambda', 'yield', 'with', 'as', 'pass', 'break',
      'continue', 'public', 'private', 'static', 'void', 'int', 'String'
    ];

    // String detection
    const stringRegex = /(['"`])(?:(?=(\\?))\2.)*?\1/g;
    const strings = [];
    let match;
    while ((match = stringRegex.exec(code)) !== null) {
      strings.push({ start: match.index, end: match.index + match[0].length, value: match[0] });
    }

    // Number detection
    const numberRegex = /\b\d+\.?\d*\b/g;

    let currentPos = 0;
    const words = code.split(/(\s+|[^\w]+)/);

    words.forEach(word => {
      if (!word) return;

      // Check if in string
      const inString = strings.find(s => currentPos >= s.start && currentPos < s.end);
      if (inString) {
        if (currentPos === inString.start) {
          tokens.push({ type: 'string', value: inString.value });
        }
        currentPos += word.length;
        return;
      }

      // Check token type
      if (keywords.includes(word)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (/^\d+\.?\d*$/.test(word)) {
        tokens.push({ type: 'number', value: word });
      } else if (/^[a-zA-Z_]\w*$/.test(word)) {
        // Check if it's a function call
        const nextChar = code[currentPos + word.length];
        if (nextChar === '(') {
          tokens.push({ type: 'function', value: word });
        } else {
          tokens.push({ type: 'identifier', value: word });
        }
      } else if (/^\s+$/.test(word)) {
        tokens.push({ type: 'whitespace', value: word });
      } else {
        tokens.push({ type: 'operator', value: word });
      }

      currentPos += word.length;
    });

    return tokens;
  }

  getTokenColor(type) {
    const colors = {
      'keyword': '#569cd6',      // Blue
      'string': '#ce9178',       // Orange
      'number': '#b5cea8',       // Light green
      'function': '#dcdcaa',     // Yellow
      'comment': '#6a9955',      // Green
      'operator': '#d4d4d4',     // Light gray
      'identifier': '#9cdcfe',   // Cyan
      'whitespace': '#ffffff'
    };
    return colors[type] || '#d4d4d4';
  }

  highlightLine(lineNum) {
    this.highlightedLine = lineNum;
    
    // Calculate which page the line is on
    const targetPage = Math.floor((lineNum - 1) / this.linesPerPage);
    if (targetPage !== this.currentPage) {
      this.currentPage = targetPage;
    }
    
    this.renderCurrentPage();

    // Add pulse animation to highlighted line
    const lineEntity = this.editorContainer.querySelector(`[data-code-line="${lineNum}"]`);
    if (lineEntity) {
      const pulse = document.createElement('a-animation');
      pulse.setAttribute('attribute', 'opacity');
      pulse.setAttribute('from', '0.3');
      pulse.setAttribute('to', '0.6');
      pulse.setAttribute('dur', '500');
      pulse.setAttribute('direction', 'alternate');
      pulse.setAttribute('repeat', '2');
      
      const highlight = lineEntity.querySelector('a-plane');
      if (highlight) {
        highlight.appendChild(pulse);
      }
    }
  }

  clearHighlight() {
    this.highlightedLine = -1;
    this.renderCurrentPage();
  }

  nextPage() {
    const totalPages = Math.ceil(this.code.split('\n').length / this.linesPerPage);
    if (this.currentPage < totalPages - 1) {
      this.currentPage++;
      this.renderCurrentPage();
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.renderCurrentPage();
    }
  }

  showSuggestion(lineNum, suggestion, type = 'hint') {
    // Create suggestion popup near the line
    const suggestionEntity = document.createElement('a-entity');
    suggestionEntity.setAttribute('class', 'code-suggestion');
    
    const displayIdx = (lineNum - 1) - (this.currentPage * this.linesPerPage);
    const yPos = 4 - (displayIdx * 0.35);
    suggestionEntity.setAttribute('position', `4 ${yPos} 0.05`);

    // Icon based on type
    const icons = {
      'hint': '💡',
      'error': '❌',
      'warning': '⚠️',
      'fix': '🔧'
    };

    // Suggestion panel
    const panel = document.createElement('a-plane');
    panel.setAttribute('width', '4');
    panel.setAttribute('height', '0.8');
    panel.setAttribute('color', type === 'error' ? '#3d1e1e' : '#1e3d1e');
    panel.setAttribute('opacity', '0.95');

    const text = document.createElement('a-text');
    text.setAttribute('value', `${icons[type]} ${suggestion}`);
    text.setAttribute('align', 'left');
    text.setAttribute('position', '-1.9 0 0.01');
    text.setAttribute('color', type === 'error' ? '#ff4444' : '#00ff88');
    text.setAttribute('width', '3.8');
    text.setAttribute('wrap-count', '45');

    suggestionEntity.appendChild(panel);
    suggestionEntity.appendChild(text);

    // Add to editor
    this.editorContainer.appendChild(suggestionEntity);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (suggestionEntity.parentNode) {
        suggestionEntity.parentNode.removeChild(suggestionEntity);
      }
    }, 5000);
  }

  scrollToLine(lineNum) {
    const targetPage = Math.floor((lineNum - 1) / this.linesPerPage);
    this.currentPage = targetPage;
    this.highlightLine(lineNum);
  }
}

export default CodeEditorVR;