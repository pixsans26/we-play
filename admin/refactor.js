const fs = require('fs');
const path = require('path');

const files = [
  'src/app/(dashboard)/lottery/page.tsx',
  'src/app/(dashboard)/text-tasks/page.tsx',
  'src/app/(dashboard)/image-tasks/page.tsx',
  'src/app/(dashboard)/spin-wheel/page.tsx',
  'src/app/(dashboard)/profile/page.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  
  if (!content.includes('useSession')) {
    content = content.replace('import { useState', 'import { useSession } from "next-auth/react";\nimport { useState');
    // For profile which might just have useEffect
    content = content.replace('import { useEffect', 'import { useSession } from "next-auth/react";\nimport { useEffect');
  }

  // Inject session hook
  if (!content.includes('const { data: session }')) {
    content = content.replace(/const \[loading, setLoading\] = useState\(true\);/g, 'const [loading, setLoading] = useState(true);\n  const { data: session } = useSession();\n  const token = session?.user ? (session.user as any).backendToken : "";');
  }

  // Replace fetch(API)
  content = content.replace(/await fetch\(API\)/g, 'await fetch(API, { headers: { "Authorization": `Bearer ${token}` } })');
  
  // Replace fetch(API, { method...
  content = content.replace(/await fetch\(API, \{/g, 'await fetch(API, { headers: { "Authorization": `Bearer ${token}` },');
  
  // Replace fetch(`${API}/${id}`...
  content = content.replace(/await fetch\(`\$\{API\}\/\$\{id\}`\, \{/g, 'await fetch(`${API}/${id}`, { headers: { "Authorization": `Bearer ${token}` },');
  
  fs.writeFileSync(f, content);
});
console.log("Refactored files");
