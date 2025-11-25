// src/js/codeBertAnalyzer.js - Enhanced CodeBERT Integration

class CodeBERTAnalyzer {
  constructor() {
    this.session = null;
    this.tokenizer = null;
    this.isReady = false;
    this.maxLength = 512;
    this.vocabSize = 50265;
    this.vocab = null;
    this.hiddenSize = 768; // CodeBERT hidden dimension
  }

  async initialize() {
    try {
      console.log('Initializing CodeBERT with ONNX Runtime...');
      
      if (typeof ort === 'undefined') {
        throw new Error('ONNX Runtime not loaded');
      }

      // Load vocabulary
      await this.loadVocabulary();
      
      // Initialize tokenizer
      this.tokenizer = this.createBPETokenizer();
      
      // Load ONNX model - FIXED PATH
      try {
        this.session = await ort.InferenceSession.create('/models/codebert-base.onnx', {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all'
        });
        console.log('✅ ONNX model loaded successfully');
      } catch (modelError) {
        console.warn('⚠️  Could not load ONNX model, using fallback analysis:', modelError);
        console.log('Make sure to run: python convert_codebert.py');
      }
      
      this.isReady = true;
      console.log('✅ CodeBERT initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize CodeBERT:', error);
      this.isReady = true; // Still allow static analysis
      return false;
    }
  }

  async loadVocabulary() {
    try {
      // FIXED PATH - remove 'public/' prefix
      const response = await fetch('/models/vocab.json');
      if (response.ok) {
        this.vocab = await response.json();
        console.log('✅ Vocabulary loaded:', Object.keys(this.vocab).length, 'tokens');
      } else {
        console.warn('⚠️  Could not load vocabulary, using simplified tokenizer');
        this.vocab = this.createSimplifiedVocab();
      }
    } catch (error) {
      console.warn('Vocabulary loading failed, using simplified tokenizer');
      this.vocab = this.createSimplifiedVocab();
    }
  }

  createSimplifiedVocab() {
    const specialTokens = {
      '<pad>': 0,
      '<s>': 1,
      '</s>': 2,
      '<unk>': 3,
      '<mask>': 4
    };

    const commonTokens = [
      'function', 'var', 'let', 'const', 'if', 'else', 'for', 'while',
      'return', 'class', 'def', 'import', 'from', 'try', 'catch',
      'async', 'await', 'true', 'false', 'null', 'undefined',
      '(', ')', '{', '}', '[', ']', ';', ':', ',', '.',
      '=', '==', '===', '!=', '!==', '+', '-', '*', '/',
      'console', 'log', 'error', 'warn', 'this', 'new'
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
        // Enhanced tokenization with better code handling
        const tokens = text.toLowerCase()
          .replace(/([^a-z0-9\s_])/g, ' $1 ')
          .split(/\s+/)
          .filter(t => t.length > 0);

        const tokenIds = tokens.map(token => {
          return this.vocab[token] !== undefined ? this.vocab[token] : 3;
        });

        // Add special tokens
        const encoded = [1, ...tokenIds, 2]; // <s> ... </s>

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
      
      // Remove duplicates
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

      // Create tensors - FIXED: Use Int64Array
      const inputIdsTensor = new ort.Tensor('int64', 
        new BigInt64Array(inputIds.map(x => BigInt(x))), 
        [1, this.maxLength]
      );
      const attentionMaskTensor = new ort.Tensor('int64', 
        new BigInt64Array(attentionMask.map(x => BigInt(x))), 
        [1, this.maxLength]
      );

      // Run inference
      const feeds = {
        input_ids: inputIdsTensor,
        attention_mask: attentionMaskTensor
      };

      console.log('Running CodeBERT inference...');
      const results = await this.session.run(feeds);
      
      // Process embeddings with IMPROVED analysis
      const embeddings = results.last_hidden_state.data;
      
      // Enhanced anomaly detection
      const anomalies = this.detectAnomaliesFromEmbeddings(
        embeddings, 
        code, 
        inputIds, 
        attentionMask
      );
      
      anomalies.forEach(anomaly => {
        issues.push({
          type: 'ml-warning',
          line: anomaly.line,
          message: `🤖 ML Analysis: ${anomaly.message}`,
          severity: anomaly.severity,
          confidence: anomaly.confidence
        });
      });

      console.log(`✅ ML Analysis found ${issues.length} potential issues`);

    } catch (error) {
      console.error('ML analysis error:', error);
    }

    return issues;
  }

