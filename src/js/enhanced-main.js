// src/js/enhanced-main.js

import CodeBERTAnalyzer from './codeBertAnalyzer.js';
import ExecutionEngine from './executionEngine.js';
import VRFlowVisualizer from './vrFlowVisualizer.js';
import VoiceController from './voiceController.js';

class VRDebugAssistant {
  constructor() {
    this.currentCode = '';
    this.currentLanguage = 'javascript';
    this.codeBertAnalyzer = new CodeBERTAnalyzer();
    this.executionEngine = new ExecutionEngine();
    this.vrVisualizer = new VRFlowVisualizer(document.querySelector('a-scene'));
    this.voiceController = new VoiceController();
    this.executionPanel = null;
    this.breakpoints = new Set();
    this.isExecutionPaused = false;
    this.currentExecutionStep = 0;
  }

  async initialize() {
    console.log('Initializing VR Debug Assistant...');

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

    // Setup UI event listeners
    this.setupEventListeners();

    // Setup voice command handlers
    this.setupVoiceCommands();

    // Setup VR button handlers
    this.setupVRButtons();

    // Setup VR scene interactions
    this.setupVRInteractions();

    // Initialize grid
    this.createGridHelper();

    this.updateStatus('System ready. Upload a file to begin.');
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

    // Execution control buttons
    const stepBtn = document.getElementById('stepBtn');
    stepBtn?.addEventListener('click', () => this.executeNextStep());

    const continueBtn = document.getElementById('continueBtn');
    continueBtn?.addEventListener('click', () => this.continueExecution());
  }

  setupVoiceCommands() {
    this.voiceController.registerHandler('analyze', () => this.analyzeCode());
    this.voiceController.registerHandler('visualize', () => this.visualizeCode());
    this.voiceController.registerHandler('execute', () => this.executeCode());
    this.voiceController.registerHandler('clear', () => this.clearSession());
    this.voiceController.registerHandler('show variables', () => this.showVariables());
    this.voiceController.registerHandler('next step', () => this.executeNextStep());
    this.voiceController.registerHandler('continue', () => this.continueExecution());
    
    this.voiceController.registerHandler('breakpoint', (transcript) => {
      // Extract line number from transcript
      const match = transcript.match(/\d+/);
      if (match) {
        const lineNum = parseInt(match[0]);
        this.toggleBreakpoint(lineNum);
      } else {
        this.voiceController.speak('Please specify a line number for the breakpoint');
      }
    });
  }

  setupVRButtons() {
    // VR Analyze button
    const vrAnalyzeBtn = document.getElementById('vrAnalyzeBtn');
    vrAnalyzeBtn?.addEventListener('click', () => this.analyzeCode());

    // VR Visualize button
    const vrVisualizeBtn = document.getElementById('vrVisualizeBtn');
    vrVisualizeBtn?.addEventListener('click', () => this.visualizeCode());

    // VR Execute button
    const vrExecuteBtn = document.getElementById('vrExecuteBtn');
    vrExecuteBtn?.addEventListener('click', () => this.executeCode());

    // VR Voice button
    const vrVoiceBtn = document.getElementById('vrVoiceBtn');
    vrVoiceBtn?.addEventListener('click', () => this.toggleVoiceControl());

    // VR Clear button
    const vrClearBtn = document.getElementById('vrClearBtn');
    vrClearBtn?.addEventListener('click', () => this.clearSession());
  }

  setupVRInteractions() {
    // Handle node clicks in VR
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    scene.addEventListener('loaded', () => {
      console.log('VR scene loaded');
    });
  }

