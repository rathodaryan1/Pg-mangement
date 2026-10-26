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
const files = scanDir(clientDir);

const keywords = ['TODO', 'FIXME', 'dummy', 'mock', 'placeholder', 'coming soon', 'not implemented', 'fake'];
const findings = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    // Ignore html placeholder="..." attribute for inputs
    if (line.includes('placeholder="') || line.includes("placeholder='")) {
      return;
    }
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        findings.push({
          file: path.relative(clientDir, f),
          line: idx + 1,
          keyword: kw,
          text: line.trim()
        });
        break;
      }
    }
  });
});

console.log(`Keyword Scan in client/src: found ${findings.length} matches`);
findings.forEach(f => {
  console.log(`[${f.keyword.toUpperCase()}] ${f.file}:${f.line} -> ${f.text}`);
});
