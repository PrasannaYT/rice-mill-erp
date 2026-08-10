const fs = require('fs');

const files = [
  'o:/webapp/src/repositories/userRepository.ts',
  'o:/webapp/src/repositories/packingItemRepository.ts',
  'o:/webapp/src/repositories/masterDataRepository.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\.findMany\(\{\s*/g, '.findMany({ take: 1000, ');
  fs.writeFileSync(file, content);
}
console.log('Fixed findMany');
