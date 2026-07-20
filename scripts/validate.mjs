import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const leadsDir = path.join(root,'leads');
const distDir = path.join(root,'dist');
const failures = [];
const requiredFiles = ['index.html','robots.txt','base.css','components.css','preview.js'];
for (const file of requiredFiles) if (!fs.existsSync(path.join(distDir,file))) failures.push(`Missing published file: ${file}`);
const css = ['base.css','components.css'].filter(f => fs.existsSync(path.join(distDir,f))).map(f => fs.readFileSync(path.join(distDir,f),'utf8')).join('\n');
if (!/overflow-x:\s*hidden/.test(css)) failures.push('Missing horizontal overflow protection.');
if (!/@media\s*\(max-width:\s*700px\)/.test(css)) failures.push('Missing 700px mobile breakpoint.');
const robots = fs.existsSync(path.join(distDir,'robots.txt')) ? fs.readFileSync(path.join(distDir,'robots.txt'),'utf8') : '';
if (!/Disallow:\s*\//i.test(robots)) failures.push('robots.txt does not block indexing.');
const files = fs.existsSync(leadsDir) ? fs.readdirSync(leadsDir).filter(f => f.endsWith('.json')) : [];
if (files.length !== 3) failures.push(`Expected exactly 3 active lead files, found ${files.length}.`);
for (const filename of files) {
  const lead = JSON.parse(fs.readFileSync(path.join(leadsDir,filename),'utf8'));
  const pagePath = path.join(distDir,'p',lead.slug,'index.html');
  if (!fs.existsSync(pagePath)) { failures.push(`${filename}: page missing.`); continue; }
  const html = fs.readFileSync(pagePath,'utf8');
  const checks = [['viewport','<meta name="viewport"'],['noindex','noindex,nofollow,noarchive'],['company name',lead.companyName],['phone',lead.phone],['email',lead.professionalEmail],['hero image',lead.heroImage],['detail image',lead.detailImage],['shared CSS','/base.css?v=2'],['script','/preview.js?v=2']];
  for (const [label,token] of checks) if (!html.includes(token)) failures.push(`${filename}: missing ${label}.`);
  if (/Axante|concept|audit|proposta commerciale|TODO|undefined|null/i.test(html)) failures.push(`${filename}: forbidden or placeholder text found.`);
  if (lead.approvedForContact !== false || lead.sendStatus !== 'DRAFT') failures.push(`${filename}: contact test flags incorrect.`);
  for (const asset of [lead.heroImage,lead.detailImage]) if (!fs.existsSync(path.join(distDir,asset.replace(/^\//,'')))) failures.push(`${filename}: asset missing ${asset}.`);
}
if (failures.length) { console.error('\nWEBSITE QA FAILED'); failures.forEach(f => console.error(`- ${f}`)); process.exit(1); }
console.log(`WEBSITE QA PASSED: ${files.length} websites verified.`);
