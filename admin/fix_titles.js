const fs = require('fs');
const path = require('path');

const dir = 'src/app/(dashboard)';

function walkDir(dirPath) {
  fs.readdirSync(dirPath).forEach(f => {
    let fullPath = path.join(dirPath, f);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('text-[32px] font-bold')) {
        content = content.replace(/text-\[32px\] font-bold text-slate-900/g, 'text-2xl font-normal text-slate-800 tracking-tight');
        fs.writeFileSync(fullPath, content);
      }
    }
  });
}

walkDir(dir);
console.log("Updated titles!");
