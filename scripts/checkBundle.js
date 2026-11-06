// scripts/checkBundle.js — Run after `npm run build` to verify no API key leaked
import fs from 'fs';
import path from 'path';

const assetsDir = path.join(process.cwd(), 'dist', 'assets');
let found = false;

if (!fs.existsSync(assetsDir)) {
  console.error('dist/assets not found — run `npm run build` first.');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));

for (const f of files) {
  const content = fs.readFileSync(path.join(assetsDir, f), 'utf8');
  if (content.includes('nvapi-')) {
    console.error('KEY LEAK in dist/assets/' + f);
    found = true;
  }
}

if (found) {
  process.exit(1);
} else {
  console.log('check:bundle passed -- no nvapi- string found in dist/assets/');
}

