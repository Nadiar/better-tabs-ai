const fs = require('fs');
const path = require('path');

const componentsDir = './components';
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.jsx') && f !== 'ErrorBoundary.jsx');

files.forEach(file => {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add React import if not present
  if (!content.includes('import React')) {
    content = `import React from 'react';\n\n` + content;
  }
  
  // Add export default if not present
  const componentName = file.replace('.jsx', '');
  if (!content.includes('export default')) {
    content += `\n\nexport default ${componentName};`;
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed: ${file}`);
});

console.log('Done!');
