const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', '..', '..', 'client', 'src', 'pages');

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

const files = scanDir(pagesDir);
console.log(`Found ${files.length} page/component files in client/src/pages`);

const auditResults = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(path.join(__dirname, '..', '..', '..', 'client'), file);
  
  // Count buttons
  const buttonMatches = content.match(/<button[\s\S]*?>/g) || [];
  const onClickMatches = content.match(/onClick=\{/g) || [];
  const onSubmitMatches = content.match(/onSubmit=\{/g) || [];
  const formMatches = content.match(/<form[\s\S]*?>/g) || [];

  // Check for suspicious patterns:
  // e.g., console.log inside onClick, TODO, alert(, empty handlers () => {}
  const todoMatches = content.match(/\/\/\s*TODO[\s\S]*?$/gm) || [];
  const emptyHandlers = content.match(/onClick=\{[\s\(\)]*=>\s*\{?\s*\}?\}/g) || [];
  const consoleLogHandlers = content.match(/onClick=\{[\s\(\)]*=>\s*console\.log\([^)]*\)\}/g) || [];
  const windowAlerts = content.match(/alert\(/g) || [];

  auditResults.push({
    file: relPath,
    buttons: buttonMatches.length,
    onClicks: onClickMatches.length,
    forms: formMatches.length,
    onSubmits: onSubmitMatches.length,
    todos: todoMatches,
    emptyHandlers: emptyHandlers.length,
    consoleLogHandlers: consoleLogHandlers.length,
    windowAlerts: windowAlerts ? windowAlerts.length : 0
  });
});

let totalButtons = 0;
let totalOnClicks = 0;
let totalForms = 0;
let totalOnSubmits = 0;
let totalSuspicious = 0;

auditResults.forEach(r => {
  totalButtons += r.buttons;
  totalOnClicks += r.onClicks;
  totalForms += r.forms;
  totalOnSubmits += r.onSubmits;
  if (r.todos.length > 0 || r.emptyHandlers > 0 || r.consoleLogHandlers > 0 || r.windowAlerts > 0) {
    totalSuspicious++;
    console.log(`[SUSPICIOUS] ${r.file}:`);
    if (r.todos.length) console.log(`  - TODOs:`, r.todos);
    if (r.emptyHandlers) console.log(`  - Empty handlers:`, r.emptyHandlers);
    if (r.consoleLogHandlers) console.log(`  - console.log handlers:`, r.consoleLogHandlers);
    if (r.windowAlerts) console.log(`  - window.alert calls:`, r.windowAlerts);
  }
});

console.log(`\n--- SUMMARY ---`);
console.log(`Total Pages/Files Scanned: ${files.length}`);
console.log(`Total <button> tags: ${totalButtons}`);
console.log(`Total onClick handlers: ${totalOnClicks}`);
console.log(`Total <form> tags: ${totalForms}`);
console.log(`Total onSubmit handlers: ${totalOnSubmits}`);
console.log(`Files with suspicious patterns: ${totalSuspicious}`);
