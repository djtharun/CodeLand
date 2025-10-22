// src/js/executionEngine.js

class ExecutionEngine {
  constructor() {
    this.code = '';
    this.language = 'javascript';
    this.executionState = {
      currentLine: 0,
      variables: {},
      callStack: [],
      executionHistory: [],
      breakpoints: new Set(),
      isPaused: false,
      step: 0
    };
  }

  setCode(code, language) {
    this.code = code;
    this.language = language;
    this.reset();
  }

  reset() {
    this.executionState = {
      currentLine: 0,
      variables: {},
      callStack: [],
      executionHistory: [],
      breakpoints: new Set(),
      isPaused: false,
      step: 0
    };
  }

  addBreakpoint(lineNumber) {
    this.executionState.breakpoints.add(lineNumber);
  }

  removeBreakpoint(lineNumber) {
    this.executionState.breakpoints.delete(lineNumber);
  }

  async execute() {
    if (this.language !== 'javascript') {
      return {
        error: 'Only JavaScript execution is supported in browser',
        state: this.executionState
      };
    }

    try {
      // Parse and instrument the code for step-by-step execution
      const instrumentedCode = this.instrumentCode(this.code);
      
      // Create execution context
      const executionContext = this.createExecutionContext();
      
      // Execute with instrumentation
      const result = await this.executeInstrumented(instrumentedCode, executionContext);
      
      return {
        success: true,
        result: result,
        state: this.executionState
      };
    } catch (error) {
      this.executionState.executionHistory.push({
        step: this.executionState.step++,
        type: 'error',
        error: error.message,
        line: this.executionState.currentLine
      });

      return {
        error: error.message,
        stack: error.stack,
        state: this.executionState
      };
    }
  }

  instrumentCode(code) {
    // Add instrumentation for tracking execution
    const lines = code.split('\n');
    const instrumented = lines.map((line, idx) => {
      if (line.trim() === '' || line.trim().startsWith('//')) {
        return line;
      }
      
      return `__track(${idx + 1}); ${line}`;
    });

    return instrumented.join('\n');
  }

  createExecutionContext() {
    const self = this;
    
    return {
      __track: (lineNum) => {
        self.executionState.currentLine = lineNum;
        self.executionState.executionHistory.push({
          step: self.executionState.step++,
          type: 'line',
          line: lineNum,
          variables: { ...self.executionState.variables }
        });

        // Check breakpoint
        if (self.executionState.breakpoints.has(lineNum)) {
          self.executionState.isPaused = true;
          throw new Error(`BREAKPOINT at line ${lineNum}`);
        }
      },
      
      __captureVar: (name, value) => {
        self.executionState.variables[name] = value;
        self.executionState.executionHistory.push({
          step: self.executionState.step++,
          type: 'variable',
          name: name,
          value: value,
          line: self.executionState.currentLine
        });
        return value;
      },

      console: {
        log: (...args) => {
          self.executionState.executionHistory.push({
            step: self.executionState.step++,
            type: 'console',
            output: args.join(' '),
            line: self.executionState.currentLine
          });
        }
      }
    };
  }

  async executeInstrumented(code, context) {
    // Create sandboxed function
    const func = new Function(
      ...Object.keys(context),
      `"use strict"; ${code}`
    );

    // Execute with context
    return func(...Object.values(context));
  }

  async stepNext() {
    // Execute single step
    this.executionState.isPaused = false;
    // Implementation for step-by-step execution
  }

  getExecutionFlow() {
    // Generate execution flow graph
    const flow = {
      nodes: [],
      edges: []
    };

    const codeLines = this.code.split('\n');
    codeLines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      if (trimmed === '') return;

      const node = {
        id: lineNum,
        line: lineNum,
        code: trimmed,
        type: this.getNodeType(trimmed),
        executed: this.executionState.executionHistory.some(h => h.line === lineNum)
      };

      flow.nodes.push(node);

      // Add edges based on control flow
      if (idx > 0 && !trimmed.startsWith('}') && !trimmed.startsWith('else')) {
        flow.edges.push({
          from: idx,
          to: lineNum
        });
      }
    });

    return flow;
  }

  getNodeType(code) {
    if (code.startsWith('function') || code.includes('=>')) return 'function';
    if (code.startsWith('if') || code.startsWith('else')) return 'conditional';
    if (code.startsWith('for') || code.startsWith('while')) return 'loop';
    if (code.startsWith('return')) return 'return';
    if (code.includes('=') && !code.includes('==')) return 'assignment';
    return 'statement';
  }

  getVariableStates() {
    // Get variable states at each step
    const states = [];
    
    this.executionState.executionHistory.forEach(entry => {
      if (entry.type === 'variable') {
        states.push({
          step: entry.step,
          line: entry.line,
          variable: entry.name,
          value: entry.value
        });
      }
    });

    return states;
  }

  getErrorTimeline() {
    // Get error timeline
    return this.executionState.executionHistory.filter(e => 
      e.type === 'error' || e.type === 'warning'
    );
  }

  analyzePerformance() {
    // Analyze performance bottlenecks
    const lineExecutionCounts = {};
    
    this.executionState.executionHistory.forEach(entry => {
      if (entry.type === 'line') {
        lineExecutionCounts[entry.line] = (lineExecutionCounts[entry.line] || 0) + 1;
      }
    });

    const hotspots = Object.entries(lineExecutionCounts)
      .filter(([line, count]) => count > 10)
      .sort((a, b) => b[1] - a[1])
      .map(([line, count]) => ({
        line: parseInt(line),
        executionCount: count,
        code: this.code.split('\n')[line - 1]
      }));

    return {
      totalSteps: this.executionState.step,
      hotspots: hotspots,
      avgStepsPerLine: this.executionState.step / this.code.split('\n').length
    };
  }
}

export default ExecutionEngine;