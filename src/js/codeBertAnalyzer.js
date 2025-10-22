// src/js/codeBertAnalyzer.js

class CodeBERTAnalyzer {
  constructor() {
    this.session = null;
    this.tokenizer = null;
    this.isReady = false;
    this.maxLength = 512;
    this.vocabSize = 50265;
    this.vocab = null;
  }

  async initialize() {
    try {
      console.log('Initializing CodeBERT with ONNX Runtime...');
      
      // Check if ONNX Runtime is available
      if (typeof ort === 'undefined') {
        throw new Error('ONNX Runtime not loaded');
      }

      // Load vocabulary for tokenization
      await this.loadVocabulary();
      
      // Initialize tokenizer
      this.tokenizer = this.createBPETokenizer();
      
      // Load ONNX model
      // You need to place the CodeBERT ONNX model in /public/models/
      // Download from: https://huggingface.co/microsoft/codebert-base
      try {
        this.session = await ort.InferenceSession.create('public/models/codebert-base.onnx', {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all'
        });
        console.log('ONNX model loaded successfully');
      } catch (modelError) {
        console.warn('Could not load ONNX model, using fallback analysis:', modelError);
        // Continue with static analysis fallback
      }
      
      this.isReady = true;
      console.log('CodeBERT initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize CodeBERT:', error);
      this.isReady = true; // Still allow static analysis
      return false;
    }
  }

  async loadVocabulary() {
    try {
      // Load vocabulary file (vocab.json)
      const response = await fetch('public/models/vocab.json');
      if (response.ok) {
        this.vocab = await response.json();
        console.log('Vocabulary loaded:', Object.keys(this.vocab).length, 'tokens');
      } else {
        console.warn('Could not load vocabulary, using simplified tokenizer');
        this.vocab = this.createSimplifiedVocab();
      }
    } catch (error) {
      console.warn('Vocabulary loading failed, using simplified tokenizer');
      this.vocab = this.createSimplifiedVocab();
    }
  }

  createSimplifiedVocab() {
    // Simplified vocabulary for fallback
    const specialTokens = {
      '<pad>': 0,
      '<s>': 1,
      '</s>': 2,
      '<unk>': 3,
      '<mask>': 4
    };

    // Add common programming tokens
    const commonTokens = [
      'function', 'var', 'let', 'const', 'if', 'else', 'for', 'while',
      'return', 'class', 'def', 'import', 'from', 'try', 'catch',
      'async', 'await', 'true', 'false', 'null', 'undefined'
    ];

    const vocab = { ...specialTokens };
    let idx = Object.keys(specialTokens).length;
    
    commonTokens.forEach(token => {
      vocab[token] = idx++;
    });

    return vocab;
  }

  createBPETokenizer() {
    return {
      encode: (text) => {
        // Simplified BPE tokenization
        // In production, use a proper BPE tokenizer like tokenizers.js
        const tokens = text.toLowerCase()
          .replace(/([^a-z0-9\s])/g, ' $1 ')
          .split(/\s+/)
          .filter(t => t.length > 0);

        const tokenIds = tokens.map(token => {
          return this.vocab[token] !== undefined ? this.vocab[token] : 3; // <unk>
        });

        // Add special tokens
        const encoded = [1, ...tokenIds, 2]; // <s> ... </s>

        // Pad or truncate to maxLength
        if (encoded.length > this.maxLength) {
          return encoded.slice(0, this.maxLength);
        } else {
          const padding = new Array(this.maxLength - encoded.length).fill(0);
          return [...encoded, ...padding];
        }
      },

      decode: (tokenIds) => {
        const reverseVocab = Object.fromEntries(
          Object.entries(this.vocab).map(([k, v]) => [v, k])
        );
        
        return tokenIds
          .map(id => reverseVocab[id] || '<unk>')
          .filter(token => !['<pad>', '<s>', '</s>'].includes(token))
          .join(' ');
      }
    };
  }

  async analyzeCode(code, language) {
    if (!this.isReady) {
      throw new Error('CodeBERT not initialized');
    }

    console.log(`Analyzing ${language} code with CodeBERT...`);

    try {
      let mlIssues = [];

      // If ONNX model is loaded, use ML-based analysis
      if (this.session) {
        mlIssues = await this.performMLAnalysis(code, language);
      }

      // Perform static analysis
      const staticIssues = this.performStaticAnalysis(code, language);
      
      // Perform pattern-based bug detection
      const patternIssues = this.detectCommonPatterns(code, language);
      
      // Combine all results
      const allIssues = [...mlIssues, ...staticIssues, ...patternIssues];
      
      // Remove duplicates based on line number and message
      const uniqueIssues = this.deduplicateIssues(allIssues);
      
      return {
        success: true,
        issues: uniqueIssues,
        summary: this.generateSummary(uniqueIssues),
        metrics: this.calculateMetrics(code),
        mlEnabled: this.session !== null
      };
    } catch (error) {
      console.error('CodeBERT analysis error:', error);
      throw error;
    }
  }

