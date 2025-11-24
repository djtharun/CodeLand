// src/js/vrNavigationController.js

class VRNavigationController {
  constructor(scene) {
    this.scene = scene;
    this.rig = null;
    this.currentFloor = 0;
    this.maxFloor = 10;
    this.floorHeight = 5;
    this.isMoving = false;
    this.teleportMarker = null;
  }

  initialize() {
    this.rig = document.getElementById('rig');
    if (!this.rig) {
      console.error('Camera rig not found');
      return false;
    }

    this.createNavigationUI();
    this.createTeleportSystem();
    this.setupKeyboardControls();
    this.createFloorIndicator();
    
    return true;
  }

  createNavigationUI() {
    // Create elevator/lift controls in VR
    const navPanel = document.createElement('a-entity');
    navPanel.setAttribute('id', 'navPanel');
    navPanel.setAttribute('position', '2 1.5 -2');

    // Background panel
    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '1.5');
    bg.setAttribute('height', '2.5');
    bg.setAttribute('color', '#0f1419');
    bg.setAttribute('opacity', '0.95');
    navPanel.appendChild(bg);

    // Title
    const title = document.createElement('a-text');
    title.setAttribute('value', 'NAVIGATION');
    title.setAttribute('align', 'center');
    title.setAttribute('position', '0 1 0.01');
    title.setAttribute('color', '#00ff88');
    title.setAttribute('width', '1.3');
    navPanel.appendChild(title);

    // Up button
    const upBtn = this.createNavButton('▲ UP', '0 0.5 0.01', '#00ff88');
    upBtn.addEventListener('click', () => this.moveFloor(1));
    navPanel.appendChild(upBtn);

    // Floor display
    const floorDisplay = document.createElement('a-text');
    floorDisplay.setAttribute('id', 'floorDisplay');
    floorDisplay.setAttribute('value', 'FLOOR 0');
    floorDisplay.setAttribute('align', 'center');
    floorDisplay.setAttribute('position', '0 0 0.01');
    floorDisplay.setAttribute('color', '#ffffff');
    floorDisplay.setAttribute('width', '1.2');
    navPanel.appendChild(floorDisplay);

    // Down button
    const downBtn = this.createNavButton('▼ DOWN', '0 -0.5 0.01', '#3498db');
    downBtn.addEventListener('click', () => this.moveFloor(-1));
    navPanel.appendChild(downBtn);

    // Reset button
    const resetBtn = this.createNavButton('⟲ RESET', '0 -1 0.01', '#e74c3c');
    resetBtn.addEventListener('click', () => this.resetPosition());
    navPanel.appendChild(resetBtn);

