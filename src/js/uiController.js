export class UIController {
  constructor() {
    this.statusDiv = document.getElementById('status');
    this.mainText = document.querySelector('#mainText');
  }

  updateStatus(message) {
    this.statusDiv.textContent = message;
    
    // Add loading animation for certain messages
    if (message.includes('...')) {
      this.statusDiv.classList.add('loading');
    } else {
      this.statusDiv.classList.remove('loading');
    }
  }

  updateMainText(text) {
    if (this.mainText) {
      this.mainText.setAttribute('value', text);
    }
  }

  showError(message) {
    this.updateStatus(`❌ ${message}`);
    this.updateMainText(`ERROR\n\n${message}`);
  }

  showSuccess(message) {
    this.updateStatus(`✓ ${message}`);
  }
}