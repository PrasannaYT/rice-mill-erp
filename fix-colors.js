const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace bg-white with bg-[var(--surface)]
  content = content.replace(/\bbg-white\b/g, 'bg-[var(--surface)]');
  
  // Replace text-[var(--ink)] with text-[var(--text)]
  content = content.replace(/text-\[var\(--ink\)\]/g, 'text-[var(--text)]');
  
  // Replace text-neutral-900, text-neutral-800 with text-[var(--text)]
  content = content.replace(/\btext-neutral-900\b/g, 'text-[var(--text)]');
  content = content.replace(/\btext-neutral-800\b/g, 'text-[var(--text)]');

  // Replace border-[var(--ink)] with border-[var(--border)]
  content = content.replace(/border-\[var\(--ink\)\]/g, 'border-[var(--border)]');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
  }
});
