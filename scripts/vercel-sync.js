#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const WATCH_DIR   = path.join(ROOT, 'leland-builder-2');
const INDEX_PATH  = path.join(ROOT, 'index.html');

// Files to never add to the index
const SKIP = new Set(['suggest.html']);

function toTitle(filename) {
  return filename
    .replace(/\.html$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function toLabel(filename) {
  return filename.replace(/\.html$/, '').split(/[-_]/)[0].slice(0, 6).toUpperCase();
}

function navCardBlock(filename) {
  const href  = `/leland-builder-2/${filename}`;
  const title = toTitle(filename);
  const label = toLabel(filename);
  return `
    <a class="nav-card" target="_blank" href="${href}">
      <div class="nav-card-num">${label}</div>
      <div class="nav-card-title">${title}</div>
      <div class="nav-card-desc">Added automatically. Open the file to update this description.</div>
      <span class="nav-card-arrow">Open →</span>
    </a>
`;
}

const indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');

// Collect hrefs already in index
const existingHrefs = new Set();
for (const match of indexHtml.matchAll(/href="([^"]+)"/g)) {
  existingHrefs.add(match[1]);
}

// Find HTML files in leland-builder-2 not yet linked
const htmlFiles = fs.readdirSync(WATCH_DIR).filter(f => {
  if (!f.endsWith('.html')) return false;
  if (SKIP.has(f)) return false;
  const href = `/${f}`;
  return !existingHrefs.has(href);
});

if (htmlFiles.length === 0) {
  console.log('Index is up to date — no new files found.');
  process.exit(0);
}

// Insert new nav-cards before closing </div> of nav-grid
const INSERTION_POINT = '  </div>\n\n  <div class="section-label">[2]';
const newCards = htmlFiles.map(navCardBlock).join('');
const updated  = indexHtml.replace(INSERTION_POINT, `${newCards}  </div>\n\n  <div class="section-label">[2]`);

if (updated === indexHtml) {
  console.error('Could not find insertion point in index.html — check the nav-grid structure.');
  process.exit(1);
}

fs.writeFileSync(INDEX_PATH, updated, 'utf8');
console.log(`Added ${htmlFiles.length} card(s) to index.html:`);
htmlFiles.forEach(f => console.log(`  + /${f}`));
