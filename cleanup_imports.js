const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.jsx') || file.endsWith('.js')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles('d:/Projects/FinSathi/frontend/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;

  // 1. Remove "import React from 'react';" or "import React, { ... } from 'react';"
  // We only remove the "React, " part if React is not used in the code.
  // Actually, let's just target the most common "import React, { ... } from 'react'" -> "import { ... } from 'react'"
  // and "import React from 'react'" -> nothing.
  
  const reactImportRegex = /import\s+React\s*(?:,\s*\{([^}]+)\})?\s*from\s*['"]react['"];?/g;
  
  content = content.replace(reactImportRegex, (match, namedImports) => {
    // Check if 'React' is used as a word elsewhere in the code
    const restOfContent = content.replace(match, '');
    const isReactUsed = /\bReact\b/.test(restOfContent);
    
    if (!isReactUsed) {
      if (namedImports) {
        return `import { ${namedImports} } from 'react';`;
      } else {
        return '';
      }
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Cleaned: ${file}`);
  }
});