  async performMLAnalysis(code, language) {
    const issues = [];

    try {
      // Tokenize the code
      const inputIds = this.tokenizer.encode(code);
      
      // Create attention mask
      const attentionMask = inputIds.map(id => id !== 0 ? 1 : 0);

      // Create tensors for ONNX model
      const inputIdsTensor = new ort.Tensor('int64', BigInt64Array.from(inputIds.map(BigInt)), [1, this.maxLength]);
      const attentionMaskTensor = new ort.Tensor('int64', BigInt64Array.from(attentionMask.map(BigInt)), [1, this.maxLength]);

      // Run inference
      const feeds = {
        input_ids: inputIdsTensor,
        attention_mask: attentionMaskTensor
      };

      const results = await this.session.run(feeds);
      
      // Process model outputs
      // CodeBERT outputs embeddings that can be used for various tasks
      const embeddings = results.last_hidden_state.data;
      
      // Analyze embeddings for anomalies
      // This is a simplified approach - in production, you'd fine-tune on bug detection
      const anomalies = this.detectAnomaliesFromEmbeddings(embeddings, code);
      
      anomalies.forEach(anomaly => {
        issues.push({
          type: 'ml-warning',
          line: anomaly.line,
          message: `ML Analysis: ${anomaly.message}`,
          severity: 'medium',
          confidence: anomaly.confidence
        });
      });

    } catch (error) {
      console.error('ML analysis error:', error);
      // Don't throw, just continue with static analysis
    }

    return issues;
  }

  detectAnomaliesFromEmbeddings(embeddings, code) {
    // Simplified anomaly detection based on embedding patterns
    // In production, you'd use a trained classifier
    const anomalies = [];
    const lines = code.split('\n');
    
    // Calculate average embedding values per line
    const embeddingsPerToken = 768; // CodeBERT hidden size
    const tokensPerLine = Math.floor(this.maxLength / lines.length);

    lines.forEach((line, idx) => {
      const startIdx = idx * tokensPerLine * embeddingsPerToken;
      const endIdx = startIdx + tokensPerLine * embeddingsPerToken;
      
      if (startIdx >= embeddings.length) return;

      const lineEmbeddings = Array.from(embeddings.slice(startIdx, endIdx));
      const avgEmbedding = lineEmbeddings.reduce((a, b) => a + b, 0) / lineEmbeddings.length;
      
      // Detect unusual patterns (this is simplified)
      // High variance or extreme values might indicate problematic code
      if (Math.abs(avgEmbedding) > 0.5) {
        anomalies.push({
          line: idx + 1,
          message: 'Unusual code pattern detected',
          confidence: Math.min(Math.abs(avgEmbedding), 1.0)
        });
      }
    });

    return anomalies;
  }

  performStaticAnalysis(code, language) {
    const issues = [];
    const lines = code.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        return;
      }

      // Language-specific analysis
      if (language === 'javascript' || language === 'typescript') {
        this.analyzeJavaScript(line, lineNum, lines, issues);
      } else if (language === 'python') {
        this.analyzePython(line, lineNum, lines, issues);
      } else if (language === 'java') {
        this.analyzeJava(line, lineNum, lines, issues);
      }

