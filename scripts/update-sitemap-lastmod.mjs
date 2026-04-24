import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

// Map sitemap-URL → lokal fil i repoet
function urlToFile(url) {
  const path = url.replace('https://www.sesum.no/', '');
  if (path === '' || path === '/') return 'index.html';
  if (path.endsWith('/')) return path + 'index.html';
  return path;
}

// Hent siste commit-dato for filen (YYYY-MM-DD)
function fileLastModified(file) {
  if (!existsSync(file)) return null;
  try {
    const out = execSync(`git log -1 --format=%cs -- "${file}"`, {
      encoding: 'utf-8',
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

const sitemapPath = 'sitemap.xml';
let sitemap = readFileSync(sitemapPath, 'utf-8');

const urlRe = /<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g;

let updated = 0;
let skipped = 0;

sitemap = sitemap.replace(urlRe, (match, loc, oldDate) => {
  const file = urlToFile(loc);
  const fileDate = fileLastModified(file);

  if (!fileDate) {
    skipped++;
    return match;
  }

  if (fileDate !== oldDate) {
    updated++;
    return match.replace(
      `<lastmod>${oldDate}</lastmod>`,
      `<lastmod>${fileDate}</lastmod>`
    );
  }
  return match;
});

writeFileSync(sitemapPath, sitemap, 'utf-8');
console.log(`✓ sitemap.xml: oppdaterte ${updated} <lastmod>-datoer (${skipped} hoppet over – fil ikke funnet)`);
