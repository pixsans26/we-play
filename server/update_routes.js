const fs = require('fs');
const content = fs.readFileSync('src/index.ts', 'utf-8');

const updated = content.replace(/app\.(get|post|delete)\(\"(\/api\/[^\"]+)\"\, /g, (match, method, path) => {
  if (path === '/api/auth/token' || match.includes('authenticateToken')) return match;
  return `app.${method}("${path}", authenticateToken, `;
});

fs.writeFileSync('src/index.ts', updated);
console.log("Updated routes!");
