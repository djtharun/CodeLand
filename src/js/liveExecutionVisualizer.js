// src/js/liveExecutionVisualizer.js

class LiveExecutionVisualizer {
  constructor(scene) {
    this.scene = scene;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentStep = 0;
    this.executionSteps = [];
    this.stepDelay = 1000; // ms per step
    this.executionPointer = null;
    this.variableDisplay = null;
    this.callStackDisplay = null;
    this.executionTimer = null;
  }

  initialize() {
    this.createExecutionPointer();
    this.createVariableDisplay();
    this.createCallStackDisplay();
    this.createExecutionControls();
    this.createErrorTimeline();
    return true;
  }

  createExecutionPointer() {
    // Visual pointer that moves through code
    this.executionPointer = document.createElement('a-entity');
    this.executionPointer.setAttribute('id', 'executionPointer');
    this.executionPointer.setAttribute('visible', 'false');

    // Arrow
    const arrow = document.createElement('a-cone');
    arrow.setAttribute('radius-bottom', '0.3');
    arrow.setAttribute('radius-top', '0');
    arrow.setAttribute('height', '0.5');
    arrow.setAttribute('rotation', '0 0 -90');
    arrow.setAttribute('color', '#ffaa00');
    arrow.setAttribute('metalness', '0.5');

    // Glow effect
    const glow = document.createElement('a-sphere');
    glow.setAttribute('radius', '0.2');
    glow.setAttribute('color', '#ffaa00');
    glow.setAttribute('opacity', '0.6');
    glow.setAttribute('shader', 'flat');
    
    // Pulsing animation
    glow.setAttribute('animation', {
      property: 'scale',
      from: '1 1 1',
      to: '1.5 1.5 1.5',
      dur: 500,
      dir: 'alternate',
      loop: true
    });

    // Trail effect
    const trail = document.createElement('a-cylinder');
    trail.setAttribute('radius', '0.05');
    trail.setAttribute('height', '1');
    trail.setAttribute('rotation', '0 0 90');
    trail.setAttribute('position', '-0.5 0 0');
    trail.setAttribute('color', '#ffaa00');
    trail.setAttribute('opacity', '0.3');

    this.executionPointer.appendChild(arrow);
    this.executionPointer.appendChild(glow);
    this.executionPointer.appendChild(trail);

    this.scene.appendChild(this.executionPointer);
  }

  createVariableDisplay() {
    // Real-time variable state panel
    this.variableDisplay = document.createElement('a-entity');
    this.variableDisplay.setAttribute('id', 'liveVariableDisplay');
    this.variableDisplay.setAttribute('position', '10 3 -8');

    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '5');
    bg.setAttribute('height', '7');
    bg.setAttribute('color', '#1e1e1e');
    bg.setAttribute('opacity', '0.95');

    const border = document.createElement('a-plane');
    border.setAttribute('width', '5.1');
    border.setAttribute('height', '7.1');
    border.setAttribute('color', '#00ff88');
    border.setAttribute('opacity', '0.3');
    border.setAttribute('position', '0 0 -0.01');

    const title = document.createElement('a-text');
    title.setAttribute('value', '📊 LIVE VARIABLES');
    title.setAttribute('align', 'center');
    title.setAttribute('position', '0 3.2 0.01');
    title.setAttribute('color', '#00ff88');
    title.setAttribute('width', '4');

    const content = document.createElement('a-entity');
    content.setAttribute('id', 'variableContent');
    content.setAttribute('position', '0 2.5 0.01');

    this.variableDisplay.appendChild(border);
    this.variableDisplay.appendChild(bg);
    this.variableDisplay.appendChild(title);
    this.variableDisplay.appendChild(content);