  detectAnomaliesFromEmbeddings(embeddings, code, inputIds, attentionMask) {
    const anomalies = [];
    const lines = code.split('\n');
    
    // Calculate embeddings statistics per line
    const tokensPerLine = Math.floor(this.maxLength / Math.max(lines.length, 1));
    
    // Analyze each line's embedding characteristics
    lines.forEach((line, idx) => {
      if (line.trim().length === 0) return;
      
      const startToken = idx * tokensPerLine;
      const endToken = Math.min(startToken + tokensPerLine, this.maxLength);
      
      if (startToken >= embeddings.length) return;

      // Extract embeddings for this line
      const lineEmbeddings = [];
      for (let t = startToken; t < endToken; t++) {
        const embStart = t * this.hiddenSize;
        const embEnd = embStart + this.hiddenSize;
        if (embEnd <= embeddings.length) {
          lineEmbeddings.push(
            Array.from(embeddings.slice(embStart, embEnd))
          );
        }
      }

      if (lineEmbeddings.length === 0) return;

      // Calculate statistics
      const stats = this.calculateEmbeddingStats(lineEmbeddings);
      
      // IMPROVED: Multi-factor anomaly detection
      const anomalyScore = this.calculateAnomalyScore(stats, line, language);
      
      if (anomalyScore.score > 0.6) {
        anomalies.push({
          line: idx + 1,
          message: anomalyScore.reason,
          confidence: anomalyScore.score,
          severity: this.getSeverityFromScore(anomalyScore.score)
        });
      }
    });

    return anomalies;
  }

  calculateEmbeddingStats(lineEmbeddings) {
    // Calculate mean vector
    const mean = new Array(this.hiddenSize).fill(0);
    lineEmbeddings.forEach(emb => {
      emb.forEach((val, i) => {
        mean[i] += val;
      });
    });
    mean.forEach((val, i) => {
      mean[i] /= lineEmbeddings.length;
    });

    // Calculate variance
    const variance = new Array(this.hiddenSize).fill(0);
    lineEmbeddings.forEach(emb => {
      emb.forEach((val, i) => {
        variance[i] += Math.pow(val - mean[i], 2);
      });
    });
    variance.forEach((val, i) => {
      variance[i] /= lineEmbeddings.length;
    });

    // Calculate L2 norm
    const norm = Math.sqrt(mean.reduce((sum, val) => sum + val * val, 0));

    // Calculate entropy (measure of uncertainty)
    const softmax = mean.map(val => Math.exp(val));
    const sumExp = softmax.reduce((a, b) => a + b, 0);
    const probs = softmax.map(val => val / sumExp);
    const entropy = -probs.reduce((sum, p) => {
      return p > 0 ? sum + p * Math.log(p) : sum;
    }, 0);

    return {
      mean,
      variance,
      norm,
      entropy,
      avgVariance: variance.reduce((a, b) => a + b, 0) / variance.length
    };
  }

  calculateAnomalyScore(stats, line, language) {
    let score = 0;
    let reasons = [];

    // Factor 1: High variance suggests uncertain/unusual patterns
    if (stats.avgVariance > 0.8) {
      score += 0.3;
      reasons.push('unusual code pattern detected');
    }

    // Factor 2: Very high or very low norm
    if (stats.norm > 10 || stats.norm < 0.5) {
      score += 0.2;
      reasons.push('atypical semantic structure');
    }

    // Factor 3: High entropy suggests complex/confusing code
    if (stats.entropy > 6.0) {
      score += 0.25;
      reasons.push('complex logic structure');
    }

    // Factor 4: Code-specific heuristics
    if (line.includes('eval(')) {
      score += 0.4;
      reasons.push('dangerous eval() usage');
    }
    if (line.match(/password|apikey|secret/i) && line.includes('=')) {
      score += 0.5;
      reasons.push('possible credential exposure');
    }
    if (line.includes('innerHTML') || line.includes('outerHTML')) {
      score += 0.3;
      reasons.push('potential XSS vulnerability');
    }

    // Factor 5: Language-specific patterns
    if (language === 'javascript') {
      if (line.includes('==') && !line.includes('===')) {
        score += 0.2;
        reasons.push('loose equality comparison');
      }
      if (line.match(/var\s+\w+/)) {
        score += 0.15;
        reasons.push('outdated var declaration');
      }
    }

    return {
      score: Math.min(score, 1.0),
      reason: reasons.join(', ')
    };
  }

