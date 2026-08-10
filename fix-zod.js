const fs = require('fs');
const files = [
  'o:/webapp/src/app/actions/masterData.ts',
  'o:/webapp/src/app/actions/packingItem.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/parsed\.error\.errors/g, 'parsed.error.issues');
  fs.writeFileSync(file, content);
}
console.log('Fixed zod errors');
