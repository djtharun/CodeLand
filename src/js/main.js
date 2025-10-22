import { UIController } from './uiController.js';
import { VRScene } from './vrScene.js';
import { CodeAnalyzer } from './codeAnalyzer.js';

class DebugAssistant {
  constructor() {
    this.ui = new UIController();
    this.scene = new VRScene();
    this.analyzer = new CodeAnalyzer();
    
    this.currentCode = '';
    this.currentLanguage = 'javascript';
    this.analysisMode = 'static';
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.ui.updateStatus('Ready to debug...');
  }

  setupEventListeners() {
    // File upload
    document.getElementById('fileInput').addEventListener('change', (e) => {
      this.handleFileUpload(e);
    });

    // Language selection
    document.getElementById('langSelect').addEventListener('change', (e) => {
      this.currentLanguage = e.target.value;
      this.ui.updateStatus(`Language set to: ${this.currentLanguage}`);
    });

    // Mode selection
    document.getElementById('modeSelect').addEventListener('change', (e) => {
      this.analysisMode = e.target.value;
      this.ui.updateStatus(`Analysis mode: ${this.analysisMode}`);
    });

    // Analyze buttons
    document.getElementById('analyzeBtn').addEventListener('click', () => {
      this.analyzeCode();
    });
    document.getElementById('vrAnalyzeBtn').addEventListener('click', () => {
      this.analyzeCode();
    });

    // Visualize buttons
    document.getElementById('visualizeBtn').addEventListener('click', () => {
      this.visualizeCode();
    });
    document.getElementById('vrVisualizeBtn').addEventListener('click', () => {
      this.visualizeCode();
    });

    // Clear buttons
    document.getElementById('clearBtn').addEventListener('click', () => {
      this.clearSession();
    });
    document.getElementById('vrClearBtn').addEventListener('click', () => {
      this.clearSession();
    });

    // Node click handler
    document.addEventListener('click', (e) => {
      if (e.target.classList && e.target.classList.contains('clickable')) {
        this.handleNodeClick(e.target);
      }
    });
  }

  handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      this.currentCode = event.target.result;
      const lines = this.currentCode.split('\n').length;
      
      this.ui.updateStatus(`✓ Loaded: ${file.name} (${lines} lines)`);
      
      const preview = this.currentCode.substring(0, 400);
      this.ui.updateMainText(
        `CODE LOADED\n\nFile: ${file.name}\nLines: ${lines}\nLanguage: ${this.currentLanguage}\n\n${preview}${this.currentCode.length > 400 ? '...' : ''}`
      );
      
      this.scene.setStatusLight('#3498db');
    };
    reader.readAsText(file);
  }

  async analyzeCode() {
    if (!this.currentCode) {
      this.ui.updateStatus('⚠️ Please upload a code file first');
      return;
    }

    this.ui.updateStatus('🔍 Analyzing code...');
    this.scene.setStatusLight('#ffaa00');

    try {
      let bugs;
      
      if (this.analysisMode === 'ai') {
        // AI Analysis via API
        bugs = await this.analyzer.analyzeWithAI(this.currentCode, this.currentLanguage);
      } else {
        // Static Analysis
        bugs = this.analyzer.analyzeStatic(this.currentCode, this.currentLanguage);
      }

      this.displayAnalysisResults(bugs);
      
    } catch (error) {
      console.error('Analysis error:', error);
      this.ui.updateStatus('❌ Analysis failed');
      this.ui.updateMainText(`ERROR\n\n${error.message}`);
      this.scene.setStatusLight('#e74c3c');
    }
  }

  displayAnalysisResults(bugs) {
    const lines = this.currentCode.split('\n').length;
    let report = `ANALYSIS COMPLETE\n\nLanguage: ${this.currentLanguage}\nLines: ${lines}\nMode: ${this.analysisMode}\n\n`;
    
    if (bugs.length === 0) {
      report += '✓ No obvious issues detected!\n\nSuggestions:\n• Code structure looks good\n• Consider adding comments\n• Review edge cases';
      this.scene.setStatusLight('#00ff88');
    } else {
      report += `⚠️ Found ${bugs.length} potential issue(s):\n\n`;
      bugs.forEach((bug, i) => {
        report += `${i + 1}. ${bug.type}\n   Line ${bug.line}: ${bug.message}\n\n`;
      });
      this.scene.setStatusLight('#e74c3c');
    }
    
    this.ui.updateMainText(report);
    this.ui.updateStatus(`✓ Analysis complete - ${bugs.length} issue(s) found`);
    
    // Store bugs for visualization
    this.currentBugs = bugs;
  }

  visualizeCode() {
    if (!this.currentCode) {
      this.ui.updateStatus('⚠️ Please upload a code file first');
      return;
    }

    this.ui.updateStatus('📊 Generating 3D visualization...');
    
    const lines = this.currentCode.split('\n');
    const bugs = this.currentBugs || [];
    
    this.scene.createVisualization(lines, bugs);
    
    this.ui.updateStatus('✓ Visualization generated');
    this.ui.updateMainText(
      `3D CODE FLOW\n\nNodes: ${Math.min(10, lines.length)}\n\nGreen nodes: Normal execution\nRed nodes: Potential issues\n\nClick nodes to inspect details`
    );
  }

  handleNodeClick(element) {
    const text = element.querySelector('a-text');
    if (text) {
      const lineNum = parseInt(text.getAttribute('value').replace('L', ''));
      const lines = this.currentCode.split('\n');
      const lineCode = lines[lineNum - 1] || 'N/A';
      const bug = (this.currentBugs || []).find(b => b.line === lineNum);
      
      let info = `LINE ${lineNum} DETAILS\n\n${lineCode}\n\n`;
      if (bug) {
        info += `⚠️ ${bug.type}\n${bug.message}`;
      } else {
        info += '✓ No issues detected';
      }
      
      this.ui.updateMainText(info);
    }
  }

  clearSession() {
    this.currentCode = '';
    this.currentBugs = [];
    
    this.scene.clearVisualization();
    this.ui.updateMainText('Upload a code file to begin analysis...');
    this.ui.updateStatus('Ready to debug...');
    this.scene.setStatusLight('#00ff88');
    
    document.getElementById('fileInput').value = '';
  }
}

// Initialize the application
window.addEventListener('DOMContentLoaded', () => {
  new DebugAssistant();
});