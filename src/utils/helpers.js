export function truncateText(text, maxLength = 100) {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export function getLanguageExtension(language) {
  const extensions = {
    javascript: '.js',
    python: '.py',
    typescript: '.ts',
    java: '.java',
    csharp: '.cs',
    cpp: '.cpp'
  };
  return extensions[language] || '.txt';
}

export function detectLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const languageMap = {
    js: 'javascript',
    py: 'python',
    ts: 'typescript',
    java: 'java',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'cpp'
  };
  return languageMap[ext] || 'javascript';
}