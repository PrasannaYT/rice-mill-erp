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

  // Backgrounds
  content = content.replace(/\bbg-slate-50\b/g, 'bg-[var(--bg)]');
  content = content.replace(/\bbg-neutral-50\b/g, 'bg-[var(--surface-2)]');
  content = content.replace(/\bbg-neutral-100\b/g, 'bg-[var(--surface-2)]');
  
  // Texts
  content = content.replace(/\btext-black\b/g, 'text-[var(--text)]');
  content = content.replace(/\btext-neutral-700\b/g, 'text-[var(--text)]');
  content = content.replace(/\btext-neutral-600\b/g, 'text-[var(--muted)]');
  content = content.replace(/\btext-neutral-500\b/g, 'text-[var(--muted)]');
  
  // Borders
  content = content.replace(/\bborder-neutral-200\b/g, 'border-[var(--border)]');
  content = content.replace(/\bborder-neutral-300\b/g, 'border-[var(--border)]');

  // Strip dark: classes since we're using CSS variables now
  content = content.replace(/\bdark:[\w-[\]()#]+\b/g, '');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated more:', file);
  }
});