  createGridHelper() {
    const gridContainer = document.getElementById('grid');
    if (!gridContainer) return;

    // Create grid lines
    const gridSize = 50;
    const divisions = 50;
    const step = gridSize / divisions;

    for (let i = 0; i <= divisions; i++) {
      const pos = -gridSize / 2 + i * step;
      
      // Lines along X axis
      const lineX = document.createElement('a-entity');
      lineX.setAttribute('line', {
        start: `${-gridSize/2} 0 ${pos}`,
        end: `${gridSize/2} 0 ${pos}`,
        color: '#1a1a2e',
        opacity: 0.3
      });
      gridContainer.appendChild(lineX);

      // Lines along Z axis
      const lineZ = document.createElement('a-entity');
      lineZ.setAttribute('line', {
        start: `${pos} 0 ${-gridSize/2}`,
        end: `${pos} 0 ${gridSize/2}`,
        color: '#1a1a2e',
        opacity: 0.3
      });
      gridContainer.appendChild(lineZ);
    }
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    this.updateStatus('Loading file...');

    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentCode = e.target.result;
      this.updateStatus(`File loaded: ${file.name} (${this.currentCode.split('\n').length} lines)`);
      
      // Auto-detect language from extension
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

      // Display code in VR
      this.vrVisualizer.visualizeCodeStructure(this.currentCode, this.currentLanguage);
      
      // Update main panel
      this.updateMainPanel(`Code loaded successfully!\n\nFile: ${file.name}\nLanguage: ${this.currentLanguage}\nLines: ${this.currentCode.split('\n').length}\n\nReady for analysis.`);
    };

