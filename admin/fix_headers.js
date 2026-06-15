const fs = require('fs');

const files = [
  'src/app/(dashboard)/lottery/page.tsx',
  'src/app/(dashboard)/text-tasks/page.tsx',
  'src/app/(dashboard)/image-tasks/page.tsx',
  'src/app/(dashboard)/spin-wheel/page.tsx',
  'src/app/(dashboard)/profile/page.tsx',
  'src/app/(dashboard)/users/page.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  content = content.replace(/\{ headers: \{ \"Authorization\": \`Bearer \$\{token\}\` \}, headers: \{ \"Authorization\": \`Bearer \$\{token\}\` \} \}/g, '{ headers: { "Authorization": `Bearer ${token}` } }');
  
  // also fix double method/body
  content = content.replace(/\{ headers: \{ \"Authorization\": \`Bearer \$\{token\}\` \},method:/g, '{ headers: { "Authorization": `Bearer ${token}` }, method:');
  
  fs.writeFileSync(f, content);
});
console.log("Fixed headers");