      // Common issues across languages
      this.analyzeCommonIssues(line, lineNum, code, issues);
    });

    return issues;
  }

  analyzeJavaScript(line, lineNum, lines, issues) {
    // Unused variables
    if (line.match(/^\s*(let|const|var)\s+(\w+)\s*=/)) {
      const varName = line.match(/\s+(\w+)\s*=/)?.[1];
      const remainingCode = lines.slice(lineNum).join('\n');
      if (varName && !remainingCode.includes(varName)) {
        issues.push({
          type: 'warning',
          line: lineNum,
          message: `Variable '${varName}' may be unused`,
          severity: 'low'
        });
      }
    }

    // Missing error handling for async
    if (line.includes('await') && !lines.slice(Math.max(0, lineNum - 5), lineNum + 5).join('\n').includes('try')) {
      issues.push({
        type: 'error',
        line: lineNum,
        message: 'Async operation without try-catch block',
        severity: 'high'
      });
    }

    // Console.log in production
    if (line.includes('console.log')) {
      issues.push({
        type: 'info',
        line: lineNum,
        message: 'Console.log statement - remove for production',
        severity: 'low'
      });
    }

    // == instead of ===
    if (line.match(/[^=!]==[^=]/) || line.match(/!=[^=]/)) {
      issues.push({
        type: 'warning',
        line: lineNum,
        message: 'Use === or !== instead of == or !=',
        severity: 'medium'
      });
    }

    // Missing semicolons (if preferred)
    if (line.match(/\w+\s*$/) && !line.includes('{') && !line.includes('}')) {
      // This is optional based on coding style
    }

    // Callback hell indicator
    if (line.match(/\)\s*\{\s*$/)) {
      const indent = line.match(/^\s*/)[0].length;
      if (indent > 16) {
        issues.push({
          type: 'warning',
          line: lineNum,
          message: 'Deep nesting detected - consider refactoring',
          severity: 'medium'
        });
      }
    }
  }

  analyzePython(line, lineNum, lines, issues) {
    // Missing except clause
    if (line.includes('try:') && !lines.slice(lineNum, lineNum + 10).join('\n').includes('except')) {
      issues.push({
        type: 'error',
        line: lineNum,
        message: 'Try block without except clause',
        severity: 'high'
      });
    }

    // Bare except
    if (line.match(/except\s*:/)) {
      issues.push({
        type: 'warning',
        line: lineNum,
        message: 'Bare except clause catches all exceptions - be specific',
        severity: 'medium'
      });
    }

    // Global variables
    if (line.match(/^global\s+\w+/)) {
      issues.push({
        type: 'warning',
        line: lineNum,
        message: 'Global variable usage - consider alternatives',
        severity: 'low'
      });
    }
  }

  analyzeJava(line, lineNum, lines, issues) {
    // Missing exception handling
    if (line.includes('throw new') && !lines.slice(Math.max(0, lineNum - 5), lineNum).join('\n').includes('throws')) {
      issues.push({
        type: 'warning',
        line: lineNum,
        message: 'Exception thrown but not declared in method signature',
        severity: 'medium'
      });
    }

    // System.out.println
    if (line.includes('System.out.println')) {
      issues.push({
        type: 'info',
        line: lineNum,
        message: 'Use logging framework instead of System.out.println',
        severity: 'low'
      });
    }
  }

  analyzeCommonIssues(line, lineNum, code, issues) {
    // SQL injection risk
    if (line.match(/query\s*\(.*\+.*\)/) || line.match(/execute\s*\(.*\+.*\)/)) {
      issues.push({
        type: 'security',
        line: lineNum,
        message: 'Possible SQL injection - use parameterized queries',
        severity: 'critical'
      });
    }

    // Hardcoded credentials
    if (line.match(/password\s*[=:]\s*['"]/) || line.match(/api[_-]?key\s*[=:]\s*['"]/i)) {
      issues.push({
        type: 'security',
        line: lineNum,
        message: 'Hardcoded credentials detected - use environment variables',
        severity: 'critical'
      });
    }

    // Missing null checks
    if (line.match(/\.\w+\(/) && !line.includes('?.') && !line.includes('if ') && !line.includes('null')) {
      const surroundingLines = code.split('\n').slice(Math.max(0, lineNum - 3), lineNum + 3).join('\n');
      if (!surroundingLines.includes('null') && !surroundingLines.includes('undefined')) {
        issues.push({
          type: 'warning',
          line: lineNum,
          message: 'Potential null/undefined reference - add checks',
          severity: 'medium'
        });
      }
    }

    // TODO/FIXME comments
    if (line.match(/\/\/\s*(TODO|FIXME|HACK|XXX)/i)) {
      issues.push({
        type: 'info',
        line: lineNum,
        message: 'Code comment indicates work needed',
        severity: 'low'
      });
    }
  }

  detectCommonPatterns(code, language) {
    const issues = [];

    // Detect infinite loops
    const loopPattern = /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/g;
    let match;
    while ((match = loopPattern.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      const context = code.substring(match.index, match.index + 100);
      if (!context.includes('break') && !context.includes('return')) {
        issues.push({
          type: 'error',
          line: lineNum,
          message: 'Infinite loop detected - ensure break/return condition exists',
          severity: 'high'
        });
      }
    }

    // Detect memory leaks (event listeners)
    if (code.includes('addEventListener') && !code.includes('removeEventListener')) {
      const lineNum = code.indexOf('addEventListener');
      issues.push({
        type: 'warning',
        line: code.substring(0, lineNum).split('\n').length,
        message: 'Event listeners without cleanup - potential memory leak',
        severity: 'medium'
      });
    }

    // Detect eval usage
    if (code.includes('eval(')) {
      const lineNum = code.substring(0, code.indexOf('eval(')).split('\n').length;
      issues.push({
        type: 'security',
        line: lineNum,
        message: 'eval() usage detected - major security risk',
        severity: 'critical'
      });
    }

    // Detect recursive functions without base case
    const functionPattern = /function\s+(\w+)\s*\([^)]*\)\s*\{/g;
    while ((match = functionPattern.exec(code)) !== null) {
      const funcName = match[1];
      const funcStart = match.index;
      const funcBody = this.extractFunctionBody(code, funcStart);
      
      if (funcBody.includes(funcName) && !funcBody.includes('return') && !funcBody.includes('if')) {
        const lineNum = code.substring(0, funcStart).split('\n').length;
        issues.push({
          type: 'error',
          line: lineNum,
          message: `Recursive function '${funcName}' may lack base case`,
          severity: 'high'
        });
      }
    }

    return issues;
  }

  extractFunctionBody(code, startIndex) {
    let depth = 0;
    let inFunction = false;
    let body = '';

    for (let i = startIndex; i < code.length; i++) {
      const char = code[i];
      if (char === '{') {
        depth++;
        inFunction = true;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && inFunction) {
          break;
        }
      }
      if (inFunction) {
        body += char;
      }
    }

    return body;
  }

  deduplicateIssues(issues) {
    const seen = new Set();
    return issues.filter(issue => {
      const key = `${issue.line}:${issue.message}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  generateSummary(issues) {
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;
    const lowCount = issues.filter(i => i.severity === 'low').length;

    const securityCount = issues.filter(i => i.type === 'security').length;
    const errorCount = issues.filter(i => i.type === 'error').length;

    return {
      total: issues.length,
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      security: securityCount,
      errors: errorCount,
      message: issues.length === 0 
        ? '✓ No issues detected! Code looks good.' 
        : `Found ${issues.length} issue(s): ${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low`
    };
  }

  calculateMetrics(code) {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(l => l.trim().length > 0).length;
    const commentLines = lines.filter(l => {
      const trimmed = l.trim();
      return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
    }).length;
    
    return {
      totalLines: lines.length,
      codeLines: nonEmptyLines - commentLines,
      commentLines: commentLines,
      blankLines: lines.length - nonEmptyLines,
      complexity: this.calculateCyclomaticComplexity(code),
      commentRatio: commentLines / Math.max(nonEmptyLines, 1)
    };
  }

  calculateCyclomaticComplexity(code) {
  // McCabe's Cyclomatic Complexity
  const keywords = ['if', 'else', 'for', 'while', 'case', 'catch'];
  const operators = ['&&', '||', '?'];
  
  let complexity = 1;
  
  // Count keyword occurrences
  keywords.forEach(keyword => {
    const pattern = new RegExp('\\b' + keyword + '\\b', 'g');
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  });
  
  // Count operator occurrences (escape special regex characters)
  operators.forEach(operator => {
    const escapedOp = operator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escapedOp, 'g');
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  });

  return complexity;
} 

  formatForVR(analysisResult) {
    const { issues, summary, metrics, mlEnabled } = analysisResult;
    
    let output = `╔═══ CODEBERT ANALYSIS ═══╗\n\n`;
    output += mlEnabled ? '🤖 ML-Enhanced Analysis Active\n\n' : '📊 Static Analysis Mode\n\n';
    output += `${summary.message}\n\n`;
    
    output += `📈 Code Metrics:\n`;
    output += `├─ Total Lines: ${metrics.totalLines}\n`;
    output += `├─ Code Lines: ${metrics.codeLines}\n`;
    output += `├─ Comments: ${metrics.commentLines} (${(metrics.commentRatio * 100).toFixed(1)}%)\n`;
    output += `├─ Blank Lines: ${metrics.blankLines}\n`;
    output += `└─ Complexity: ${metrics.complexity}\n\n`;

    if (issues.length > 0) {
      output += `🔍 Issues Found:\n\n`;
      
      // Group by severity
      const grouped = {
        critical: issues.filter(i => i.severity === 'critical'),
        high: issues.filter(i => i.severity === 'high'),
        medium: issues.filter(i => i.severity === 'medium'),
        low: issues.filter(i => i.severity === 'low')
      };

      Object.entries(grouped).forEach(([severity, severityIssues]) => {
        if (severityIssues.length === 0) return;

        const icon = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🔵'
        };

        output += `${icon[severity]} ${severity.toUpperCase()} (${severityIssues.length}):\n`;
        
        severityIssues.forEach((issue, idx) => {
          const typeIcon = {
            security: '🔒',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            'ml-warning': '🤖'
          };
          
          output += `  ${idx + 1}. Line ${issue.line} ${typeIcon[issue.type] || '•'}\n`;
          output += `     ${issue.message}\n`;
          if (issue.confidence) {
            output += `     Confidence: ${(issue.confidence * 100).toFixed(0)}%\n`;
          }
          output += `\n`;
        });
      });
    } else {
      output += `✅ Excellent! No issues detected.\n`;
      output += `   Your code follows best practices.\n`;
    }

    return output;
  }
}

export default CodeBERTAnalyzer;