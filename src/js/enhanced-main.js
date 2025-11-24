// src/js/enhanced-main.js - Complete Integration

import CodeBERTAnalyzer from './codeBertAnalyzer.js';
import ExecutionEngine from './executionEngine.js';
import VRFlowVisualizer from './vrFlowVisualizer.js';
import VoiceController from './voiceController.js';
import VRNavigationController from './vrNavigationController.js';
import CodeEditorVR from './codeEditorVR.js';
import AIConversationSystem from './aiConversationSystem.js';
import LiveExecutionVisualizer from './liveExecutionVisualizer.js';

class VRDebugAssistant {
  constructor() {
    this.currentCode = '';
    this.currentLanguage = 'javascript';
    this.codeBertAnalyzer = new CodeBERTAnalyzer();
    this.executionEngine = new ExecutionEngine();
    this.scene = null;
    this.vrVisualizer = null;
    this.voiceController = new VoiceController();
    this.vrNavigation = null;
    this.codeEditor = null;
    this.aiConversation = null;
    this.liveExecutionViz = null;
    this.breakpoints = new Set();
    this.currentAnalysis = null;
  }

  async initialize() {
    console.log('🚀 Initializing VR Debug Assistant with Enhanced Features...');

    // Get scene reference
    this.scene = document.querySelector('a-scene');
    if (!this.scene) {
      console.error('A-Frame scene not found');
      return false;
    }

    // Wait for scene to load
    if (!this.scene.hasLoaded) {
      await new Promise(resolve => {
        this.scene.addEventListener('loaded', resolve);
      });
    }

    // Initialize all components
    this.vrVisualizer = new VRFlowVisualizer(this.scene);
    this.vrNavigation = new VRNavigationController(this.scene);
    this.codeEditor = new CodeEditorVR(this.scene);
    this.aiConversation = new AIConversationSystem(this.scene);
    this.liveExecutionViz = new LiveExecutionVisualizer(this.scene);

    // Initialize components
    await this.vrNavigation.initialize();
    await this.codeEditor.initialize();
    await this.aiConversation.initialize();
    await this.liveExecutionViz.initialize();

    // Initialize CodeBERT
    const modelStatus = document.getElementById('modelStatus');
    try {
      await this.codeBertAnalyzer.initialize();
      if (modelStatus) {
        modelStatus.textContent = 'CodeBERT Ready ✓';
        modelStatus.style.color = '#00ff88';
      }
    } catch (error) {
      console.error('CodeBERT initialization failed:', error);
      if (modelStatus) {
        modelStatus.textContent = 'CodeBERT Failed (using fallback)';
        modelStatus.style.color = '#e74c3c';
      }
    }

    // Setup all event listeners
    this.setupEventListeners();
    this.setupVoiceCommands();
    this.setupVRButtons();
    this.setupSceneEvents();

    this.updateStatus('✓ System ready. Upload a file to begin debugging.');
    this.aiConversation.speak('VR Debugging Assistant initialized. How can I help you today?');

    return true;
  }

