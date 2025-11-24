// src/js/aiConversationSystem.js

class AIConversationSystem {
  constructor(scene) {
    this.scene = scene;
    this.conversationHistory = [];
    this.synthesis = window.speechSynthesis;
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.chatPanel = null;
    this.maxHistoryDisplay = 5;
    this.apiEndpoint = '/api/chat';
    this.context = {
      code: '',
      language: '',
      currentIssues: [],
      currentLine: -1
    };
  }

  initialize() {
    this.createChatPanel();
    this.createChatInput();
    return true;
  }

  createChatPanel() {
    this.chatPanel = document.createElement('a-entity');
    this.chatPanel.setAttribute('id', 'aiChatPanel');
    this.chatPanel.setAttribute('position', '8 2 -10');

    // Background
    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '10');
    bg.setAttribute('height', '8');
    bg.setAttribute('color', '#0f1419');
    bg.setAttribute('opacity', '0.95');

    const border = document.createElement('a-plane');
    border.setAttribute('width', '10.1');
    border.setAttribute('height', '8.1');
    border.setAttribute('color', '#9b59b6');
    border.setAttribute('opacity', '0.4');
    border.setAttribute('position', '0 0 -0.01');

    // Title
    const titleBar = document.createElement('a-plane');
    titleBar.setAttribute('width', '10');
    titleBar.setAttribute('height', '0.6');
    titleBar.setAttribute('position', '0 3.7 0.01');
    titleBar.setAttribute('color', '#9b59b6');

    const title = document.createElement('a-text');
    title.setAttribute('value', '🤖 AI ASSISTANT');
    title.setAttribute('align', 'center');
    title.setAttribute('position', '0 3.7 0.02');
    title.setAttribute('color', '#ffffff');
    title.setAttribute('width', '5');

    // Conversation container
    const conversationContainer = document.createElement('a-entity');
    conversationContainer.setAttribute('id', 'conversationContainer');
    conversationContainer.setAttribute('position', '0 3 0.01');

    this.chatPanel.appendChild(border);
    this.chatPanel.appendChild(bg);
    this.chatPanel.appendChild(titleBar);
    this.chatPanel.appendChild(title);
    this.chatPanel.appendChild(conversationContainer);

