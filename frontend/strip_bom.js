const fs = require('fs');
const files = ['package.json', 'tsconfig.json', 'vite.config.ts', 'index.html', 'src/main.tsx', 'src/App.tsx'];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // If the first character is the hidden Byte Order Mark (BOM), slice it off
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Removed hidden BOM from: ' + file);
    }
  }
}