  setupEventListeners() {
    // File upload
    const fileInput = document.getElementById('fileInput');
    fileInput?.addEventListener('change', (e) => this.handleFileUpload(e));

    // Language selection
    const langSelect = document.getElementById('langSelect');
    langSelect?.addEventListener('change', (e) => {
      this.currentLanguage = e.target.value;
    });

    // Analyze button
    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn?.addEventListener('click', () => this.analyzeCode());

    // Visualize button
    const visualizeBtn = document.getElementById('visualizeBtn');
    visualizeBtn?.addEventListener('click', () => this.visualizeCode());

    // Execute button
    const executeBtn = document.getElementById('executeBtn');
    executeBtn?.addEventListener('click', () => this.executeCode());

    // Voice button
    const voiceBtn = document.getElementById('voiceBtn');
    voiceBtn?.addEventListener('click', () => this.toggleVoiceControl());

    // Clear button
    const clearBtn = document.getElementById('clearBtn');
    clearBtn?.addEventListener('click', () => this.clearSession());

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 'a':
            e.preventDefault();
            this.analyzeCode();
            break;
          case 'e':
            e.preventDefault();
            this.executeCode();
            break;
          case 'v':
            e.preventDefault();
            this.visualizeCode();
            break;
        }
      }
    });
  }

  setupVoiceCommands() {
    this.voiceController.registerHandler('analyze', () => this.analyzeCode());
    this.voiceController.registerHandler('visualize', () => this.visualizeCode());
    this.voiceController.registerHandler('execute', () => this.executeCode());
    this.voiceController.registerHandler('clear', () => this.clearSession());
    this.voiceController.registerHandler('show variables', () => this.showVariables());
    this.voiceController.registerHandler('next step', () => this.liveExecutionViz.stepForward());
    this.voiceController.registerHandler('continue', () => this.liveExecutionViz.play());
    
    this.voiceController.registerHandler('breakpoint', (transcript) => {
      const match = transcript.match(/\d+/);
      if (match) {
        const lineNum = parseInt(match[0]);
        this.toggleBreakpoint(lineNum);
      }
    });

    // AI conversation command
    this.voiceController.registerHandler('ask', (transcript) => {
      const question = transcript.replace(/^ask\s*/i, '');
      this.aiConversation.askAI(question);
    });
  }

  setupVRButtons() {
    const vrAnalyzeBtn = document.getElementById('vrAnalyzeBtn');
    vrAnalyzeBtn?.addEventListener('click', () => this.analyzeCode());

    const vrVisualizeBtn = document.getElementById('vrVisualizeBtn');
    vrVisualizeBtn?.addEventListener('click', () => this.visualizeCode());

    const vrExecuteBtn = document.getElementById('vrExecuteBtn');
    vrExecuteBtn?.addEventListener('click', () => this.executeCode());

    const vrVoiceBtn = document.getElementById('vrVoiceBtn');
    vrVoiceBtn?.addEventListener('click', () => this.toggleVoiceControl());

    const vrClearBtn = document.getElementById('vrClearBtn');
    vrClearBtn?.addEventListener('click', () => this.clearSession());
  }

  setupSceneEvents() {
    // Listen for execution events
    this.scene.addEventListener('execution-step', (evt) => {
      const { step, data } = evt.detail;
      
      // Update code editor highlight
      if (data.line) {
        this.codeEditor.highlightLine(data.line);
      }

      // Update AI context
      this.aiConversation.updateContext({
        currentLine: data.line,
        currentStep: step
      });
    });

    this.scene.addEventListener('execution-error', (evt) => {
      const error = evt.detail;
      this.aiConversation.speak(`Error detected at line ${error.line}: ${error.error}`);
      
      // Show suggestion in code editor
      this.codeEditor.showSuggestion(
        error.line,
        'Click to ask AI for help fixing this error',
        'error'
      );
    });

    this.scene.addEventListener('highlight-line', (evt) => {
      const { line } = evt.detail;
      this.codeEditor.highlightLine(line);
    });
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    this.updateStatus('📂 Loading file...');
    this.aiConversation.speak('Loading file');

    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentCode = e.target.result;
      const lineCount = this.currentCode.split('\n').length;
      
      this.updateStatus(`✓ File loaded: ${file.name} (${lineCount} lines)`);
      
      // Auto-detect language
      const ext = file.name.split('.').pop();
      const langMap = {
        'js': 'javascript',
        'py': 'python',
        'ts': 'typescript',
        'java': 'java',
        'cs': 'csharp',
        'cpp': 'cpp',
        'c': 'cpp'
      };
      
      if (langMap[ext]) {
        this.currentLanguage = langMap[ext];
        const langSelect = document.getElementById('langSelect');
        if (langSelect) langSelect.value = langMap[ext];
      }

      // Display in VR code editor
      this.codeEditor.displayCode(this.currentCode, this.currentLanguage);
      
      // Update AI context
      this.aiConversation.updateContext({
        code: this.currentCode,
        language: this.currentLanguage
      });

      // Update main panel
      this.updateMainPanel(`Code loaded: ${file.name}\nLanguage: ${this.currentLanguage}\nLines: ${lineCount}\n\nReady for analysis!`);
      
      this.aiConversation.speak(`Loaded ${file.name} with ${lineCount} lines. Ready to analyze!`);
    };

    reader.readAsText(file);
  }

  async analyzeCode() {
    if (!this.currentCode) {
      this.updateStatus('⚠️ Please upload a code file first');
      this.aiConversation.speak('Please upload a code file first');
      return;
    }

    const mode = document.getElementById('modeSelect')?.value || 'static';
    this.updateStatus(`🔍 Analyzing code with ${mode} mode...`);
    this.aiConversation.speak('Analyzing your code');

    try {
      let result;

      if (mode === 'codebert') {
        result = await this.codeBertAnalyzer.analyzeCode(this.currentCode, this.currentLanguage);
        const formattedOutput = this.codeBertAnalyzer.formatForVR(result);
        this.updateMainPanel(formattedOutput);
        
        if (result.issues && result.issues.length > 0) {
          this.highlightIssuesInVR(result.issues);
          
          // Show suggestions in editor
          result.issues.slice(0, 3).forEach(issue => {
            this.codeEditor.showSuggestion(issue.line, issue.message, issue.type);
          });
        }

      } else if (mode === 'ai') {
        result = await this.analyzeWithAPI();
      } else {
        result = await this.codeBertAnalyzer.analyzeCode(this.currentCode, this.currentLanguage);
        const formattedOutput = this.codeBertAnalyzer.formatForVR(result);
        this.updateMainPanel(formattedOutput);
      }

      this.currentAnalysis = result;

      // Update AI conversation context
      this.aiConversation.updateContext({
        currentIssues: result.issues || []
      });

      this.updateStatus(`✓ Analysis complete: ${result.issues?.length || 0} issues found`);
      this.aiConversation.speak(`Analysis complete. Found ${result.issues?.length || 0} issues.`);

      // Offer to explain critical issues
      const criticalIssues = result.issues?.filter(i => i.severity === 'critical') || [];
      if (criticalIssues.length > 0) {
        setTimeout(() => {
          this.aiConversation.speak(`I found ${criticalIssues.length} critical issues. Would you like me to explain them?`);
        }, 2000);
      }

    } catch (error) {
      console.error('Analysis error:', error);
      this.updateStatus('❌ Analysis failed: ' + error.message);
      this.aiConversation.speak('Analysis failed. Please try again.');
    }
  }

  async analyzeWithAPI() {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: this.currentCode,
          language: this.currentLanguage
        })
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      this.updateMainPanel(data.suggestions || 'No suggestions available');
      
      return {
        issues: [],
        suggestions: data.suggestions
      };
    } catch (error) {
      console.error('API analysis failed:', error);
      return await this.codeBertAnalyzer.analyzeCode(this.currentCode, this.currentLanguage);
    }
  }

  visualizeCode() {
    if (!this.currentCode) {
      this.updateStatus('⚠️ Please upload a code file first');
      return;
    }

    this.updateStatus('🎨 Visualizing code flow...');
    this.aiConversation.speak('Visualizing code structure');

    this.executionEngine.setCode(this.currentCode, this.currentLanguage);
    const flowData = this.executionEngine.getExecutionFlow();

    this.vrVisualizer.visualizeExecutionFlow(flowData);

    this.updateStatus('✓ Visualization complete');
    this.updateMainPanel('Code flow visualization active.\n\nControls:\n• Click nodes to inspect\n• Q/E to change floors\n• WASD to move\n• Shift+Click to teleport\n\nColor coding:\n• Purple: Functions\n• Orange: Conditionals\n• Red: Loops\n• Green: Returns\n• Blue: Assignments');
  }

  async executeCode() {
    if (!this.currentCode) {
      this.updateStatus('⚠️ Please upload a code file first');
      return;
    }

    if (this.currentLanguage !== 'javascript') {
      this.updateStatus('⚠️ Only JavaScript execution is supported in browser');
      this.aiConversation.speak('Only JavaScript execution is supported');
      return;
    }

    this.updateStatus('▶️ Executing code...');
    this.aiConversation.speak('Executing your code');

    try {
      this.executionEngine.setCode(this.currentCode, this.currentLanguage);
      
      // Add breakpoints
      this.breakpoints.forEach(bp => {
        this.executionEngine.addBreakpoint(bp);
      });

      const result = await this.executionEngine.execute();

      if (result.error) {
        this.updateMainPanel(`❌ EXECUTION ERROR:\n\n${result.error}\n\n${result.stack || ''}`);
        
        const errorTimeline = this.executionEngine.getErrorTimeline();
        this.vrVisualizer.visualizeErrorTimeline(errorTimeline);
        
        this.aiConversation.speak(`Execution error: ${result.error}`);
        
        // Ask AI to explain error
        setTimeout(() => {
          this.aiConversation.askAI(`Explain this error: ${result.error}`);
        }, 2000);
      } else {
        // Set up live execution visualization
        const executionSteps = result.state.executionHistory;
        this.liveExecutionViz.setExecutionSteps(executionSteps);
        
        // Start animated playback
        this.liveExecutionViz.play();

        this.updateMainPanel(`✓ EXECUTION COMPLETE\n\nSteps: ${result.state.step}\nVariables: ${Object.keys(result.state.variables).length}\n\nWatch the live visualization!`);
        
        this.aiConversation.speak('Execution complete. Watch the visualization.');
      }

      this.updateStatus('✓ Execution finished');

    } catch (error) {
      console.error('Execution error:', error);
      this.updateStatus('❌ Execution failed');
      this.updateMainPanel(`EXECUTION FAILED:\n\n${error.message}`);
      this.aiConversation.speak('Execution failed. Check the error message.');
    }
  }

  toggleVoiceControl() {
    const voiceStatus = this.voiceController.getStatus();
    const voiceControls = document.getElementById('voiceControls');
    
    if (voiceStatus.isListening) {
      this.voiceController.stop();
      this.updateStatus('🎤 Voice control disabled');
      if (voiceControls) voiceControls.style.display = 'none';
    } else {
      const started = this.voiceController.start();
      if (started) {
        this.updateStatus('🎤 Voice control enabled');
        if (voiceControls) voiceControls.style.display = 'block';
      } else {
        this.updateStatus('⚠️ Voice control not supported');
        alert('Voice recognition not supported. Please use Chrome or Edge.');
      }
    }
  }

  clearSession() {
    this.currentCode = '';
    this.breakpoints.clear();
    this.currentAnalysis = null;
    
    this.vrVisualizer.clear();
    this.executionEngine.reset();
    this.liveExecutionViz.stop();
    this.codeEditor.clearHighlight();
    this.aiConversation.clearHistory();
    
    this.updateMainPanel('Session cleared.\n\nUpload a new file to begin debugging.');
    this.updateStatus('✓ Session cleared');
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
    
    this.aiConversation.speak('Session cleared. Ready for new code.');
  }

  toggleBreakpoint(lineNumber) {
    if (this.breakpoints.has(lineNumber)) {
      this.breakpoints.delete(lineNumber);
      this.executionEngine.removeBreakpoint(lineNumber);
      this.vrVisualizer.removeBreakpointMarker(lineNumber);
      this.updateStatus(`🔴 Breakpoint removed at line ${lineNumber}`);
      this.voiceController.speak(`Breakpoint removed at line ${lineNumber}`);
    } else {
      this.breakpoints.add(lineNumber);
      this.executionEngine.addBreakpoint(lineNumber);
      this.vrVisualizer.addBreakpointMarker(lineNumber);
      this.updateStatus(`🔴 Breakpoint set at line ${lineNumber}`);
      this.voiceController.speak(`Breakpoint set at line ${lineNumber}`);
      
      // Show in code editor
      this.codeEditor.showSuggestion(
        lineNumber,
        'Breakpoint set - execution will pause here',
        'hint'
      );
    }
  }

  showVariables() {
    const variableStates = this.executionEngine.getVariableStates();
    if (variableStates.length === 0) {
      this.updateMainPanel('No variables tracked yet.\n\nExecute the code first to track variable states.');
      this.aiConversation.speak('No variables tracked. Execute the code first.');
      return;
    }

    this.vrVisualizer.visualizeVariables(variableStates);
    
    let varText = '📊 VARIABLE STATES:\n\n';
    const uniqueVars = {};
    variableStates.forEach(state => {
      uniqueVars[state.variable] = state.value;
    });
    
    Object.entries(uniqueVars).forEach(([name, value]) => {
      const displayValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value);
      varText += `${name} = ${displayValue}\n`;
    });
    
    this.updateMainPanel(varText);
    this.aiConversation.speak(`Showing ${Object.keys(uniqueVars).length} variables`);
  }

  highlightIssuesInVR(issues) {
    const errorTimeline = issues.map(issue => ({
      line: issue.line,
      type: issue.type,
      message: issue.message,
      severity: issue.severity,
      step: 0
    }));
    
    this.vrVisualizer.visualizeErrorTimeline(errorTimeline);

    // Highlight critical issues in code editor
    const criticalIssues = issues.filter(i => 
      i.severity === 'critical' || i.severity === 'high'
    );

    criticalIssues.slice(0, 5).forEach((issue, idx) => {
      setTimeout(() => {
        this.codeEditor.highlightLine(issue.line);
      }, idx * 500);
    });
  }

  updateMainPanel(text) {
    const mainText = document.getElementById('mainText');
    if (mainText) {
      mainText.setAttribute('value', text);
    }
  }

  updateStatus(message) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.textContent = message;
    }
    console.log('Status:', message);
  }

  // Context-aware suggestions
  async getSuggestionForLine(lineNumber) {
    const lines = this.currentCode.split('\n');
    const line = lines[lineNumber - 1];
    
    if (!line) return null;

    // Check if there's an issue at this line
    const issue = this.currentAnalysis?.issues?.find(i => i.line === lineNumber);
    
    if (issue) {
      // Ask AI for fix suggestion
      const response = await this.aiConversation.askAI(
        `How do I fix this issue at line ${lineNumber}: ${issue.message}`
      );
      
      return {
        type: 'fix',
        message: response,
        issue: issue
      };
    }

    // General code explanation
    const response = await this.aiConversation.askAI(
      `Explain what this line of code does: ${line}`
    );
    
    return {
      type: 'explanation',
      message: response
    };
  }

  // Export session data
  exportSession() {
    const sessionData = {
      timestamp: new Date().toISOString(),
      code: this.currentCode,
      language: this.currentLanguage,
      analysis: this.currentAnalysis,
      breakpoints: Array.from(this.breakpoints),
      conversation: this.aiConversation.exportHistory(),
      executionTrace: this.liveExecutionViz.exportExecutionTrace(),
      navigationState: this.vrNavigation.getNavigationState()
    };

    // Download as JSON
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.updateStatus('✓ Session exported');
    this.aiConversation.speak('Session exported successfully');
  }

  // Load session data
  async loadSession(sessionData) {
    try {
      this.currentCode = sessionData.code;
      this.currentLanguage = sessionData.language;
      this.currentAnalysis = sessionData.analysis;
      
      // Restore breakpoints
      sessionData.breakpoints.forEach(bp => {
        this.toggleBreakpoint(bp);
      });

      // Display code
      this.codeEditor.displayCode(this.currentCode, this.currentLanguage);

      // Update AI context
      this.aiConversation.updateContext({
        code: this.currentCode,
        language: this.currentLanguage,
        currentIssues: sessionData.analysis?.issues || []
      });

      this.updateStatus('✓ Session loaded');
      this.aiConversation.speak('Session loaded successfully');
    } catch (error) {
      console.error('Failed to load session:', error);
      this.updateStatus('❌ Failed to load session');
    }
  }

  // Performance metrics
  getPerformanceMetrics() {
    const analysis = this.executionEngine.analyzePerformance();
    
    let report = '📊 PERFORMANCE ANALYSIS:\n\n';
    report += `Total Steps: ${analysis.totalSteps}\n`;
    report += `Average Steps per Line: ${analysis.avgStepsPerLine.toFixed(2)}\n\n`;
    
    if (analysis.hotspots.length > 0) {
      report += 'Performance Hotspots:\n';
      analysis.hotspots.forEach((hotspot, idx) => {
        report += `${idx + 1}. Line ${hotspot.line}: ${hotspot.executionCount} executions\n`;
        report += `   ${hotspot.code}\n\n`;
      });
    }

    this.updateMainPanel(report);
    this.aiConversation.speak(`Performance analysis complete. Found ${analysis.hotspots.length} hotspots.`);
  }

  // Interactive tutorial
  startTutorial() {
    const steps = [
      {
        message: 'Welcome to VR Debugging Assistant! Let me show you around.',
        action: () => this.vrNavigation.resetPosition()
      },
      {
        message: 'This is the code editor. Upload a file to see your code here.',
        action: () => this.codeEditor.highlightLine(1)
      },
      {
        message: 'Use Q and E keys to navigate up and down through floors of code.',
        action: () => {}
      },
      {
        message: 'Click the Analyze button to find bugs and issues in your code.',
        action: () => {}
      },
      {
        message: 'The Execute button runs your code with live visualization.',
        action: () => {}
      },
      {
        message: 'You can ask me questions anytime using voice commands. Just say Ask followed by your question.',
        action: () => {}
      },
      {
        message: 'Tutorial complete! Ready to start debugging?',
        action: () => {}
      }
    ];

    let currentStep = 0;

    const nextStep = () => {
      if (currentStep >= steps.length) return;

      const step = steps[currentStep];
      this.aiConversation.speak(step.message);
      step.action();

      currentStep++;
      
      if (currentStep < steps.length) {
        setTimeout(nextStep, 5000);
      }
    };

    nextStep();
  }

  // Keyboard shortcuts help
  showKeyboardShortcuts() {
    const shortcuts = `⌨️ KEYBOARD SHORTCUTS:

Navigation:
• WASD - Move around
• Q/E - Move up/down floors
• R - Reset position
• T - Toggle teleport mode
• Shift+Click - Teleport to location

Code Control:
• Ctrl+A - Analyze code
• Ctrl+E - Execute code
• Ctrl+V - Visualize flow

Execution:
• Space - Play/Pause
• → - Step forward
• ← - Step backward
• PageUp/Down - Scroll code

General:
• H - Show this help
• Esc - Cancel operation`;

    this.updateMainPanel(shortcuts);
  }

  // Debug statistics
  getDebugStatistics() {
    const stats = {
      linesAnalyzed: this.currentCode.split('\n').length,
      issuesFound: this.currentAnalysis?.issues?.length || 0,
      criticalIssues: this.currentAnalysis?.issues?.filter(i => i.severity === 'critical').length || 0,
      breakpointsSet: this.breakpoints.size,
      executionState: this.liveExecutionViz.getExecutionState(),
      conversationMessages: this.aiConversation.conversationHistory.length
    };

    return stats;
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎮 Starting VR Debug Assistant...');
  
  const assistant = new VRDebugAssistant();
  await assistant.initialize();
  
  // Make assistant globally accessible
  window.vrDebugAssistant = assistant;

  // Add keyboard shortcut for help
  window.addEventListener('keydown', (e) => {
    if (e.key === 'h' && !e.ctrlKey && !e.metaKey) {
      assistant.showKeyboardShortcuts();
    }
    if (e.key === 'F1') {
      e.preventDefault();
      assistant.startTutorial();
    }
  });

  // Add export/import functionality
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault();
        assistant.exportSession();
      }
    }
  });

  console.log('✅ VR Debug Assistant ready!');
  console.log('💡 Press H for keyboard shortcuts');
  console.log('💡 Press F1 for tutorial');
});

export default VRDebugAssistant;