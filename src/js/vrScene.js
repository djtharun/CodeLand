export class VRScene {
  constructor() {
    this.codeVizContainer = document.querySelector('#codeViz');
    this.statusLight = document.querySelector('#statusLight');
  }

  setStatusLight(color) {
    if (this.statusLight) {
      this.statusLight.setAttribute('color', color);
    }
  }

  createVisualization(lines, bugs) {
    this.clearVisualization();

    const maxNodes = Math.min(10, lines.length);
    
    for (let i = 0; i < maxNodes; i++) {
      this.createNode(i, maxNodes, bugs);
      
      if (i > 0) {
        this.createConnector(i, maxNodes);
      }
    }
  }

  createNode(index, total, bugs) {
    const angle = (index / total) * Math.PI * 2;
    const radius = 3;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 8;
    
    const hasBug = bugs.some(b => b.line === index + 1);
    
    const node = document.createElement('a-sphere');
    node.setAttribute('position', `${x} ${1.5 + Math.random() * 0.5} ${z}`);
    node.setAttribute('radius', '0.2');
    node.setAttribute('color', hasBug ? '#e74c3c' : '#00ff88');
    node.setAttribute('class', 'clickable');
    node.setAttribute('opacity', '0.8');
    
    // Add label
    const label = document.createElement('a-text');
    label.setAttribute('value', `L${index + 1}`);
    label.setAttribute('align', 'center');
    label.setAttribute('position', '0 0.4 0');
    label.setAttribute('scale', '2 2 2');
    label.setAttribute('color', '#fff');
    node.appendChild(label);
    
    // Add floating animation
    node.setAttribute('animation', 
      `property: position; to: ${x} ${2 + Math.sin(index) * 0.3} ${z}; dir: alternate; loop: true; dur: ${2000 + index * 100}`
    );
    
    // Add glow effect for bug nodes
    if (hasBug) {
      const glow = document.createElement('a-sphere');
      glow.setAttribute('radius', '0.3');
      glow.setAttribute('color', '#e74c3c');
      glow.setAttribute('opacity', '0.3');
      glow.setAttribute('position', '0 0 0');
      node.appendChild(glow);
    }
    
    this.codeVizContainer.appendChild(node);
  }

  createConnector(index, total) {
    const angle = (index / total) * Math.PI * 2;
    const prevAngle = ((index - 1) / total) * Math.PI * 2;
    const radius = 3;
    
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 8;
    const prevX = Math.cos(prevAngle) * radius;
    const prevZ = Math.sin(prevAngle) * radius - 8;
    
    const connector = document.createElement('a-entity');
    connector.setAttribute('line', 
      `start: ${prevX} 1.5 ${prevZ}; end: ${x} 1.5 ${z}; color: #00ff88; opacity: 0.3`
    );
    
    this.codeVizContainer.appendChild(connector);
  }

  clearVisualization() {
    if (this.codeVizContainer) {
      this.codeVizContainer.innerHTML = '';
    }
  }
}