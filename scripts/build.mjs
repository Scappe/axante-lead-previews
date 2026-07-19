import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const leadsDir = path.join(root, 'leads');
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');
const allowedTemplates = new Set(['professional', 'local-service', 'premium-retail']);

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function requiredString(value, field, min = 2) {
  if (typeof value !== 'string' || value.trim().length < min) {
    throw new Error(`${field} must contain at least ${min} characters.`);
  }
}

function requiredList(value, field, minItems = 3) {
  if (!Array.isArray(value) || value.length < minItems || value.some(item => typeof item !== 'string' || item.trim().length < 12)) {
    throw new Error(`${field} must contain at least ${minItems} specific items.`);
  }
}

function validateLead(lead, filename) {
  const prefix = `${filename}:`;
  requiredString(lead.slug, `${prefix} slug`, 7);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{4}$/.test(lead.slug)) {
    throw new Error(`${prefix} slug must end with a four-character random suffix.`);
  }
  requiredString(lead.companyName, `${prefix} companyName`);
  requiredString(lead.sector, `${prefix} sector`);
  requiredString(lead.city, `${prefix} city`);
  requiredString(lead.website, `${prefix} website`, 8);
  try { new URL(lead.website); } catch { throw new Error(`${prefix} website must be a valid absolute URL.`); }
  if (!allowedTemplates.has(lead.template)) throw new Error(`${prefix} unsupported template ${lead.template}.`);
  for (const key of ['accent', 'accentSecondary', 'background']) {
    if (!/^#[0-9a-fA-F]{6}$/.test(lead.theme?.[key] || '')) throw new Error(`${prefix} invalid theme.${key}.`);
  }
  requiredString(lead.hero?.eyebrow, `${prefix} hero.eyebrow`, 3);
  requiredString(lead.hero?.title, `${prefix} hero.title`, 8);
  requiredString(lead.hero?.description, `${prefix} hero.description`, 30);
  requiredList(lead.problems, `${prefix} problems`);
  requiredList(lead.opportunities, `${prefix} opportunities`);
  if (!Array.isArray(lead.services) || lead.services.length < 3) throw new Error(`${prefix} services requires at least three items.`);
  lead.services.forEach((service, index) => {
    requiredString(service?.title, `${prefix} services[${index}].title`, 3);
    requiredString(service?.description, `${prefix} services[${index}].description`, 20);
  });
  requiredString(lead.cta?.title, `${prefix} cta.title`, 5);
  requiredString(lead.cta?.description, `${prefix} cta.description`, 20);
  requiredString(lead.cta?.email, `${prefix} cta.email`, 5);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.cta.email)) throw new Error(`${prefix} invalid cta.email.`);
  if (lead.heroImage) {
    if (!lead.heroImage.startsWith(`/leads/${lead.slug}/`)) throw new Error(`${prefix} heroImage must live under /leads/${lead.slug}/.`);
    const assetPath = path.join(publicDir, lead.heroImage.replace(/^\//, ''));
    if (!fs.existsSync(assetPath)) throw new Error(`${prefix} missing hero image ${lead.heroImage}.`);
  }
}

function list(items) {
  return `<ul class="list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderLead(lead) {
  const subject = encodeURIComponent(`Concept digitale per ${lead.companyName}`);
  const mailto = `mailto:${encodeURIComponent(lead.cta.email)}?subject=${subject}`;
  const imageClass = lead.heroImage ? 'visual-main with-image' : 'visual-main';
  const image = lead.heroImage ? `<img src="${escapeHtml(lead.heroImage)}" alt="Direzione visiva proposta per ${escapeHtml(lead.companyName)}">` : '';
  const services = lead.services.map((service, index) => `<article class="service-card reveal"><span class="service-number">${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.description)}</p></article>`).join('');

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escapeHtml(lead.companyName)} — Concept digitale Axante</title>
<meta name="description" content="Una proposta digitale personalizzata realizzata da Axante per ${escapeHtml(lead.companyName)}.">
<meta name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex">
<meta name="googlebot" content="noindex,nofollow,noarchive,nosnippet,noimageindex">
<meta name="theme-color" content="${escapeHtml(lead.theme.accent)}">
<link rel="stylesheet" href="/base.css?v=1">
<link rel="stylesheet" href="/components.css?v=1">
<style>:root{--accent:${escapeHtml(lead.theme.accent)};--accent2:${escapeHtml(lead.theme.accentSecondary)};--bg:${escapeHtml(lead.theme.background)}}</style>
</head>
<body data-template="${escapeHtml(lead.template)}">
<div class="concept-bar">Concept realizzato da Axante · anteprima riservata e non indicizzata</div>
<header class="site-header"><div class="container nav"><a class="brand" href="/p/${escapeHtml(lead.slug)}/">${escapeHtml(lead.companyName)}<span>.</span></a><nav class="nav-links" aria-label="Navigazione"><a href="#analisi">Analisi</a><a href="#direzione">Direzione</a><a href="#intervento">Intervento</a></nav><a class="nav-cta" href="${mailto}">Parliamone ↗</a></div></header>
<main>
<section class="hero"><div class="container hero-grid"><div><span class="eyebrow">${escapeHtml(lead.hero.eyebrow)}</span><h1>${escapeHtml(lead.hero.title)}</h1><p class="hero-copy">${escapeHtml(lead.hero.description)}</p><div class="hero-actions"><a class="button button-primary" href="#direzione">Scopri la proposta ↓</a><a class="button button-secondary" href="${mailto}">Confrontiamoci ↗</a></div><div class="hero-proof"><span>Concept su misura</span><span>Mobile-first</span><span>Orientato alla conversione</span></div></div><div class="hero-visual" aria-label="Direzione visiva proposta"><div class="visual-card ${imageClass}">${image}<div class="visual-copy"><span class="visual-kicker">Nuova direzione digitale</span><strong>${escapeHtml(lead.companyName)}, più chiara e più memorabile.</strong><p>Una possibile evoluzione costruita intorno al pubblico, all'offerta e agli obiettivi dell'attività.</p></div></div><div class="visual-card visual-mini"><small>Priorità individuata</small><b>Trasformare attenzione in richieste</b></div><div class="visual-pill">Concept by Axante</div></div></div></section>
<section class="section" id="analisi"><div class="container"><div class="section-head reveal"><div><span class="eyebrow">Audit sintetico</span><h2>Da presenza online a strumento commerciale.</h2></div><p>Questa anteprima nasce da elementi osservati sulla presenza digitale attuale. Non è un sito ufficiale né un template generico con un nome diverso.</p></div><div class="audit-grid"><article class="audit-card reveal"><span class="eyebrow">Attriti osservati</span><h3>Cosa può frenare il risultato</h3>${list(lead.problems)}</article><article class="audit-card opportunity reveal"><span class="eyebrow">Spazio di crescita</span><h3>Cosa possiamo rendere più forte</h3>${list(lead.opportunities)}</article></div></div></section>
<section class="section" id="direzione"><div class="container"><article class="concept reveal"><span class="eyebrow">Direzione proposta</span><h2>${escapeHtml(lead.proposalTitle || `Un sito che rende ${lead.companyName} una scelta più semplice.`)}</h2><p>${escapeHtml(lead.proposalDescription || 'La nuova esperienza combina messaggi più diretti, un’identità visiva contemporanea e una struttura progettata per accompagnare ogni pubblico verso l’informazione e l’azione più rilevante.')}</p></article></div></section>
<section class="section" id="intervento"><div class="container"><div class="section-head reveal"><div><span class="eyebrow">Intervento Axante</span><h2>Una proposta concreta, non un esercizio grafico.</h2></div><p>Il progetto definitivo viene costruito sui contenuti reali, sugli obiettivi commerciali e sui dati dell'attività.</p></div><div class="service-grid">${services}</div></div></section>
<section class="cta"><div class="container"><div class="cta-box reveal"><div><h2>${escapeHtml(lead.cta.title)}</h2><p>${escapeHtml(lead.cta.description)}</p></div><a class="button" href="${mailto}">Parla con Axante ↗</a></div></div></section>
</main>
<footer><div class="container footer-row"><span>Concept riservato a ${escapeHtml(lead.companyName)}</span><span>© <span data-year></span> Axante S.r.l. · Roma</span></div></footer>
<script src="/preview.js?v=1" defer></script>
</body>
</html>`;
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
if (fs.existsSync(publicDir)) fs.cpSync(publicDir, distDir, { recursive: true });
fs.mkdirSync(leadsDir, { recursive: true });

const files = fs.readdirSync(leadsDir).filter(file => file.endsWith('.json')).sort();
const slugs = new Set();
for (const filename of files) {
  const lead = JSON.parse(fs.readFileSync(path.join(leadsDir, filename), 'utf8'));
  validateLead(lead, filename);
  if (slugs.has(lead.slug)) throw new Error(`Duplicate slug: ${lead.slug}`);
  slugs.add(lead.slug);
  const output = path.join(distDir, 'p', lead.slug);
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'index.html'), renderLead(lead));
}

fs.writeFileSync(path.join(distDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Axante · Preview riservate</title><style>body{margin:0;display:grid;min-height:100vh;place-items:center;background:#08080b;color:#fff;font:16px system-ui}main{text-align:center;padding:30px}p{color:#aaa}</style></head><body><main><h1>Preview riservate Axante</h1><p>Utilizza il link personale ricevuto nella proposta.</p></main></body></html>');
console.log(`Generated ${files.length} lead preview(s).`);
