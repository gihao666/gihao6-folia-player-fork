import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'www');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const item of ['index.html', 'styles.css', 'manifest.webmanifest', 'sw.js', 'icons', 'js']) {
  const source = path.join(root, item);
  if (!fs.existsSync(source)) continue;
  fs.cpSync(source, path.join(out, item), { recursive: true });
}

console.log('Synced web assets to www/');