    this.scene.appendChild(navPanel);
  }

  createNavButton(text, position, color) {
    const btnEntity = document.createElement('a-entity');
    btnEntity.setAttribute('position', position);

    const btn = document.createElement('a-box');
    btn.setAttribute('width', '1.2');
    btn.setAttribute('height', '0.4');
    btn.setAttribute('depth', '0.1');
    btn.setAttribute('color', color);
    btn.setAttribute('opacity', '0.9');
    btn.setAttribute('class', 'clickable');

    // Hover effect
    btn.addEventListener('mouseenter', () => {
      btn.setAttribute('scale', '1.1 1.1 1.1');
    });
    btn.addEventListener('mouseleave', () => {
      btn.setAttribute('scale', '1 1 1');
    });

    const btnText = document.createElement('a-text');
    btnText.setAttribute('value', text);
    btnText.setAttribute('align', 'center');
    btnText.setAttribute('position', '0 0 0.06');
    btnText.setAttribute('color', '#ffffff');
    btnText.setAttribute('width', '1.1');

    btnEntity.appendChild(btn);
    btnEntity.appendChild(btnText);

    return btnEntity;
  }

  createTeleportSystem() {
    // Create teleport marker
    this.teleportMarker = document.createElement('a-entity');
    this.teleportMarker.setAttribute('id', 'teleportMarker');
    this.teleportMarker.setAttribute('visible', 'false');

    // Marker circle
    const circle = document.createElement('a-circle');
    circle.setAttribute('radius', '0.5');
    circle.setAttribute('rotation', '-90 0 0');
    circle.setAttribute('color', '#00ff88');
    circle.setAttribute('opacity', '0.7');
    
    // Pulsing animation
    circle.setAttribute('animation', {
      property: 'scale',
      from: '1 1 1',
      to: '1.2 1.2 1',
      dur: 1000,
      dir: 'alternate',
      loop: true
    });

    // Arrow indicator
    const arrow = document.createElement('a-cone');
    arrow.setAttribute('radius-bottom', '0.2');
    arrow.setAttribute('radius-top', '0');
    arrow.setAttribute('height', '0.4');
    arrow.setAttribute('position', '0 0.2 0');
    arrow.setAttribute('color', '#00ff88');
    arrow.setAttribute('rotation', '0 0 0');

    this.teleportMarker.appendChild(circle);
    this.teleportMarker.appendChild(arrow);
    this.scene.appendChild(this.teleportMarker);

    // Teleport on click
    this.scene.addEventListener('click', (evt) => {
      if (evt.detail.intersection && evt.shiftKey) {
        const point = evt.detail.intersection.point;
        this.teleportTo(point.x, point.z);
      }
    });
  }

  setupKeyboardControls() {
    // Enhanced keyboard controls
    window.addEventListener('keydown', (e) => {
      switch(e.key.toLowerCase()) {
        case 'q': // Up
          this.moveFloor(1);
          break;
        case 'e': // Down
          this.moveFloor(-1);
          break;
        case 'r': // Reset
          this.resetPosition();
          break;
        case 'pageup':
          this.smoothMove(0, 0.5, 0);
          break;
        case 'pagedown':
          this.smoothMove(0, -0.5, 0);
          break;
        case 't': // Toggle teleport mode
          this.toggleTeleportMode();
          break;
      }
    });
  }

  createFloorIndicator() {
    // Floating floor indicator
    const indicator = document.createElement('a-entity');
    indicator.setAttribute('id', 'floorIndicator');
    indicator.setAttribute('position', '-3 2 -3');

    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '1');
    bg.setAttribute('height', '0.5');
    bg.setAttribute('color', '#000000');
    bg.setAttribute('opacity', '0.8');

    const text = document.createElement('a-text');
    text.setAttribute('id', 'floorIndicatorText');
    text.setAttribute('value', 'Floor: 0');
    text.setAttribute('align', 'center');
    text.setAttribute('position', '0 0 0.01');
    text.setAttribute('color', '#00ff88');
    text.setAttribute('width', '0.9');

    indicator.appendChild(bg);
    indicator.appendChild(text);
    this.scene.appendChild(indicator);
  }

  moveFloor(direction) {
    if (this.isMoving) return;

    const targetFloor = this.currentFloor + direction;
    
    // Check bounds
    if (targetFloor < 0 || targetFloor > this.maxFloor) {
      this.showMessage(`Cannot move to floor ${targetFloor}`);
      return;
    }

    this.isMoving = true;
    this.currentFloor = targetFloor;

    // Animate movement
    const currentPos = this.rig.getAttribute('position');
    const targetY = 1.6 + (this.currentFloor * this.floorHeight);

    this.animateRigPosition(
      currentPos.x,
      targetY,
      currentPos.z,
      1000
    ).then(() => {
      this.isMoving = false;
      this.updateFloorDisplay();
      this.showMessage(`Floor ${this.currentFloor}`);
    });
  }

  smoothMove(dx, dy, dz) {
    const currentPos = this.rig.getAttribute('position');
    this.animateRigPosition(
      currentPos.x + dx,
      currentPos.y + dy,
      currentPos.z + dz,
      300
    );
  }

  teleportTo(x, z) {
    const currentPos = this.rig.getAttribute('position');
    
    // Show teleport effect
    this.teleportMarker.setAttribute('position', `${x} 0.1 ${z}`);
    this.teleportMarker.setAttribute('visible', 'true');

    setTimeout(() => {
      this.animateRigPosition(x, currentPos.y, z, 500).then(() => {
        this.teleportMarker.setAttribute('visible', 'false');
      });
    }, 200);
  }

  animateRigPosition(x, y, z, duration) {
    return new Promise((resolve) => {
      const rig = this.rig;
      const startPos = rig.getAttribute('position');
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease in-out
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const newPos = {
          x: startPos.x + (x - startPos.x) * eased,
          y: startPos.y + (y - startPos.y) * eased,
          z: startPos.z + (z - startPos.z) * eased
        };

        rig.setAttribute('position', newPos);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  resetPosition() {
    this.currentFloor = 0;
    this.animateRigPosition(0, 1.6, 5, 1000).then(() => {
      this.updateFloorDisplay();
      this.showMessage('Position reset');
    });
  }

  updateFloorDisplay() {
    const display = document.getElementById('floorDisplay');
    if (display) {
      display.setAttribute('value', `FLOOR ${this.currentFloor}`);
    }

    const indicator = document.getElementById('floorIndicatorText');
    if (indicator) {
      indicator.setAttribute('value', `Floor: ${this.currentFloor}`);
    }
  }

  toggleTeleportMode() {
    // Toggle teleport mode indicator
    this.showMessage('Shift+Click to teleport');
  }

  showMessage(text) {
    // Show temporary message
    let messageEntity = document.getElementById('navMessage');
    
    if (!messageEntity) {
      messageEntity = document.createElement('a-entity');
      messageEntity.setAttribute('id', 'navMessage');
      messageEntity.setAttribute('position', '0 2.5 -2');

      const bg = document.createElement('a-plane');
      bg.setAttribute('width', '2');
      bg.setAttribute('height', '0.5');
      bg.setAttribute('color', '#000000');
      bg.setAttribute('opacity', '0.8');

      const text = document.createElement('a-text');
      text.setAttribute('id', 'navMessageText');
      text.setAttribute('align', 'center');
      text.setAttribute('position', '0 0 0.01');
      text.setAttribute('color', '#00ff88');
      text.setAttribute('width', '1.8');

      messageEntity.appendChild(bg);
      messageEntity.appendChild(text);
      this.scene.appendChild(messageEntity);
    }

    const textEl = document.getElementById('navMessageText');
    if (textEl) {
      textEl.setAttribute('value', text);
      messageEntity.setAttribute('visible', 'true');

      setTimeout(() => {
        messageEntity.setAttribute('visible', 'false');
      }, 2000);
    }
  }

  // Scroll through code pages
  scrollCode(direction) {
    const codeViz = document.getElementById('codeViz');
    if (!codeViz) return;

    const currentPos = codeViz.getAttribute('position');
    const newY = currentPos.y + (direction * 5);
    
    codeViz.setAttribute('animation', {
      property: 'position',
      to: `${currentPos.x} ${newY} ${currentPos.z}`,
      dur: 500,
      easing: 'easeInOutQuad'
    });
  }

  getNavigationState() {
    return {
      currentFloor: this.currentFloor,
      position: this.rig ? this.rig.getAttribute('position') : null,
      isMoving: this.isMoving
    };
  }
}

export default VRNavigationController;