import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const leadsDir = path.join(root, 'leads');
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');
const layouts = new Set(['botanical', 'editorial', 'spa']);

const esc = value => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const attr = esc;
const cleanPhone = value => String(value || '').replace(/[^\d+]/g, '');
const telHref = value => `tel:${cleanPhone(value)}`;

function requiredString(value, field, min = 2) {
  if (typeof value !== 'string' || value.trim().length < min) throw new Error(`${field} must contain at least ${min} characters.`);
}
function requiredList(value, field, minItems = 3) {
  if (!Array.isArray(value) || value.length < minItems || value.some(item => typeof item !== 'string' || item.trim().length < 8)) {
    throw new Error(`${field} must contain at least ${minItems} meaningful items.`);
  }
}
function assetExists(asset, slug, field) {
  requiredString(asset, field, 8);
  if (!asset.startsWith(`/leads/${slug}/`)) throw new Error(`${field} must live under /leads/${slug}/.`);
  if (!fs.existsSync(path.join(publicDir, asset.replace(/^\//, '')))) throw new Error(`Missing asset ${asset}.`);
}
function validateLead(lead, filename) {
  const p = `${filename}:`;
  requiredString(lead.slug, `${p} slug`, 7);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{4}$/.test(lead.slug)) throw new Error(`${p} slug must end with a random four-character suffix.`);
  ['companyName','sector','city','website','professionalEmail','phone','address','heroTitle','heroDescription','aboutTitle','aboutText','featuredTitle','featuredText','positioning','visualDirection'].forEach(key => requiredString(lead[key], `${p} ${key}`, key.includes('Text') || key.includes('Description') ? 30 : 3));
  try { new URL(lead.website); } catch { throw new Error(`${p} website must be absolute.`); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.professionalEmail)) throw new Error(`${p} professionalEmail is invalid.`);
  if (!layouts.has(lead.layout)) throw new Error(`${p} unsupported layout.`);
  for (const key of ['accent','accent2','background','surface','text']) if (!/^#[0-9a-f]{6}$/i.test(lead.theme?.[key] || '')) throw new Error(`${p} invalid theme.${key}.`);
  requiredList(lead.heroFacts, `${p} heroFacts`, 3);
  requiredList(lead.features, `${p} features`, 3);
  requiredList(lead.problems, `${p} problems`, 3);
  requiredList(lead.opportunities, `${p} opportunities`, 3);
  requiredList(lead.verifiedFacts, `${p} verifiedFacts`, 3);
  if (!Array.isArray(lead.services) || lead.services.length < 4) throw new Error(`${p} requires at least four services.`);
  lead.services.forEach((service, i) => { requiredString(service.title, `${p} service ${i} title`, 3); requiredString(service.description, `${p} service ${i} description`, 20); });
  if (!Array.isArray(lead.method) || lead.method.length < 3) throw new Error(`${p} requires at least three method steps.`);
  lead.method.forEach((step, i) => { requiredString(step.title, `${p} method ${i} title`, 3); requiredString(step.description, `${p} method ${i} description`, 20); });
  if (!Array.isArray(lead.faqs) || lead.faqs.length < 3) throw new Error(`${p} requires at least three FAQs.`);
  lead.faqs.forEach((faq, i) => { requiredString(faq.question, `${p} faq ${i} question`, 8); requiredString(faq.answer, `${p} faq ${i} answer`, 20); });
  assetExists(lead.heroImage, lead.slug, `${p} heroImage`);
  assetExists(lead.detailImage, lead.slug, `${p} detailImage`);
  if (lead.approvedForContact !== false || lead.sendStatus !== 'DRAFT') throw new Error(`${p} test contact flags are invalid.`);
}

const renderServices = lead => lead.services.map((service, index) => `
  <article class="service-card reveal">
    <span class="service-index">${String(index + 1).padStart(2,'0')}</span>
    <h3>${esc(service.title)}</h3>
    <p>${esc(service.description)}</p>
  </article>`).join('');
const renderMethod = lead => lead.method.map((step, index) => `
  <article class="method-step reveal"><span>${index + 1}</span><div><h3>${esc(step.title)}</h3><p>${esc(step.description)}</p></div></article>`).join('');
const renderFaqs = lead => lead.faqs.map((faq, index) => `
  <details class="faq reveal" ${index === 0 ? 'open' : ''}><summary>${esc(faq.question)}<span>+</span></summary><p>${esc(faq.answer)}</p></details>`).join('');

function renderLead(lead) {
  const phone = telHref(lead.phone);
  const email = `mailto:${lead.professionalEmail}`;
  const primaryHref = lead.bookingUrl || phone;
  const primaryLabel = lead.bookingUrl ? 'Prenota su WhatsApp' : 'Prenota un appuntamento';
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`;
  const facts = lead.heroFacts.map(item => `<span>${esc(item)}</span>`).join('');
  const features = lead.features.map(item => `<li>${esc(item)}</li>`).join('');
  const mobileSecondary = lead.bookingUrl ? phone : email;
  const mobileSecondaryLabel = lead.bookingUrl ? 'Chiama' : 'Scrivi';
  const schema = {
    '@context': 'https://schema.org', '@type': 'BeautySalon', name: lead.companyName,
    url: lead.website, telephone: lead.phone, email: lead.professionalEmail,
    address: {'@type':'PostalAddress','streetAddress': lead.address.replace(/,?\s*001\d{2}.*$/i,''),'addressLocality':'Roma','addressRegion':'RM','addressCountry':'IT'}
  };
  return `<!doctype html>
<html lang="it"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(lead.companyName)} | Centro estetico a Roma</title>
<meta name="description" content="${attr(lead.metaDescription)}">
<meta name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex"><meta name="googlebot" content="noindex,nofollow,noarchive,nosnippet,noimageindex">
<meta name="theme-color" content="${attr(lead.theme.background)}">
<link rel="stylesheet" href="/base.css?v=2"><link rel="stylesheet" href="/components.css?v=2">
<style>:root{--accent:${attr(lead.theme.accent)};--accent2:${attr(lead.theme.accent2)};--bg:${attr(lead.theme.background)};--surface:${attr(lead.theme.surface)};--text:${attr(lead.theme.text)}}</style>
<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>
</head><body data-layout="${attr(lead.layout)}">
<header class="site-header"><div class="shell nav-wrap">
<a class="brand" href="#top" aria-label="${attr(lead.companyName)} home"><span>${esc(lead.companyName)}</span><small>${esc(lead.brandTagline)}</small></a>
<button class="menu-toggle" aria-expanded="false" aria-controls="site-nav"><span></span><span></span></button>
<nav id="site-nav" class="site-nav" aria-label="Navigazione principale"><a href="#trattamenti">Trattamenti</a><a href="#approccio">Il nostro approccio</a><a href="#faq">FAQ</a><a href="#contatti">Contatti</a></nav>
<a class="header-cta" href="${attr(primaryHref)}">${esc(primaryLabel)}</a>
</div></header>
<main id="top">
<section class="hero"><div class="shell hero-grid">
<div class="hero-copy reveal"><span class="eyebrow">${esc(lead.heroEyebrow)}</span><h1>${esc(lead.heroTitle)}</h1><p>${esc(lead.heroDescription)}</p>
<div class="hero-actions"><a class="button primary" href="${attr(primaryHref)}">${esc(primaryLabel)}</a><a class="button ghost" href="#trattamenti">Scopri i trattamenti</a></div>
<div class="hero-facts">${facts}</div></div>
<div class="hero-media reveal"><div class="image-frame"><img src="${attr(lead.heroImage)}" alt="Illustrazione dedicata al benessere e alla cura estetica di ${attr(lead.companyName)}"></div><span class="media-note">${esc(lead.mediaNote)}</span></div>
</div></section>
<section class="intro" id="approccio"><div class="shell intro-grid"><div class="intro-media reveal"><img src="${attr(lead.detailImage)}" alt="Dettaglio illustrato dei rituali di bellezza di ${attr(lead.companyName)}"></div><div class="intro-copy reveal"><span class="eyebrow">${esc(lead.aboutEyebrow)}</span><h2>${esc(lead.aboutTitle)}</h2><p>${esc(lead.aboutText)}</p><a class="text-link" href="${attr(primaryHref)}">Richiedi una consulenza <span>↗</span></a></div></div></section>
<section class="section services" id="trattamenti"><div class="shell"><div class="section-head reveal"><span class="eyebrow">Trattamenti</span><h2>${esc(lead.servicesTitle)}</h2><p>${esc(lead.servicesIntro)}</p></div><div class="service-grid">${renderServices(lead)}</div></div></section>
<section class="section signature"><div class="shell signature-grid"><div class="signature-copy reveal"><span class="eyebrow">${esc(lead.featuredEyebrow)}</span><h2>${esc(lead.featuredTitle)}</h2><p>${esc(lead.featuredText)}</p></div><ul class="feature-list reveal">${features}</ul></div></section>
<section class="section method"><div class="shell"><div class="section-head reveal"><span class="eyebrow">Come lavoriamo</span><h2>${esc(lead.methodTitle)}</h2><p>${esc(lead.methodIntro)}</p></div><div class="method-list">${renderMethod(lead)}</div></div></section>
<section class="section faq-section" id="faq"><div class="shell faq-grid"><div class="faq-heading reveal"><span class="eyebrow">Domande frequenti</span><h2>Prima del tuo appuntamento.</h2><p>Le informazioni essenziali per scegliere il trattamento e contattare il centro.</p></div><div class="faq-list">${renderFaqs(lead)}</div></div></section>
<section class="contact" id="contatti"><div class="shell contact-card reveal"><div><span class="eyebrow">Contatti</span><h2>${esc(lead.contactTitle)}</h2><p>${esc(lead.contactText)}</p><div class="contact-actions"><a class="button primary" href="${attr(primaryHref)}">${esc(primaryLabel)}</a><a class="button ghost" href="${attr(phone)}">${esc(lead.phone)}</a></div></div><dl class="contact-data"><div><dt>Indirizzo</dt><dd><a href="${attr(mapHref)}" target="_blank" rel="noopener">${esc(lead.address)}</a></dd></div><div><dt>Orari</dt><dd>${esc(lead.hours)}</dd></div><div><dt>Email</dt><dd><a href="${attr(email)}">${esc(lead.professionalEmail)}</a></dd></div></dl></div></section>
</main>
<footer><div class="shell footer-row"><div><strong>${esc(lead.companyName)}</strong><span>${esc(lead.address)}</span></div><div><a href="${attr(phone)}">${esc(lead.phone)}</a><a href="${attr(email)}">${esc(lead.professionalEmail)}</a></div><small>© <span data-year></span> ${esc(lead.companyName)}</small></div></footer>
<div class="mobile-actions"><a href="${attr(primaryHref)}">${esc(primaryLabel)}</a><a href="${attr(mobileSecondary)}">${mobileSecondaryLabel}</a></div>
<script src="/preview.js?v=2" defer></script></body></html>`;
}

fs.rmSync(distDir, {recursive:true, force:true});
fs.mkdirSync(distDir, {recursive:true});
if (fs.existsSync(publicDir)) fs.cpSync(publicDir, distDir, {recursive:true});
fs.mkdirSync(leadsDir, {recursive:true});
const files = fs.readdirSync(leadsDir).filter(file => file.endsWith('.json')).sort();
const slugs = new Set();
for (const filename of files) {
  const lead = JSON.parse(fs.readFileSync(path.join(leadsDir, filename), 'utf8'));
  validateLead(lead, filename);
  if (slugs.has(lead.slug)) throw new Error(`Duplicate slug: ${lead.slug}`);
  slugs.add(lead.slug);
  const output = path.join(distDir, 'p', lead.slug);
  fs.mkdirSync(output, {recursive:true});
  fs.writeFileSync(path.join(output, 'index.html'), renderLead(lead));
}
fs.writeFileSync(path.join(distDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Area riservata</title><style>body{margin:0;display:grid;min-height:100vh;place-items:center;background:#f4f0e9;color:#342f2a;font:16px system-ui}main{text-align:center;padding:30px}p{color:#746b63}</style></head><body><main><h1>Area riservata</h1><p>Utilizza il collegamento diretto che hai ricevuto.</p></main></body></html>');
console.log(`Generated ${files.length} client website(s).`);