    this.scene.appendChild(this.variableDisplay);
  }

  createCallStackDisplay() {
    // Function call stack visualization
    this.callStackDisplay = document.createElement('a-entity');
    this.callStackDisplay.setAttribute('id', 'callStackDisplay');
    this.callStackDisplay.setAttribute('position', '10 -2 -8');

    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '5');
    bg.setAttribute('height', '4');
    bg.setAttribute('color', '#1e1e1e');
    bg.setAttribute('opacity', '0.95');

    const title = document.createElement('a-text');
    title.setAttribute('value', '📚 CALL STACK');
    title.setAttribute('align', 'center');
    title.setAttribute('position', '0 1.7 0.01');
    title.setAttribute('color', '#3498db');
    title.setAttribute('width', '4');

    const content = document.createElement('a-entity');
    content.setAttribute('id', 'callStackContent');
    content.setAttribute('position', '0 1.2 0.01');

    this.callStackDisplay.appendChild(bg);
    this.callStackDisplay.appendChild(title);
    this.callStackDisplay.appendChild(content);

    this.scene.appendChild(this.callStackDisplay);
  }

  createExecutionControls() {
    const controls = document.createElement('a-entity');
    controls.setAttribute('position', '0 -1 -3');

    // Play button
    const playBtn = this.createControlBtn('▶', '-2 0 0', '#00ff88', () => this.play());
    controls.appendChild(playBtn);

    // Pause button
    const pauseBtn = this.createControlBtn('⏸', '-1 0 0', '#f39c12', () => this.pause());
    controls.appendChild(pauseBtn);

    // Step forward button
    const stepBtn = this.createControlBtn('⏭', '0 0 0', '#3498db', () => this.stepForward());
    controls.appendChild(stepBtn);

    // Step backward button
    const backBtn = this.createControlBtn('⏮', '1 0 0', '#9b59b6', () => this.stepBackward());
    controls.appendChild(backBtn);

    // Stop button
    const stopBtn = this.createControlBtn('⏹', '2 0 0', '#e74c3c', () => this.stop());
    controls.appendChild(stopBtn);

    // Speed controls
    const speedDisplay = document.createElement('a-text');
    speedDisplay.setAttribute('id', 'speedDisplay');
    speedDisplay.setAttribute('value', `Speed: ${this.stepDelay}ms`);
    speedDisplay.setAttribute('align', 'center');
    speedDisplay.setAttribute('position', '0 -0.7 0');
    speedDisplay.setAttribute('color', '#ffffff');
    speedDisplay.setAttribute('width', '3');
    controls.appendChild(speedDisplay);

    const fasterBtn = this.createControlBtn('⏩', '-0.5 -1.2 0', '#00ff88', () => this.adjustSpeed(-200));
    const slowerBtn = this.createControlBtn('⏪', '0.5 -1.2 0', '#00ff88', () => this.adjustSpeed(200));
    controls.appendChild(fasterBtn);
    controls.appendChild(slowerBtn);

    this.scene.appendChild(controls);
  }

  createControlBtn(icon, position, color, onClick) {
    const btn = document.createElement('a-box');
    btn.setAttribute('position', position);
    btn.setAttribute('width', '0.6');
    btn.setAttribute('height', '0.6');
    btn.setAttribute('depth', '0.2');
    btn.setAttribute('color', color);
    btn.setAttribute('opacity', '0.9');
    btn.setAttribute('class', 'clickable');

    const text = document.createElement('a-text');
    text.setAttribute('value', icon);
    text.setAttribute('align', 'center');
    text.setAttribute('position', '0 0 0.11');
    text.setAttribute('color', '#ffffff');
    text.setAttribute('width', '0.8');

    btn.appendChild(text);
    btn.addEventListener('click', onClick);

    // Hover effect
    btn.addEventListener('mouseenter', () => {
      btn.setAttribute('scale', '1.1 1.1 1.1');
    });
    btn.addEventListener('mouseleave', () => {
      btn.setAttribute('scale', '1 1 1');
    });

    return btn;
  }

  createErrorTimeline() {
    // Visual timeline showing errors
    const timeline = document.createElement('a-entity');
    timeline.setAttribute('id', 'errorTimelineViz');
    timeline.setAttribute('position', '0 -3 -12');

    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '20');
    bg.setAttribute('height', '2');
    bg.setAttribute('color', '#0f1419');
    bg.setAttribute('opacity', '0.9');

    const title = document.createElement('a-text');
    title.setAttribute('value', '⏱️ EXECUTION TIMELINE');
    title.setAttribute('align', 'center');
    title.setAttribute('position', '0 0.8 0.01');
    title.setAttribute('color', '#ffffff');
    title.setAttribute('width', '8');

    const timelineBar = document.createElement('a-entity');
    timelineBar.setAttribute('id', 'timelineBar');
    timelineBar.setAttribute('position', '0 0 0.01');

    timeline.appendChild(bg);
    timeline.appendChild(title);
    timeline.appendChild(timelineBar);

    this.scene.appendChild(timeline);
  }

  setExecutionSteps(steps) {
    this.executionSteps = steps;
    this.currentStep = 0;
    this.renderTimeline();
  }

  play() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.isPaused = false;
    this.executionPointer.setAttribute('visible', 'true');

    this.executeNextStep();
  }

  pause() {
    this.isPaused = true;
    this.isPlaying = false;
    
    if (this.executionTimer) {
      clearTimeout(this.executionTimer);
    }
  }

  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentStep = 0;
    
    if (this.executionTimer) {
      clearTimeout(this.executionTimer);
    }

    this.executionPointer.setAttribute('visible', 'false');
    this.clearDisplays();
  }

  stepForward() {
    if (this.currentStep < this.executionSteps.length - 1) {
      this.currentStep++;
      this.executeCurrentStep();
    }
  }

  stepBackward() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.executeCurrentStep();
    }
  }

  adjustSpeed(delta) {
    this.stepDelay = Math.max(100, Math.min(5000, this.stepDelay + delta));
    const speedDisplay = document.getElementById('speedDisplay');
    if (speedDisplay) {
      speedDisplay.setAttribute('value', `Speed: ${this.stepDelay}ms`);
    }
  }

  executeNextStep() {
    if (!this.isPlaying || this.isPaused) return;

    if (this.currentStep >= this.executionSteps.length) {
      this.stop();
      return;
    }

    this.executeCurrentStep();

    this.executionTimer = setTimeout(() => {
      this.currentStep++;
      this.executeNextStep();
    }, this.stepDelay);
  }

  executeCurrentStep() {
    const step = this.executionSteps[this.currentStep];
    if (!step) return;

    // Update execution pointer position
    this.movePointerToLine(step.line);

    // Update displays based on step type
    switch (step.type) {
      case 'line':
        this.highlightLine(step.line);
        break;
      case 'variable':
        this.updateVariable(step.name, step.value, step.line);
        break;
      case 'function-call':
        this.pushToCallStack(step.function, step.line);
        break;
      case 'function-return':
        this.popFromCallStack();
        break;
      case 'error':
        this.showError(step);
        break;
      case 'console':
        this.showConsoleOutput(step.output, step.line);
        break;
    }

    // Update timeline progress
    this.updateTimelineProgress();

    // Emit event for other components
    this.scene.emit('execution-step', {
      step: this.currentStep,
      data: step
    });
  }

  movePointerToLine(lineNum) {
    // Calculate position based on line number
    // This assumes the code editor is at position (-8, 3, -10)
    const linesPerPage = 25;
    const lineHeight = 0.35;
    const page = Math.floor((lineNum - 1) / linesPerPage);
    const lineOnPage = (lineNum - 1) % linesPerPage;
    
    const x = -9.5;
    const y = 6.5 - (lineOnPage * lineHeight);
    const z = -10;

    // Smooth animation to line
    this.executionPointer.setAttribute('animation', {
      property: 'position',
      to: `${x} ${y} ${z}`,
      dur: 300,
      easing: 'easeOutQuad'
    });

    this.executionPointer.setAttribute('visible', 'true');
  }

  highlightLine(lineNum) {
    // Emit event to highlight line in code editor
    this.scene.emit('highlight-line', { line: lineNum });
  }

  updateVariable(name, value, line) {
    const content = document.getElementById('variableContent');
    if (!content) return;

    // Find existing variable or create new
    let varEntity = content.querySelector(`[data-var="${name}"]`);
    
    if (!varEntity) {
      varEntity = this.createVariableEntity(name, value);
      varEntity.setAttribute('data-var', name);
      content.appendChild(varEntity);
    } else {
      // Update existing variable with animation
      this.animateVariableChange(varEntity, value);
    }

    // Reposition all variables
    this.repositionVariables();
  }

  createVariableEntity(name, value) {
    const entity = document.createElement('a-entity');

    // Background
    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '4.5');
    bg.setAttribute('height', '0.6');
    bg.setAttribute('color', '#2c3e50');
    bg.setAttribute('opacity', '0.8');

    // Variable name
    const nameText = document.createElement('a-text');
    nameText.setAttribute('value', name);
    nameText.setAttribute('align', 'left');
    nameText.setAttribute('position', '-2.1 0.1 0.01');
    nameText.setAttribute('color', '#00ff88');
    nameText.setAttribute('width', '4');

    // Variable value
    const valueText = document.createElement('a-text');
    valueText.setAttribute('data-value', '');
    const displayValue = this.formatValue(value);
    valueText.setAttribute('value', displayValue);
    valueText.setAttribute('align', 'left');
    valueText.setAttribute('position', '-2.1 -0.2 0.01');
    valueText.setAttribute('color', '#ffffff');
    valueText.setAttribute('width', '4');

    entity.appendChild(bg);
    entity.appendChild(nameText);
    entity.appendChild(valueText);

    // Entry animation
    entity.setAttribute('animation', {
      property: 'scale',
      from: '0 0 0',
      to: '1 1 1',
      dur: 300,
      easing: 'easeOutBack'
    });

    return entity;
  }

  animateVariableChange(entity, newValue) {
    const valueText = entity.querySelector('[data-value]');
    if (!valueText) return;

    const bg = entity.querySelector('a-plane');

    // Flash effect
    if (bg) {
      bg.setAttribute('animation', {
        property: 'color',
        from: '#ffaa00',
        to: '#2c3e50',
        dur: 500
      });
    }

    // Update value
    valueText.setAttribute('value', this.formatValue(newValue));
  }

  formatValue(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      return JSON.stringify(value).substring(0, 30) + '...';
    }
    return String(value);
  }

  repositionVariables() {
    const content = document.getElementById('variableContent');
    if (!content) return;

    const variables = Array.from(content.children);
    const yStart = 0;
    const spacing = 0.7;

    variables.forEach((varEntity, idx) => {
      varEntity.setAttribute('position', `0 ${yStart - idx * spacing} 0`);
    });
  }

  pushToCallStack(functionName, line) {
    const content = document.getElementById('callStackContent');
    if (!content) return;

    const stackFrame = document.createElement('a-entity');
    stackFrame.setAttribute('class', 'stack-frame');

    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '4.5');
    bg.setAttribute('height', '0.5');
    bg.setAttribute('color', '#3498db');
    bg.setAttribute('opacity', '0.8');

    const text = document.createElement('a-text');
    text.setAttribute('value', `${functionName}() @ L${line}`);
    text.setAttribute('align', 'center');
    text.setAttribute('position', '0 0 0.01');
    text.setAttribute('color', '#ffffff');
    text.setAttribute('width', '4');

    stackFrame.appendChild(bg);
    stackFrame.appendChild(text);

    // Add to top of stack
    content.insertBefore(stackFrame, content.firstChild);

    // Slide in animation
    stackFrame.setAttribute('animation', {
      property: 'position',
      from: '0 1 0',
      to: '0 0 0',
      dur: 300,
      easing: 'easeOutQuad'
    });

    this.repositionCallStack();
  }

  popFromCallStack() {
    const content = document.getElementById('callStackContent');
    if (!content || !content.firstChild) return;

    const topFrame = content.firstChild;

    // Slide out animation
    topFrame.setAttribute('animation', {
      property: 'position',
      to: '0 1 0',
      dur: 300,
      easing: 'easeInQuad'
    });

    setTimeout(() => {
      if (topFrame.parentNode) {
        topFrame.parentNode.removeChild(topFrame);
        this.repositionCallStack();
      }
    }, 300);
  }

  repositionCallStack() {
    const content = document.getElementById('callStackContent');
    if (!content) return;

    const frames = Array.from(content.querySelectorAll('.stack-frame'));
    const spacing = 0.6;

    frames.forEach((frame, idx) => {
      if (idx > 0) {
        frame.setAttribute('position', `0 ${-idx * spacing} 0`);
      }
    });
  }

  showError(errorStep) {
    // Create error indicator
    const errorEntity = document.createElement('a-entity');
    errorEntity.setAttribute('position', `0 ${2 - this.currentStep * 0.1} -3`);

    const sphere = document.createElement('a-sphere');
    sphere.setAttribute('radius', '0.3');
    sphere.setAttribute('color', '#e74c3c');
    
    // Pulsing error animation
    sphere.setAttribute('animation', {
      property: 'scale',
      from: '1 1 1',
      to: '1.5 1.5 1.5',
      dur: 500,
      dir: 'alternate',
      loop: true
    });

    const errorText = document.createElement('a-text');
    errorText.setAttribute('value', `ERROR: ${errorStep.error}`);
    errorText.setAttribute('align', 'center');
    errorText.setAttribute('position', '0 0.5 0');
    errorText.setAttribute('color', '#ffffff');
    errorText.setAttribute('width', '4');

    errorEntity.appendChild(sphere);
    errorEntity.appendChild(errorText);

    this.scene.appendChild(errorEntity);

    // Pause execution on error
    this.pause();

    // Emit error event
    this.scene.emit('execution-error', errorStep);
  }

  showConsoleOutput(output, line) {
    // Display console output in VR
    const consoleEntity = document.createElement('a-entity');
    consoleEntity.setAttribute('class', 'console-output');
    consoleEntity.setAttribute('position', `0 -4 -8`);

    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '8');
    bg.setAttribute('height', '0.5');
    bg.setAttribute('color', '#000000');
    bg.setAttribute('opacity', '0.9');

    const text = document.createElement('a-text');
    text.setAttribute('value', `> ${output}`);
    text.setAttribute('align', 'left');
    text.setAttribute('position', '-3.9 0 0.01');
    text.setAttribute('color', '#00ff88');
    text.setAttribute('width', '7.5');

    consoleEntity.appendChild(bg);
    consoleEntity.appendChild(text);

    this.scene.appendChild(consoleEntity);

    // Fade out after 3 seconds
    setTimeout(() => {
      consoleEntity.setAttribute('animation', {
        property: 'opacity',
        to: '0',
        dur: 1000
      });
      setTimeout(() => {
        if (consoleEntity.parentNode) {
          consoleEntity.parentNode.removeChild(consoleEntity);
        }
      }, 1000);
    }, 3000);
  }

  renderTimeline() {
    const timelineBar = document.getElementById('timelineBar');
    if (!timelineBar) return;

    // Clear existing timeline
    while (timelineBar.firstChild) {
      timelineBar.removeChild(timelineBar.firstChild);
    }

    if (this.executionSteps.length === 0) return;

    const totalWidth = 18;
    const stepWidth = totalWidth / this.executionSteps.length;

    this.executionSteps.forEach((step, idx) => {
      const marker = document.createElement('a-box');
      const xPos = -9 + (idx * stepWidth);
      
      marker.setAttribute('position', `${xPos} 0 0`);
      marker.setAttribute('width', stepWidth * 0.8);
      marker.setAttribute('height', '0.3');
      marker.setAttribute('depth', '0.1');
      
      // Color based on step type
      const color = this.getStepColor(step.type);
      marker.setAttribute('color', color);
      marker.setAttribute('opacity', '0.7');
      
      // Store step index
      marker.setAttribute('data-step', idx);
      marker.setAttribute('class', 'clickable');

      // Click to jump to step
      marker.addEventListener('click', () => {
        this.currentStep = idx;
        this.executeCurrentStep();
      });

      timelineBar.appendChild(marker);
    });

    // Add progress indicator
    const progress = document.createElement('a-box');
    progress.setAttribute('id', 'timelineProgress');
    progress.setAttribute('position', '-9 0.2 0.01');
    progress.setAttribute('width', '0.2');
    progress.setAttribute('height', '0.5');
    progress.setAttribute('depth', '0.15');
    progress.setAttribute('color', '#ffaa00');
    timelineBar.appendChild(progress);
  }

  updateTimelineProgress() {
    const progress = document.getElementById('timelineProgress');
    if (!progress || this.executionSteps.length === 0) return;

    const totalWidth = 18;
    const stepWidth = totalWidth / this.executionSteps.length;
    const xPos = -9 + (this.currentStep * stepWidth);

    progress.setAttribute('animation', {
      property: 'position',
      to: `${xPos} 0.2 0.01`,
      dur: 200,
      easing: 'linear'
    });
  }

  getStepColor(type) {
    const colors = {
      'line': '#95a5a6',
      'variable': '#3498db',
      'function-call': '#9b59b6',
      'function-return': '#2ecc71',
      'error': '#e74c3c',
      'console': '#00ff88'
    };
    return colors[type] || '#95a5a6';
  }

  clearDisplays() {
    // Clear variable display
    const varContent = document.getElementById('variableContent');
    if (varContent) {
      while (varContent.firstChild) {
        varContent.removeChild(varContent.firstChild);
      }
    }

    // Clear call stack
    const stackContent = document.getElementById('callStackContent');
    if (stackContent) {
      while (stackContent.firstChild) {
        stackContent.removeChild(stackContent.firstChild);
      }
    }

    // Remove console outputs
    const consoleOutputs = this.scene.querySelectorAll('.console-output');
    consoleOutputs.forEach(output => {
      if (output.parentNode) {
        output.parentNode.removeChild(output);
      }
    });
  }

  getExecutionState() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentStep: this.currentStep,
      totalSteps: this.executionSteps.length,
      stepDelay: this.stepDelay
    };
  }

  exportExecutionTrace() {
    return {
      steps: this.executionSteps,
      currentStep: this.currentStep,
      timestamp: new Date().toISOString()
    };
  }
}

export default LiveExecutionVisualizer;