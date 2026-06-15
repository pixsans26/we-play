const fs = require('fs');

const files = [
  'src/app/(dashboard)/lottery/page.tsx',
  'src/app/(dashboard)/text-tasks/page.tsx',
  'src/app/(dashboard)/spin-wheel/page.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  content = content.replace(/headers: \{ \"Authorization\": \`Bearer \$\{token\}\` \},\n\s*method: \"POST\",\n\s*headers: \{ \"Content-Type\": \"application\/json\" \}/g, 'method: "POST",\n      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }');
  
  fs.writeFileSync(f, content);
});
console.log("Fixed headers 2");