  getSeverityFromScore(score) {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  performStaticAnalysis(code, language) {
    const issues = [];
    const lines = code.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        return;
      }

      if (language === 'javascript' || language === 'typescript') {
        this.analyzeJavaScript(line, lineNum, lines, issues);
      } else if (language === 'python') {
        this.analyzePython(line, lineNum, lines, issues);
      } else if (language === 'java') {
        this.analyzeJava(line, lineNum, lines, issues);
      }

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

    // Missing error handling
    if (line.includes('await') && !lines.slice(Math.max(0, lineNum - 5), lineNum + 5).join('\n').includes('try')) {
      issues.push({
        type: 'error',
        line: lineNum,
        message: 'Async operation without try-catch block',
        severity: 'high'
      });
    }

    // Console statements
    if (line.includes('console.log')) {
      issues.push({
        type: 'info',
        line: lineNum,
        message: 'Console.log statement - remove for production',
        severity: 'low'
      });
    }

    // Loose equality
    if (line.match(/[^=!]==[^=]/) || line.match(/!=[^=]/)) {
      issues.push({
        type: 'warning',
        line: lineNum,
        message: 'Use === or !== instead of == or !=',
        severity: 'medium'
      });
    }

    // Deep nesting
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
    if (line.includes('try:') && !lines.slice(lineNum, lineNum + 10).join('\n').includes('except')) {
      issues.push({
        type: 'error',
        line: lineNum,
        message: 'Try block without except clause',
        severity: 'high'
      });
    }

    if (line.match(/except\s*:/)) {
      issues.push({
        type: 'warning',
        line: lineNum,
        message: 'Bare except clause catches all exceptions',
        severity: 'medium'
      });
    }
  }

  analyzeJava(line, lineNum, lines, issues) {
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
    // SQL injection
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
        message: 'Hardcoded credentials - use environment variables',
        severity: 'critical'
      });
    }

    // TODO comments
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

    // Infinite loops
    const loopPattern = /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/g;
    let match;
    while ((match = loopPattern.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      const context = code.substring(match.index, match.index + 100);
      if (!context.includes('break') && !context.includes('return')) {
        issues.push({
          type: 'error',
          line: lineNum,
          message: 'Infinite loop detected',
          severity: 'high'
        });
      }
    }

    // Memory leaks
    if (code.includes('addEventListener') && !code.includes('removeEventListener')) {
      issues.push({
        type: 'warning',
        line: code.indexOf('addEventListener') ? code.substring(0, code.indexOf('addEventListener')).split('\n').length : 1,
        message: 'Event listeners without cleanup',
        severity: 'medium'
      });
    }

    // eval() usage
    if (code.includes('eval(')) {
      issues.push({
        type: 'security',
        line: code.substring(0, code.indexOf('eval(')).split('\n').length,
        message: 'eval() usage detected - major security risk',
        severity: 'critical'
      });
    }

    return issues;
  }

  deduplicateIssues(issues) {
    const seen = new Set();
    return issues.filter(issue => {
      const key = `${issue.line}:${issue.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  generateSummary(issues) {
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;
    const lowCount = issues.filter(i => i.severity === 'low').length;

    return {
      total: issues.length,
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      message: issues.length === 0 
        ? '✅ No issues detected! Code looks good.' 
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
    const keywords = ['if', 'else', 'for', 'while', 'case', 'catch'];
    const operators = ['&&', '||', '?'];
    
    let complexity = 1;
    
    keywords.forEach(keyword => {
      const pattern = new RegExp('\\b' + keyword + '\\b', 'g');
      const matches = code.match(pattern);
      if (matches) complexity += matches.length;
    });
    
    operators.forEach(operator => {
      const escapedOp = operator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(escapedOp, 'g');
      const matches = code.match(pattern);
      if (matches) complexity += matches.length;
    });

    return complexity;
  }

  formatForVR(analysisResult) {
    const { issues, summary, metrics, mlEnabled } = analysisResult;
    
    let output = `╔══ CODEBERT ANALYSIS ══╗\n\n`;
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
    }

    return output;
  }
}

export default CodeBERTAnalyzer;