class VRFlowVisualizer {
  constructor(scene) {
    this.scene = scene;
    this.flowContainer = document.getElementById('executionFlow');
    this.variableContainer = document.getElementById('variableStates');
    this.timelineContainer = document.getElementById('errorTimeline');
    this.codeVizContainer = document.getElementById('codeViz');
    this.nodeElements = new Map();
  }

  clear() {
    if (this.flowContainer) {
      while (this.flowContainer.firstChild) {
        this.flowContainer.removeChild(this.flowContainer.firstChild);
      }
    }
    if (this.variableContainer) {
      while (this.variableContainer.firstChild) {
        this.variableContainer.removeChild(this.variableContainer.firstChild);
      }
    }
    if (this.timelineContainer) {
      while (this.timelineContainer.firstChild) {
        this.timelineContainer.removeChild(this.timelineContainer.firstChild);
      }
    }
    if (this.codeVizContainer) {
      while (this.codeVizContainer.firstChild) {
        this.codeVizContainer.removeChild(this.codeVizContainer.firstChild);
      }
    }
    this.nodeElements.clear();
  }

  visualizeExecutionFlow(flowData) {
    this.clear();

    const { nodes, edges } = flowData;
    const spacing = 1.5;
    const maxNodesPerColumn = 8;

    nodes.forEach((node, idx) => {
      const col = Math.floor(idx / maxNodesPerColumn);
      const row = idx % maxNodesPerColumn;

      const x = col * spacing;
      const y = (maxNodesPerColumn - row) * 0.8;
      const z = 0;

      const color = this.getNodeColor(node.type);
      const executed = node.executed;

      // Create node
      const nodeEntity = document.createElement('a-entity');
      nodeEntity.setAttribute('position', `${x} ${y} ${z}`);

      // Node box
      const box = document.createElement('a-box');
      box.setAttribute('width', '1.2');
      box.setAttribute('height', '0.6');
      box.setAttribute('depth', '0.2');
      box.setAttribute('color', executed ? color : '#333333');
      box.setAttribute('opacity', executed ? '0.9' : '0.5');
      box.setAttribute('class', 'clickable');
      box.setAttribute('data-line', node.line);

      // Add glow for executed nodes
      if (executed) {
        box.setAttribute('animation', `property: opacity; from: 0.9; to: 0.6; dur: 1000; dir: alternate; loop: true`);
      }

      // Line number
      const lineText = document.createElement('a-text');
      lineText.setAttribute('value', `L${node.line}`);
      lineText.setAttribute('align', 'center');
      lineText.setAttribute('position', '0 0.25 0.11');
      lineText.setAttribute('color', '#ffffff');
      lineText.setAttribute('width', '1');

      // Code preview
      const codeText = document.createElement('a-text');
      const truncatedCode = node.code.length > 20 ? node.code.substring(0, 20) + '...' : node.code;
      codeText.setAttribute('value', truncatedCode);
      codeText.setAttribute('align', 'center');
      codeText.setAttribute('position', '0 -0.1 0.11');
      codeText.setAttribute('color', '#cccccc');
      codeText.setAttribute('width', '1.1');
      codeText.setAttribute('wrap-count', '20');

      nodeEntity.appendChild(box);
      nodeEntity.appendChild(lineText);
      nodeEntity.appendChild(codeText);

      this.flowContainer.appendChild(nodeEntity);
      this.nodeElements.set(node.line, nodeEntity);

      // Add click handler
      box.addEventListener('click', () => {
        this.onNodeClick(node);
      });
    });

    // Draw edges
    this.drawEdges(nodes, edges, spacing, maxNodesPerColumn);
  }

  drawEdges(nodes, edges, spacing, maxNodesPerColumn) {
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);

      if (!fromNode || !toNode) return;

      const fromIdx = nodes.indexOf(fromNode);
      const toIdx = nodes.indexOf(toNode);

      const fromCol = Math.floor(fromIdx / maxNodesPerColumn);
      const fromRow = fromIdx % maxNodesPerColumn;
      const toCol = Math.floor(toIdx / maxNodesPerColumn);
      const toRow = toIdx % maxNodesPerColumn;

