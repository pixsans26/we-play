const fs = require('fs');
const path = require('path');

const directory = './app/(game)';
const files = fs.readdirSync(directory);

files.forEach(file => {
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    const filePath = path.join(directory, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace fontWeight: "900" or "800" or "bold" near a fontSize of 20+
    content = content.replace(/(fontSize:\s*(?:2[0-9]|3[0-9])\s*,\s*fontWeight:\s*"(?:900|800|bold)")/g, '$1, fontFamily: "DynaPuff_700Bold"');
    content = content.replace(/(fontWeight:\s*"(?:900|800|bold)"\s*,\s*letterSpacing:[^,]+)(?=\s*})/g, '$1, fontFamily: "DynaPuff_700Bold"');
    content = content.replace(/fontWeight:\s*"(?:900|800|bold)"\s*,\s*marginBottom:\s*\d+/g, match => match + ', fontFamily: "DynaPuff_700Bold"');
    
    // Also cover reversed: fontWeight: "900", letterSpacing: -0.4 
    content = content.replace(/(fontWeight:\s*"(?:900|800|bold)")(?!.*fontFamily)/g, '$1, fontFamily: "DynaPuff_700Bold"');

    fs.writeFileSync(filePath, content);
  }
});
console.log("Font applied!");
