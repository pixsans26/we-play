const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDirs = ['app', 'hooks'];
const excludedFiles = ['_layout.tsx'];

targetDirs.forEach(dir => {
  walkDir(dir, (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
    if (excludedFiles.includes(path.basename(filePath))) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Only process if it contains "await fetch(" or " fetch(" 
    // Wait, regex might be safer
    if (content.includes('fetch(')) {
      // Add import if missing
      if (!content.includes('apiFetch')) {
        content = 'import { apiFetch } from "@/lib/apiClient";\n' + content;
      }
      // Replace fetch( with apiFetch(
      // But only the word fetch followed by (
      content = content.replace(/\bfetch\(/g, 'apiFetch(');
      
      fs.writeFileSync(filePath, content);
      console.log('Updated ' + filePath);
    }
  });
});
