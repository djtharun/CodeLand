// src/js/voiceController.js

class VoiceController {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.commands = new Map();
    this.synthesis = window.speechSynthesis;
    this.initializeCommands();
  }

  initialize() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      console.log('Voice command:', transcript);
      this.processCommand(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        this.speak('No speech detected. Please try again.');
      }
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        this.recognition.start(); // Restart if still active
      }
    };

    return true;
  }

  initializeCommands() {
    // Define voice commands and their handlers
    this.commands.set('analyze', {
      patterns: ['analyze', 'analyze code', 'run analysis'],
      description: 'Analyze the code',
      handler: null // Will be set from main.js
    });

    this.commands.set('visualize', {
      patterns: ['visualize', 'show visualization', 'visualize flow'],
      description: 'Visualize code flow',
      handler: null
    });

    this.commands.set('execute', {
      patterns: ['execute', 'run code', 'execute code'],
      description: 'Execute the code',
      handler: null
    });

    this.commands.set('clear', {
      patterns: ['clear', 'reset', 'clear session'],
      description: 'Clear the session',
      handler: null
    });

    this.commands.set('breakpoint', {
      patterns: ['set breakpoint', 'add breakpoint', 'breakpoint'],
      description: 'Set a breakpoint',
      handler: null
    });

    this.commands.set('show variables', {
      patterns: ['show variables', 'display variables', 'variables'],
      description: 'Show variable states',
      handler: null
    });

    this.commands.set('next step', {
      patterns: ['next step', 'step', 'next'],
      description: 'Execute next step',
      handler: null
    });

    this.commands.set('continue', {
      patterns: ['continue', 'resume', 'continue execution'],
      description: 'Continue execution',
      handler: null
    });

    this.commands.set('help', {
      patterns: ['help', 'commands', 'what can you do'],
      description: 'Show available commands',
      handler: () => this.showHelp()
    });

    this.commands.set('stop', {
      patterns: ['stop listening', 'stop', 'disable voice'],
      description: 'Stop voice control',
      handler: () => this.stopListening()
    });
  }

  start() {
    if (!this.recognition) {
      if (!this.initialize()) {
        return false;
      }
    }

    try {
      this.recognition.start();
      this.isListening = true;
      this.speak('Voice control activated. Say help for available commands.');
      return true;
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      return false;
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.speak('Voice control deactivated.');
    }
  }

  processCommand(transcript) {
    let commandFound = false;

    for (const [commandName, command] of this.commands) {
      for (const pattern of command.patterns) {
        if (transcript.includes(pattern)) {
          console.log(`Executing command: ${commandName}`);
          
          if (command.handler) {
            command.handler(transcript);
            this.speak(`Executing ${commandName}`);
          } else {
            this.speak(`Command ${commandName} is not configured yet`);
          }
          
          commandFound = true;
          break;
        }
      }
      if (commandFound) break;
    }

    if (!commandFound) {
      console.log('Unknown command:', transcript);
      this.speak('Unknown command. Say help for available commands.');
    }
  }

  registerHandler(commandName, handler) {
    const command = this.commands.get(commandName);
    if (command) {
      command.handler = handler;
    }
  }

  speak(text) {
    if (!this.synthesis) return;

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    this.synthesis.speak(utterance);
  }

  showHelp() {
    const commandList = Array.from(this.commands.entries())
      .map(([name, cmd]) => `${name}: ${cmd.description}`)
      .join('. ');
    
    this.speak(`Available commands: ${commandList}`);
    
    // Also display in UI
    const mainText = document.getElementById('mainText');
    if (mainText) {
      const helpText = 'VOICE COMMANDS:\n\n' + 
        Array.from(this.commands.entries())
          .map(([name, cmd]) => `• ${cmd.patterns[0]}: ${cmd.description}`)
          .join('\n');
      mainText.setAttribute('value', helpText);
    }
  }

  stopListening() {
    this.stop();
  }

  getStatus() {
    return {
      isListening: this.isListening,
      isSupported: this.recognition !== null
    };
  }
}

export default VoiceController;