    reader.readAsText(file);
  }

  async analyzeCode() {
    if (!this.currentCode) {
      this.updateStatus('Please upload a code file first');
      this.voiceController.speak('Please upload a code file first');
      return;
    }

    const mode = document.getElementById('modeSelect')?.value || 'static';
    this.updateStatus(`Analyzing code with ${mode} mode...`);

    try {
      let result;

      if (mode === 'codebert') {
        // Use CodeBERT
        result = await this.codeBertAnalyzer.analyzeCode(this.currentCode, this.currentLanguage);
        const formattedOutput = this.codeBertAnalyzer.formatForVR(result);
        this.updateMainPanel(formattedOutput);
        
        // Visualize issues in VR
        if (result.issues && result.issues.length > 0) {
          this.highlightIssuesInVR(result.issues);
        }

      } else if (mode === 'ai') {
        // Use API
        result = await this.analyzeWithAPI();
      } else {
        // Static analysis
        result = await this.codeBertAnalyzer.analyzeCode(this.currentCode, this.currentLanguage);
        const formattedOutput = this.codeBertAnalyzer.formatForVR(result);
        this.updateMainPanel(formattedOutput);
      }

      this.updateStatus('Analysis complete');
      this.voiceController.speak(`Analysis complete. Found ${result.issues?.length || 0} issues.`);

    } catch (error) {
      console.error('Analysis error:', error);
      this.updateStatus('Analysis failed: ' + error.message);
      this.voiceController.speak('Analysis failed');
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

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      this.updateMainPanel(data.suggestions || 'No suggestions available');
      return data;
    } catch (error) {
      console.error('API analysis failed:', error);
      // Fallback to local analysis
      return await this.codeBertAnalyzer.analyzeCode(this.currentCode, this.currentLanguage);
    }
  }

  visualizeCode() {
    if (!this.currentCode) {
      this.updateStatus('Please upload a code file first');
      return;
    }

    this.updateStatus('Visualizing code flow...');

    // Get execution flow
    this.executionEngine.setCode(this.currentCode, this.currentLanguage);
    const flowData = this.executionEngine.getExecutionFlow();

    // Visualize in VR
    this.vrVisualizer.visualizeExecutionFlow(flowData);

    this.updateStatus('Visualization complete');
    this.updateMainPanel('Code flow visualization active.\n\nClick on nodes to inspect specific lines.\n\nColor coding:\n• Purple: Functions\n• Orange: Conditionals\n• Red: Loops\n• Green: Returns\n• Blue: Assignments\n• Gray: Statements');
  }

  async executeCode() {
    if (!this.currentCode) {
      this.updateStatus('Please upload a code file first');
      return;
    }

    if (this.currentLanguage !== 'javascript') {
      this.updateStatus('Only JavaScript execution is supported in browser');
      this.voiceController.speak('Only JavaScript execution is supported');
      return;
    }

    this.updateStatus('Executing code...');
    this.voiceController.speak('Executing code');

    try {
      this.executionEngine.setCode(this.currentCode, this.currentLanguage);
      
      // Add breakpoints
      this.breakpoints.forEach(bp => {
        this.executionEngine.addBreakpoint(bp);
      });

      const result = await this.executionEngine.execute();

      if (result.error) {
        this.updateMainPanel(`EXECUTION ERROR:\n\n${result.error}\n\n${result.stack || ''}`);
        
        // Visualize error timeline
        const errorTimeline = this.executionEngine.getErrorTimeline();
        this.vrVisualizer.visualizeErrorTimeline(errorTimeline);
        
        this.voiceController.speak('Execution error detected');
      } else {
        this.updateMainPanel(`EXECUTION COMPLETE\n\nSteps: ${result.state.step}\nVariables tracked: ${Object.keys(result.state.variables).length}\n\nResult: ${JSON.stringify(result.result, null, 2)}`);
        
        // Visualize execution flow with execution data
        const flowData = this.executionEngine.getExecutionFlow();
        this.vrVisualizer.visualizeExecutionFlow(flowData);
        
        // Show variable states
        const variableStates = this.executionEngine.getVariableStates();
        this.vrVisualizer.visualizeVariables(variableStates);
        
        // Animate execution
        this.vrVisualizer.animateExecution(result.state.step);
        
        this.voiceController.speak('Execution complete');
      }

      this.updateStatus('Execution finished');

      // Show execution panel
      this.showExecutionPanel(result.state);

    } catch (error) {
      console.error('Execution error:', error);
      this.updateStatus('Execution failed: ' + error.message);
      this.updateMainPanel(`EXECUTION FAILED:\n\n${error.message}\n\n${error.stack}`);
    }
  }

  showExecutionPanel(state) {
    const panel = document.getElementById('execution-panel');
    if (panel) {
      panel.style.display = 'block';
      
      const stepDiv = document.getElementById('execution-step');
      if (stepDiv) {
        stepDiv.textContent = `Step: ${state.step}`;
      }
      
      const varsDiv = document.getElementById('execution-variables');
      if (varsDiv) {
        varsDiv.innerHTML = '<strong>Variables:</strong><br>' +
          Object.entries(state.variables)
            .map(([name, value]) => {
              const displayValue = typeof value === 'object' 
                ? JSON.stringify(value) 
                : String(value);
              return `<div style="margin: 5px 0; padding: 5px; background: #1e1e1e; border-radius: 3px;">
                <span style="color: #00ff88;">${name}:</span> 
                <span style="color: #ffffff;">${displayValue}</span>
              </div>`;
            })
            .join('');
      }

      this.currentExecutionStep = state.step;
    }
  }

  toggleVoiceControl() {
    const voiceStatus = this.voiceController.getStatus();
    const voiceControls = document.getElementById('voiceControls');
    
    if (voiceStatus.isListening) {
      this.voiceController.stop();
      this.updateStatus('Voice control disabled');
      if (voiceControls) voiceControls.style.display = 'none';
    } else {
      const started = this.voiceController.start();
      if (started) {
        this.updateStatus('Voice control enabled - Say "help" for commands');
        if (voiceControls) voiceControls.style.display = 'block';
      } else {
        this.updateStatus('Voice control not supported in this browser');
        alert('Voice recognition is not supported in your browser. Please use Chrome or Edge.');
      }
    }
  }

  clearSession() {
    this.currentCode = '';
    this.breakpoints.clear();
    this.isExecutionPaused = false;
    this.currentExecutionStep = 0;
    
    this.vrVisualizer.clear();
    this.executionEngine.reset();
    
    this.updateMainPanel('Session cleared.\n\nUpload a new file to begin debugging.');
    this.updateStatus('Session cleared');
    
    const panel = document.getElementById('execution-panel');
    if (panel) panel.style.display = 'none';
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
    
    this.voiceController.speak('Session cleared');
  }

  toggleBreakpoint(lineNumber) {
    if (this.breakpoints.has(lineNumber)) {
      this.breakpoints.delete(lineNumber);
      this.executionEngine.removeBreakpoint(lineNumber);
      this.vrVisualizer.removeBreakpointMarker(lineNumber);
      this.updateStatus(`Breakpoint removed at line ${lineNumber}`);
      this.voiceController.speak(`Breakpoint removed at line ${lineNumber}`);
    } else {
      this.breakpoints.add(lineNumber);
      this.executionEngine.addBreakpoint(lineNumber);
      this.vrVisualizer.addBreakpointMarker(lineNumber);
      this.updateStatus(`Breakpoint set at line ${lineNumber}`);
      this.voiceController.speak(`Breakpoint set at line ${lineNumber}`);
    }
  }

  showVariables() {
    const variableStates = this.executionEngine.getVariableStates();
    if (variableStates.length === 0) {
      this.updateMainPanel('No variables tracked yet.\n\nExecute the code first to track variable states.');
      this.voiceController.speak('No variables tracked');
      return;
    }

    this.vrVisualizer.visualizeVariables(variableStates);
    
    let varText = 'VARIABLE STATES:\n\n';
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
    this.voiceController.speak(`Showing ${Object.keys(uniqueVars).length} variables`);
  }

  async executeNextStep() {
    if (!this.currentCode) {
      this.updateStatus('No code to execute');
      return;
    }

    try {
      await this.executionEngine.stepNext();
      const state = this.executionEngine.executionState;
      this.showExecutionPanel(state);
      
      // Update visualization
      const flowData = this.executionEngine.getExecutionFlow();
      this.vrVisualizer.visualizeExecutionFlow(flowData);
      
      this.updateStatus(`Executed step ${state.step}`);
    } catch (error) {
      console.error('Step execution error:', error);
      this.updateStatus('Step execution failed');
    }
  }

  continueExecution() {
    this.isExecutionPaused = false;
    this.executeCode();
  }

  highlightIssuesInVR(issues) {
    // Create visual markers for each issue
    const errorTimeline = issues.map(issue => ({
      line: issue.line,
      type: issue.type,
      message: issue.message,
      step: 0
    }));
    
    this.vrVisualizer.visualizeErrorTimeline(errorTimeline);
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

  // Multi-user support methods
  initMultiUser() {
    // Placeholder for WebRTC or WebSocket connection
    console.log('Multi-user mode not yet implemented');
  }

  addUserAvatar(userId, position) {
    const avatarsContainer = document.getElementById('avatars');
    if (!avatarsContainer) return;

    const avatar = document.createElement('a-entity');
    avatar.setAttribute('id', `avatar-${userId}`);
    avatar.setAttribute('position', position);

    // Create simple avatar
    const head = document.createElement('a-sphere');
    head.setAttribute('radius', '0.2');
    head.setAttribute('color', '#3498db');
    head.setAttribute('position', '0 0.3 0');

    const body = document.createElement('a-cylinder');
    body.setAttribute('radius', '0.15');
    body.setAttribute('height', '0.5');
    body.setAttribute('color', '#2980b9');

    avatar.appendChild(head);
    avatar.appendChild(body);
    avatarsContainer.appendChild(avatar);
  }

  removeUserAvatar(userId) {
    const avatar = document.getElementById(`avatar-${userId}`);
    if (avatar) {
      avatar.parentNode.removeChild(avatar);
    }
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  const assistant = new VRDebugAssistant();
  await assistant.initialize();
  
  // Make assistant globally accessible for debugging
  window.vrDebugAssistant = assistant;
});

export default VRDebugAssistant;