    this.scene.appendChild(this.chatPanel);
  }

  createChatInput() {
    // Voice input button
    const inputPanel = document.createElement('a-entity');
    inputPanel.setAttribute('position', '8 -2 -10');

    const voiceBtn = document.createElement('a-box');
    voiceBtn.setAttribute('width', '2');
    voiceBtn.setAttribute('height', '0.5');
    voiceBtn.setAttribute('depth', '0.2');
    voiceBtn.setAttribute('color', '#9b59b6');
    voiceBtn.setAttribute('opacity', '0.9');
    voiceBtn.setAttribute('class', 'clickable');
    voiceBtn.setAttribute('id', 'aiVoiceBtn');

    const voiceText = document.createElement('a-text');
    voiceText.setAttribute('value', '🎤 ASK AI');
    voiceText.setAttribute('align', 'center');
    voiceText.setAttribute('position', '0 0 0.11');
    voiceText.setAttribute('color', '#ffffff');
    voiceText.setAttribute('width', '1.8');

    voiceBtn.appendChild(voiceText);
    inputPanel.appendChild(voiceBtn);

    // Click to activate voice input
    voiceBtn.addEventListener('click', () => {
      this.activateVoiceInput();
    });

    this.scene.appendChild(inputPanel);
  }

  updateContext(context) {
    this.context = { ...this.context, ...context };
  }

  async askAI(userMessage) {
    // Add user message to history
    this.addMessageToHistory('user', userMessage);

    // Show thinking indicator
    this.showThinkingIndicator();

    try {
      // Build context for AI
      const contextPrompt = this.buildContextPrompt(userMessage);

      // Call AI API
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: contextPrompt,
          history: this.conversationHistory.slice(-5)
        })
      });

      if (!response.ok) {
        throw new Error('AI API request failed');
      }

      const data = await response.json();
      const aiResponse = data.response || 'Sorry, I could not generate a response.';

      // Add AI response to history
      this.addMessageToHistory('ai', aiResponse);

      // Speak the response
      this.speak(aiResponse);

      // Hide thinking indicator
      this.hideThinkingIndicator();

      return aiResponse;

    } catch (error) {
      console.error('AI conversation error:', error);
      
      // Fallback to rule-based response
      const fallbackResponse = this.generateFallbackResponse(userMessage);
      this.addMessageToHistory('ai', fallbackResponse);
      this.speak(fallbackResponse);
      this.hideThinkingIndicator();

      return fallbackResponse;
    }
  }

  buildContextPrompt(userMessage) {
    let prompt = `You are an expert code debugging assistant in a VR environment. `;
    prompt += `Help the user understand and fix their code issues.\n\n`;

    if (this.context.code) {
      const codePreview = this.context.code.substring(0, 500);
      prompt += `Current code (${this.context.language}):\n\`\`\`\n${codePreview}\n\`\`\`\n\n`;
    }

    if (this.context.currentIssues.length > 0) {
      prompt += `Current issues detected:\n`;
      this.context.currentIssues.forEach((issue, idx) => {
        prompt += `${idx + 1}. Line ${issue.line}: ${issue.message} (${issue.severity})\n`;
      });
      prompt += `\n`;
    }

    if (this.context.currentLine > 0) {
      prompt += `Currently viewing line ${this.context.currentLine}\n\n`;
    }

    prompt += `User question: ${userMessage}\n\n`;
    prompt += `Provide a clear, concise answer. If suggesting code fixes, format them clearly.`;

    return prompt;
  }

  generateFallbackResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();

    // Pattern matching for common questions
    if (lowerMessage.includes('error') || lowerMessage.includes('bug')) {
      if (this.context.currentIssues.length > 0) {
        const criticalIssues = this.context.currentIssues.filter(i => 
          i.severity === 'critical' || i.severity === 'high'
        );
        if (criticalIssues.length > 0) {
          return `I found ${criticalIssues.length} critical issue(s). The most important one is at line ${criticalIssues[0].line}: ${criticalIssues[0].message}. Would you like me to suggest a fix?`;
        }
        return `I detected ${this.context.currentIssues.length} issues in your code. The first one is at line ${this.context.currentIssues[0].line}. Let me know if you need help fixing it.`;
      }
      return `I haven't detected any errors yet. Try running the analysis first, or tell me what specific problem you're encountering.`;
    }

    if (lowerMessage.includes('fix') || lowerMessage.includes('solve')) {
      if (this.context.currentIssues.length > 0) {
        const issue = this.context.currentIssues[0];
        return `To fix the issue at line ${issue.line}, ${this.getSuggestionForIssue(issue)}`;
      }
      return `Please specify which issue you'd like to fix, or run analysis to detect issues first.`;
    }

    if (lowerMessage.includes('explain') || lowerMessage.includes('what')) {
      return `I can help explain code behavior, error messages, and debugging concepts. What would you like me to explain?`;
    }

    if (lowerMessage.includes('how')) {
      return `I can guide you through debugging steps, suggest best practices, and explain how to use the VR debugging tools. What would you like to know?`;
    }

    // Default response
    return `I understand you're asking about your code. Could you be more specific? You can ask me to explain errors, suggest fixes, or help with debugging strategies.`;
  }

  getSuggestionForIssue(issue) {
    // Generate contextual suggestions based on issue type
    const suggestions = {
      'security': 'consider using environment variables and secure authentication methods.',
      'error': 'add proper error handling with try-catch blocks.',
      'warning': 'review the code logic and apply best practices.',
      'undefined': 'add null/undefined checks before accessing properties.'
    };

    return suggestions[issue.type] || 'review the code and apply best practices.';
  }

  addMessageToHistory(sender, message) {
    const timestamp = new Date().toLocaleTimeString();
    
    this.conversationHistory.push({
      sender,
      message,
      timestamp
    });

    this.renderConversation();
  }

  renderConversation() {
    const container = document.getElementById('conversationContainer');
    if (!container) return;

    // Clear existing messages
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Display last N messages
    const recentMessages = this.conversationHistory.slice(-this.maxHistoryDisplay);
    const yStart = 2.5;
    const messageHeight = 1.2;

    recentMessages.forEach((msg, idx) => {
      const yPos = yStart - (idx * messageHeight);
      this.createMessageBubble(msg, yPos, container);
    });
  }

  createMessageBubble(message, yPos, container) {
    const bubble = document.createElement('a-entity');
    const isUser = message.sender === 'user';
    const xPos = isUser ? 2 : -2;
    
    bubble.setAttribute('position', `${xPos} ${yPos} 0`);

    // Bubble background
    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '4.5');
    bg.setAttribute('height', '1');
    bg.setAttribute('color', isUser ? '#3498db' : '#9b59b6');
    bg.setAttribute('opacity', '0.8');
    bg.setAttribute('side', 'double');

    // Avatar icon
    const avatar = document.createElement('a-text');
    avatar.setAttribute('value', isUser ? '👤' : '🤖');
    avatar.setAttribute('align', isUser ? 'right' : 'left');
    avatar.setAttribute('position', `${isUser ? 2.3 : -2.3} 0.4 0.01`);
    avatar.setAttribute('width', '1');

    // Message text
    const text = document.createElement('a-text');
    const truncatedMsg = message.message.length > 100 
      ? message.message.substring(0, 100) + '...' 
      : message.message;
    
    text.setAttribute('value', truncatedMsg);
    text.setAttribute('align', isUser ? 'right' : 'left');
    text.setAttribute('position', `${isUser ? 2.1 : -2.1} 0 0.01`);
    text.setAttribute('color', '#ffffff');
    text.setAttribute('width', '4');
    text.setAttribute('wrap-count', '40');

    // Timestamp
    const time = document.createElement('a-text');
    time.setAttribute('value', message.timestamp);
    time.setAttribute('align', isUser ? 'right' : 'left');
    time.setAttribute('position', `${isUser ? 2.1 : -2.1} -0.4 0.01`);
    time.setAttribute('color', '#aaaaaa');
    time.setAttribute('width', '3');

    bubble.appendChild(bg);
    bubble.appendChild(avatar);
    bubble.appendChild(text);
    bubble.appendChild(time);

    container.appendChild(bubble);
  }

  showThinkingIndicator() {
    const container = document.getElementById('conversationContainer');
    if (!container) return;

    const thinking = document.createElement('a-entity');
    thinking.setAttribute('id', 'thinkingIndicator');
    thinking.setAttribute('position', '-2 -1 0');

    const dots = document.createElement('a-text');
    dots.setAttribute('value', '🤖 Thinking...');
    dots.setAttribute('align', 'left');
    dots.setAttribute('color', '#9b59b6');
    dots.setAttribute('width', '3');
    
    // Pulsing animation
    dots.setAttribute('animation', {
      property: 'opacity',
      from: '1',
      to: '0.3',
      dur: 1000,
      dir: 'alternate',
      loop: true
    });

    thinking.appendChild(dots);
    container.appendChild(thinking);
  }

  hideThinkingIndicator() {
    const indicator = document.getElementById('thinkingIndicator');
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  speak(text, options = {}) {
    // Cancel any ongoing speech
    if (this.isSpeaking) {
      this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Voice settings
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 0.8;
    utterance.lang = options.lang || 'en-US';

    // Select voice (prefer female voice for AI assistant)
    const voices = this.synthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Google UK English Female') || 
      v.name.includes('Microsoft Zira')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.showSpeakingIndicator();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.hideSpeakingIndicator();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.isSpeaking = false;
      this.hideSpeakingIndicator();
    };

    this.currentUtterance = utterance;
    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.hideSpeakingIndicator();
    }
  }

  showSpeakingIndicator() {
    const title = this.chatPanel.querySelector('a-text[value*="AI ASSISTANT"]');
    if (title) {
      title.setAttribute('value', '🤖 AI ASSISTANT 🔊');
    }
  }

  hideSpeakingIndicator() {
    const title = this.chatPanel.querySelector('a-text[value*="AI ASSISTANT"]');
    if (title) {
      title.setAttribute('value', '🤖 AI ASSISTANT');
    }
  }

  activateVoiceInput() {
    // Use Web Speech API for voice input
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      this.speak('Sorry, voice recognition is not supported in your browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const voiceBtn = document.getElementById('aiVoiceBtn');
    if (voiceBtn) {
      voiceBtn.setAttribute('color', '#ff4444');
    }

    this.speak('Listening...');

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice input:', transcript);
      
      if (voiceBtn) {
        voiceBtn.setAttribute('color', '#9b59b6');
      }

      // Process the voice input
      this.askAI(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      if (voiceBtn) {
        voiceBtn.setAttribute('color', '#9b59b6');
      }
      this.speak('Sorry, I could not understand. Please try again.');
    };

    recognition.onend = () => {
      if (voiceBtn) {
        voiceBtn.setAttribute('color', '#9b59b6');
      }
    };

    recognition.start();
  }

  // Quick suggestions for common questions
  suggestQuestions() {
    const suggestions = [
      "What's wrong with my code?",
      "How do I fix this error?",
      "Explain the issue at line X",
      "What are best practices for this?",
      "Is there a security vulnerability?"
    ];

    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    this.speak(`You could ask me: ${randomSuggestion}`);
  }

  // Export conversation history
  exportHistory() {
    return {
      timestamp: new Date().toISOString(),
      messages: this.conversationHistory,
      context: this.context
    };
  }

  // Clear conversation
  clearHistory() {
    this.conversationHistory = [];
    this.renderConversation();
    this.speak('Conversation history cleared.');
  }
}

export default AIConversationSystem;