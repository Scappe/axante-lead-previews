import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const leadsDir = path.join(root, 'leads');
const distDir = path.join(root, 'dist');
const failures = [];

const requiredFiles = ['index.html', 'robots.txt', 'base.css', 'components.css', 'preview.js'];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(distDir, file))) failures.push(`Missing published file: ${file}`);
}

const css = ['base.css', 'components.css']
  .filter(file => fs.existsSync(path.join(distDir, file)))
  .map(file => fs.readFileSync(path.join(distDir, file), 'utf8'))
  .join('\n');
if (!/overflow-x:hidden/.test(css)) failures.push('Missing horizontal overflow protection.');

const robots = fs.existsSync(path.join(distDir, 'robots.txt')) ? fs.readFileSync(path.join(distDir, 'robots.txt'), 'utf8') : '';
if (!/Disallow:\s*\//i.test(robots)) failures.push('robots.txt does not block indexing.');

const files = fs.existsSync(leadsDir) ? fs.readdirSync(leadsDir).filter(file => file.endsWith('.json')) : [];
for (const filename of files) {
  const lead = JSON.parse(fs.readFileSync(path.join(leadsDir, filename), 'utf8'));
  const pagePath = path.join(distDir, 'p', lead.slug, 'index.html');
  if (!fs.existsSync(pagePath)) {
    failures.push(`${filename}: generated page is missing.`);
    continue;
  }
  const html = fs.readFileSync(pagePath, 'utf8');
  const checks = [
    ['viewport', '<meta name="viewport"'],
    ['noindex', 'noindex,nofollow'],
    ['company name', lead.companyName],
    ['base stylesheet', '/base.css?v=1'],
    ['components stylesheet', '/components.css?v=1'],
    ['interaction script', '/preview.js?v=1'],
    ['reserved concept notice', 'anteprima riservata']
  ];
  for (const [label, token] of checks) {
    if (!html.includes(token)) failures.push(`${filename}: missing ${label}.`);
  }
  if (/\b(?:TODO|undefined|null)\b/i.test(html)) failures.push(`${filename}: placeholder or invalid value found.`);
  if (lead.heroImage) {
    const assetPath = path.join(distDir, lead.heroImage.replace(/^\//, ''));
    if (!fs.existsSync(assetPath)) failures.push(`${filename}: published hero image is missing.`);
  }
}

if (failures.length) {
  console.error('\nPREVIEW QA FAILED');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`PREVIEW QA PASSED: ${files.length} lead preview(s) and ${requiredFiles.length} shared files verified.`);
