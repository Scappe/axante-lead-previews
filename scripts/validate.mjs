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

if (!/overflow-x:\s*hidden/.test(css)) failures.push('Missing horizontal overflow protection.');
if (!/@media\s*\(max-width:\s*700px\)/.test(css)) failures.push('Missing 700px mobile breakpoint.');

const robots = fs.existsSync(path.join(distDir, 'robots.txt'))
  ? fs.readFileSync(path.join(distDir, 'robots.txt'), 'utf8')
  : '';
if (!/Disallow:\s*\//i.test(robots)) failures.push('robots.txt does not block indexing.');

const files = fs.existsSync(leadsDir)
  ? fs.readdirSync(leadsDir).filter(file => file.endsWith('.json')).sort()
  : [];

const expectedRaw = process.env.EXPECTED_LEAD_COUNT;
if (expectedRaw !== undefined && expectedRaw !== '') {
  const expected = Number(expectedRaw);
  if (!Number.isInteger(expected) || expected < 0) {
    failures.push(`EXPECTED_LEAD_COUNT is invalid: ${expectedRaw}`);
  } else if (files.length !== expected) {
    failures.push(`Expected ${expected} active lead files, found ${files.length}.`);
  }
}

for (const filename of files) {
  let lead;
  try {
    lead = JSON.parse(fs.readFileSync(path.join(leadsDir, filename), 'utf8'));
  } catch (error) {
    failures.push(`${filename}: invalid JSON (${error.message}).`);
    continue;
  }

  const pagePath = path.join(distDir, 'p', lead.slug, 'index.html');
  if (!fs.existsSync(pagePath)) {
    failures.push(`${filename}: page missing.`);
    continue;
  }

  const html = fs.readFileSync(pagePath, 'utf8');
  const checks = [
    ['viewport', '<meta name="viewport"'],
    ['noindex', 'noindex,nofollow,noarchive'],
    ['company name', lead.companyName],
    ['phone', lead.phone],
    ['email', lead.professionalEmail],
    ['hero image', lead.heroImage],
    ['detail image', lead.detailImage],
    ['shared CSS', '/base.css?v=2'],
    ['script', '/preview.js?v=2']
  ];

  for (const [label, token] of checks) {
    if (!token || !html.includes(token)) failures.push(`${filename}: missing ${label}.`);
  }

  if (/Axante|concept|audit|proposta commerciale|TODO|undefined|null/i.test(html)) {
    failures.push(`${filename}: forbidden or placeholder text found.`);
  }
  if (lead.approvedForContact !== false || lead.sendStatus !== 'DRAFT') {
    failures.push(`${filename}: contact test flags incorrect.`);
  }

  for (const asset of [lead.heroImage, lead.detailImage]) {
    if (!asset || !fs.existsSync(path.join(distDir, asset.replace(/^\//, '')))) {
      failures.push(`${filename}: asset missing ${asset || '(empty)'}.`);
    }
  }
}

if (failures.length) {
  console.error('\nWEBSITE QA FAILED');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`WEBSITE QA PASSED: ${files.length} website(s) verified.`);
