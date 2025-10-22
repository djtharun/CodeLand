export class CodeAnalyzer {
  analyzeStatic(code, language) {
    const issues = [];
    const lines = code.split('\n');

    lines.forEach((line, idx) => {
      // JavaScript/TypeScript specific
      if (language === 'javascript' || language === 'typescript') {
        if (line.includes('console.log')) {
          issues.push({
            line: idx + 1,
            type: 'Debug Statement',
            message: 'console.log found - remove before production'
          });
        }
        
        if (line.includes('var ')) {
          issues.push({
            line: idx + 1,
            type: 'Outdated Syntax',
            message: 'Use let/const instead of var'
          });
        }

        if (line.includes('==') && !line.includes('===')) {
          issues.push({
            line: idx + 1,
            type: 'Type Coercion',
            message: 'Use === for strict equality'
          });
        }
      }

      // Python specific
      if (language === 'python') {
        if (line.includes('print(') && !line.trim().startsWith('#')) {
          issues.push({
            line: idx + 1,
            type: 'Debug Statement',
            message: 'print statement found - consider using logging'
          });
        }
      }

      // Common issues
      if (line.trim().startsWith('//TODO') || line.trim().startsWith('#TODO')) {
        issues.push({
          line: idx + 1,
          type: 'Incomplete Code',
          message: 'TODO comment found'
        });
      }

      // Parentheses matching
      const openParen = (line.match(/\(/g) || []).length;
      const closeParen = (line.match(/\)/g) || []).length;
      if (openParen !== closeParen) {
        issues.push({
          line: idx + 1,
          type: 'Syntax Error',
          message: 'Unmatched parentheses'
        });
      }

      // Bracket matching
      const openBracket = (line.match(/\{/g) || []).length;
      const closeBracket = (line.match(/\}/g) || []).length;
      if (openBracket !== closeBracket) {
        issues.push({
          line: idx + 1,
          type: 'Syntax Error',
          message: 'Unmatched braces'
        });
      }
    });

    return issues;
  }

  async analyzeWithAI(code, language) {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          language: language
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseAIResponse(data.suggestions);
      
    } catch (error) {
      console.error('AI Analysis error:', error);
      throw new Error('Failed to connect to AI service. Using static analysis instead.');
    }
  }

  parseAIResponse(aiText) {
    // Parse AI response into structured bug format
    const bugs = [];
    const lines = aiText.split('\n');
    
    let currentBug = null;
    lines.forEach(line => {
      // Look for line numbers in the response
      const lineMatch = line.match(/line\s+(\d+)/i);
      if (lineMatch) {
        if (currentBug) bugs.push(currentBug);
        currentBug = {
          line: parseInt(lineMatch[1]),
          type: 'AI Detected Issue',
          message: ''
        };
      } else if (currentBug) {
        currentBug.message += line.trim() + ' ';
      }
    });
    
    if (currentBug) bugs.push(currentBug);
    
    return bugs.length > 0 ? bugs : [{
      line: 1,
      type: 'AI Analysis',
      message: aiText.substring(0, 200)
    }];
  }
}