      const x1 = fromCol * spacing;
      const y1 = (maxNodesPerColumn - fromRow) * 0.8;
      const x2 = toCol * spacing;
      const y2 = (maxNodesPerColumn - toRow) * 0.8;

      // Calculate line
      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      // Create line
      const line = document.createElement('a-cylinder');
      line.setAttribute('position', `${midX} ${midY} -0.1`);
      line.setAttribute('height', distance);
      line.setAttribute('radius', '0.02');
      line.setAttribute('color', '#00ff88');
      line.setAttribute('opacity', '0.6');
      
      // Rotate to connect nodes
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      line.setAttribute('rotation', `0 0 ${90 - angle}`);

      this.flowContainer.appendChild(line);
    });
  }

  getNodeColor(type) {
    const colors = {
      function: '#9b59b6',
      conditional: '#f39c12',
      loop: '#e74c3c',
      return: '#2ecc71',
      assignment: '#3498db',
      statement: '#95a5a6'
    };
    return colors[type] || '#95a5a6';
  }

  onNodeClick(node) {
    console.log('Node clicked:', node);
    
    // Highlight node
    const nodeEntity = this.nodeElements.get(node.line);
    if (nodeEntity) {
      const box = nodeEntity.querySelector('a-box');
      box.setAttribute('color', '#ffffff');
      setTimeout(() => {
        box.setAttribute('color', this.getNodeColor(node.type));
      }, 500);
    }

    // Show details
    this.showNodeDetails(node);
  }

  showNodeDetails(node) {
    const mainText = document.getElementById('mainText');
    if (mainText) {
      const details = `LINE ${node.line} - ${node.type.toUpperCase()}\n\nCode: ${node.code}\n\nType: ${node.type}\nExecuted: ${node.executed ? 'Yes' : 'No'}`;
      mainText.setAttribute('value', details);
    }
  }

  visualizeVariables(variableStates) {
    this.clearContainer(this.variableContainer);

    const uniqueVars = {};
    variableStates.forEach(state => {
      uniqueVars[state.variable] = state.value;
    });

    Object.entries(uniqueVars).forEach(([varName, value], idx) => {
      const panel = document.createElement('a-entity');
      panel.setAttribute('position', `0 ${idx * -0.8} 0`);

      // Background
      const bg = document.createElement('a-plane');
      bg.setAttribute('width', '2');
      bg.setAttribute('height', '0.6');
      bg.setAttribute('color', '#1e1e1e');
      bg.setAttribute('opacity', '0.9');

      // Variable name
      const nameText = document.createElement('a-text');
      nameText.setAttribute('value', varName);
      nameText.setAttribute('align', 'left');
      nameText.setAttribute('position', '-0.9 0.15 0.01');
      nameText.setAttribute('color', '#00ff88');
      nameText.setAttribute('width', '1.8');

      // Variable value
      const valueText = document.createElement('a-text');
      const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const truncated = displayValue.length > 30 ? displayValue.substring(0, 30) + '...' : displayValue;
      valueText.setAttribute('value', truncated);
      valueText.setAttribute('align', 'left');
      valueText.setAttribute('position', '-0.9 -0.15 0.01');
      valueText.setAttribute('color', '#ffffff');
      valueText.setAttribute('width', '1.8');

      panel.appendChild(bg);
      panel.appendChild(nameText);
      panel.appendChild(valueText);

      this.variableContainer.appendChild(panel);
    });
  }

  visualizeErrorTimeline(errors) {
    this.clearContainer(this.timelineContainer);

    errors.forEach((error, idx) => {
      const marker = document.createElement('a-entity');
      marker.setAttribute('position', `${idx * 2} 0 0`);

      // Error marker
      const sphere = document.createElement('a-sphere');
      sphere.setAttribute('radius', '0.3');
      sphere.setAttribute('color', '#e74c3c');
      sphere.setAttribute('opacity', '0.8');
      sphere.setAttribute('class', 'clickable');

      // Pulsing animation
      sphere.setAttribute('animation', 'property: scale; from: 1 1 1; to: 1.2 1.2 1.2; dur: 1000; dir: alternate; loop: true');

      // Error text
      const errorText = document.createElement('a-text');
      errorText.setAttribute('value', `Error @ L${error.line}`);
      errorText.setAttribute('align', 'center');
      errorText.setAttribute('position', '0 0.5 0');
      errorText.setAttribute('color', '#ffffff');
      errorText.setAttribute('width', '2');

      marker.appendChild(sphere);
      marker.appendChild(errorText);

      sphere.addEventListener('click', () => {
        this.showErrorDetails(error);
      });

      this.timelineContainer.appendChild(marker);
    });
  }

  showErrorDetails(error) {
    const mainText = document.getElementById('mainText');
    if (mainText) {
      const details = `ERROR DETECTED\n\nLine: ${error.line}\nType: ${error.type}\nMessage: ${error.error || error.message}\n\nStep: ${error.step}`;
      mainText.setAttribute('value', details);
    }
  }

  visualizeCodeStructure(code, language) {
    this.clearContainer(this.codeVizContainer);

    const lines = code.split('\n');
    const maxLines = Math.min(lines.length, 20); // Limit for performance

    lines.slice(0, maxLines).forEach((line, idx) => {
      const lineEntity = document.createElement('a-entity');
      lineEntity.setAttribute('position', `0 ${(maxLines - idx) * 0.3} 0`);

      // Line background
      const bg = document.createElement('a-plane');
      bg.setAttribute('width', '8');
      bg.setAttribute('height', '0.25');
      bg.setAttribute('color', '#1e1e1e');
      bg.setAttribute('opacity', '0.8');

      // Line number
      const lineNum = document.createElement('a-text');
      lineNum.setAttribute('value', `${idx + 1}`);
      lineNum.setAttribute('align', 'right');
      lineNum.setAttribute('position', '-3.8 0 0.01');
      lineNum.setAttribute('color', '#666666');
      lineNum.setAttribute('width', '3');

      // Code text
      const codeText = document.createElement('a-text');
      const truncated = line.length > 80 ? line.substring(0, 80) + '...' : line;
      codeText.setAttribute('value', truncated);
      codeText.setAttribute('align', 'left');
      codeText.setAttribute('position', '-3.5 0 0.01');
      codeText.setAttribute('color', '#ffffff');
      codeText.setAttribute('width', '7');

      lineEntity.appendChild(bg);
      lineEntity.appendChild(lineNum);
      lineEntity.appendChild(codeText);

      this.codeVizContainer.appendChild(lineEntity);
    });

    if (lines.length > maxLines) {
      const moreText = document.createElement('a-text');
      moreText.setAttribute('value', `... ${lines.length - maxLines} more lines ...`);
      moreText.setAttribute('align', 'center');
      moreText.setAttribute('position', `0 ${(maxLines - lines.length) * 0.3 - 0.5} 0.01`);
      moreText.setAttribute('color', '#666666');
      moreText.setAttribute('width', '4');
      this.codeVizContainer.appendChild(moreText);
    }
  }

  addBreakpointMarker(lineNumber) {
    const breakpointEntity = document.createElement('a-sphere');
    breakpointEntity.setAttribute('position', `${lineNumber * 0.5} 2 -7`);
    breakpointEntity.setAttribute('radius', '0.2');
    breakpointEntity.setAttribute('color', '#e74c3c');
    breakpointEntity.setAttribute('class', 'clickable');
    breakpointEntity.setAttribute('data-line', lineNumber);
    
    const breakpointsContainer = document.getElementById('breakpoints');
    if (breakpointsContainer) {
      breakpointsContainer.appendChild(breakpointEntity);
    }

    return breakpointEntity;
  }

  removeBreakpointMarker(lineNumber) {
    const breakpointsContainer = document.getElementById('breakpoints');
    if (breakpointsContainer) {
      const markers = breakpointsContainer.querySelectorAll(`[data-line="${lineNumber}"]`);
      markers.forEach(marker => marker.parentNode.removeChild(marker));
    }
  }

  clearContainer(container) {
    if (container) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }
  }

  animateExecution(step) {
    // Animate current execution step
    const statusLight = document.getElementById('statusLight');
    if (statusLight) {
      statusLight.setAttribute('color', '#f39c12');
      setTimeout(() => {
        statusLight.setAttribute('color', '#00ff88');
      }, 500);
    }
  }
}

export default VRFlowVisualizer;