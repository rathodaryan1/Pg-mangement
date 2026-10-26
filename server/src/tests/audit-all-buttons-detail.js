const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(scanDir(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const clientDir = path.join(__dirname, '..', '..', '..', 'client', 'src');
const pagesDir = path.join(clientDir, 'pages');
const componentsDir = path.join(clientDir, 'components');

const files = [...scanDir(pagesDir), ...scanDir(componentsDir)];

console.log(`Auditing ${files.length} UI files in client/src/pages and components...`);

const trueDeadButtons = [];
let totalButtons = 0;
let totalSubmits = 0;
let totalOnClicks = 0;
let totalLinkButtons = 0;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const relPath = path.relative(clientDir, f);
  
  if (relPath === 'components\\ui\\Button.tsx') return; // Skip Button component definition itself

  // Find all <Button and <button tags
  const regex = /(<(?:Link|a)\b[^>]*>[\s\S]*?)?(<(?:Button|button)\b([^>]*)(?:\/?>|>([\s\S]*?)<\/(?:Button|button)>))/g;
  
  // A cleaner approach: parse occurrences with line numbers
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if ((line.includes('<Button') || line.includes('<button')) && !line.includes('//')) {
      totalButtons++;
      
      // Look at the context around this line (previous 5 lines and next 5 lines)
      const context = lines.slice(Math.max(0, i - 4), Math.min(lines.length, i + 6)).join('\n');
      
      const hasOnClick = /onClick=\{/.test(context);
      const hasTypeSubmit = /type=['"]submit['"]/.test(context);
      const isInsideLink = /<(?:Link|a)\b/.test(lines.slice(Math.max(0, i - 4), i + 1).join('\n'));
      
      if (hasTypeSubmit) {
        totalSubmits++;
      } else if (hasOnClick) {
        totalOnClicks++;
      } else if (isInsideLink) {
        totalLinkButtons++;
      } else {
        trueDeadButtons.push({
          file: relPath,
          line: i + 1,
          snippet: line.trim()
        });
      }
    }
  }
});

console.log(`--- BUTTON AUDIT RESULTS ---`);
console.log(`Total Button elements: ${totalButtons}`);
console.log(`Form Submit Buttons: ${totalSubmits}`);
console.log(`Direct Interactive (onClick) Buttons: ${totalOnClicks}`);
console.log(`Navigation (inside Link/a) Buttons: ${totalLinkButtons}`);
console.log(`Unclassified / Potentially Inactive Buttons: ${trueDeadButtons.length}`);

if (trueDeadButtons.length > 0) {
  console.log(`\nReviewing potentially inactive buttons:`);
  trueDeadButtons.forEach(b => {
    console.log(`- ${b.file}:${b.line} -> ${b.snippet}`);
  });
} else {
  console.log(`\nAll buttons are accounted for (Submit, Interactive, or Navigational)!`);
}
