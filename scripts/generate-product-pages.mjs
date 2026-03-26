/**
 * Generates static product pages for the top ~100 most popular products.
 * Each page shows prices across all chains with Product + AggregateOffer schema.
 * Run daily by GitHub Action.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync, rmSync } from 'fs';

const API = 'https://glpowwptzbokwtkbsnko.supabase.co/rest/v1/rpc/get_product_pages_data';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdscG93d3B0emJva3d0a2JzbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMDY1MDUsImV4cCI6MjA3ODc4MjUwNX0.NCuL94b5hbGybvYHhGhk3ePpYfNK3KwaONRmDAr0MvM';
const OUT_DIR = 'produkt';

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-{2,}/g, '-');
}

function fmtKr(n) {
  const num = Number(n);
  if (Number.isInteger(num)) return num + ',\u2013';
  return num.toFixed(2).replace('.', ',');
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildProductPage(product, slug) {
  const prices = product.prices || [];
  const cheapest = prices[0];
  const mostExpensive = prices[prices.length - 1];

  const priceRows = prices.map(p => {
    const isCheapest = Number(p.price) === Number(cheapest.price);
    const cls = isCheapest ? 'color:#2d6a4f;font-weight:600' : '';
    const sale = p.is_on_sale ? ' <span style="font-size:0.55rem;font-weight:700;color:#dc2626;background:#fef2f2;padding:0.05rem 0.3rem;border-radius:0.2rem;margin-left:0.2rem;vertical-align:middle">tilbud</span>' : '';
    return `              <tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:0.6rem 0.5rem">${escHtml(p.chain)}</td>
                <td style="padding:0.6rem 0.5rem;text-align:right;font-family:'DM Mono',monospace;${cls}">${fmtKr(p.price)}${sale}</td>
                <td style="padding:0.6rem 0.5rem;text-align:right;font-size:0.7rem;color:#94a3b8">${p.observed}</td>
              </tr>`;
  }).join('\n');

  const today = new Date().toISOString().slice(0, 10);
  const chainList = prices.map(p => p.chain).join(', ');
  const priceListProse = prices.map(p => `${fmtKr(p.price)} kr hos ${p.chain}${p.is_on_sale ? ' (tilbud)' : ''}`).join(', ');

  const offersLd = prices.map(p => ({
    '@type': 'Offer',
    'seller': { '@type': 'Organization', 'name': p.chain },
    'price': Number(p.price),
    'priceCurrency': 'NOK',
    'availability': 'https://schema.org/InStock',
    'priceValidUntil': new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  }));

  const faqAnswer = `${product.name} koster ${priceListProse}. Billigst hos ${cheapest.chain} til ${fmtKr(cheapest.price)} kr. Prisene er hentet fra SeSum sin prisportal og oppdateres daglig.`;

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        'name': product.name,
        ...(product.brand ? { 'brand': { '@type': 'Brand', 'name': product.brand } } : {}),
        ...(product.image ? { 'image': product.image } : {}),
        'offers': {
          '@type': 'AggregateOffer',
          'lowPrice': Number(cheapest.price),
          'highPrice': Number(mostExpensive.price),
          'offerCount': prices.length,
          'priceCurrency': 'NOK',
          'offers': offersLd
        }
      },
      {
        '@type': 'FAQPage',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': `Hva koster ${product.name}?`,
            'acceptedAnswer': { '@type': 'Answer', 'text': faqAnswer }
          },
          {
            '@type': 'Question',
            'name': `Hvor er ${product.name} billigst?`,
            'acceptedAnswer': { '@type': 'Answer', 'text': `${product.name} er billigst hos ${cheapest.chain} til ${fmtKr(cheapest.price)} kr. ${mostExpensive.chain} er dyrest med ${fmtKr(mostExpensive.price)} kr.` }
          }
        ]
      },
      {
        '@type': 'WebPage',
        'name': `Pris ${product.name}`,
        'dateModified': today,
        'speakable': { '@type': 'SpeakableSpecification', 'cssSelector': ['h1', '.insight-prose'] }
      },
      {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Forside', 'item': 'https://www.sesum.no/' },
          { '@type': 'ListItem', 'position': 2, 'name': 'Produkter', 'item': 'https://www.sesum.no/produkt/' },
          { '@type': 'ListItem', 'position': 3, 'name': product.name }
        ]
      }
    ]
  };

  const imgHtml = product.image
    ? `\n          <img src="${escHtml(product.image)}" alt="${escHtml(product.name)}" style="max-width:120px;max-height:120px;border-radius:0.75rem;margin:0 auto 1rem" loading="lazy" />`
    : '';

  const description = `Hva koster ${product.name}? Billigst hos ${cheapest.chain} til ${fmtKr(cheapest.price)} kr. Se priser hos ${chainList}. Oppdatert ${today}.`;

  return `<!DOCTYPE html>
<html lang="nb">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pris ${escHtml(product.name)} \u2013 ${prices.map(p => p.chain).join(', ')} | SeSum</title>
  <link rel="canonical" href="https://www.sesum.no/produkt/${slug}.html" />
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="description" content="${escHtml(description)}" />
  <meta name="theme-color" content="#2d6a4f" />
  <meta property="og:type" content="product" />
  <meta property="og:url" content="https://www.sesum.no/produkt/${slug}.html" />
  <meta property="og:title" content="Pris ${escHtml(product.name)} \u2013 SeSum" />
  <meta property="og:description" content="${escHtml(description)}" />
  <meta property="og:site_name" content="SeSum" />
  ${product.image ? `<meta property="og:image" content="${escHtml(product.image)}" />` : ''}
  <script type="application/ld+json">
  ${JSON.stringify(ld, null, 2).split('\n').join('\n  ')}
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <script>
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(/\\/$/,"")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u._i.push([i,s,a]),o=0;o<n.length;o++)g(u,n[o])},n="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),e.init("phc_pLofO9zUaQZTqaXbr95KiLNAvZmj8ol0VkZH8bksJUo",{api_host:"https://eu.i.posthog.com",person_profiles:"always",capture_pageview:true,capture_pageleave:true}))}(document,window.posthog||[]);
  </script>
  <style>
    * { -webkit-tap-highlight-color: transparent; }
    body { font-family: 'DM Sans', sans-serif; background: #fafafa; -webkit-font-smoothing: antialiased; }
    .text-sesum { color: #2d6a4f; }
  </style>
  <link rel="stylesheet" href="/nav.css" />
  <script src="/nav.js" defer></script>
</head>
<body class="min-h-screen overflow-x-hidden">

  <nav class="site-nav" aria-label="Hovednavigasjon">
    <div class="site-nav-inner">
      <a href="/" class="site-nav-logo">
        <img src="/sesum-logo.png" alt="SeSum logo" width="36" height="36" />
        <span>SeSum</span>
      </a>
      <div class="site-nav-links">
        <a href="/produkt/">Produkter</a>
        <a href="/tilbud/">Tilbud</a>
        <a href="/kiwi-vs-rema.html">Sammenlign</a>
        <a href="/innsikter.html">Innsikter</a>
        <a href="/prisportal-matvarer.html">Prisportal</a>
      </div>
      <button class="site-nav-toggle" aria-label="Meny" aria-expanded="false">
        <svg class="site-nav-icon-open" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        <svg class="site-nav-icon-close" style="display:none" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="site-nav-mobile">
      <a href="/produkt/"><span class="site-nav-label">Produkter</span><span class="site-nav-desc">Se priser p\u00e5 et utvalg dagligvarer</span></a>
      <a href="/tilbud/"><span class="site-nav-label">Tilbud</span><span class="site-nav-desc">Ukens beste tilbud fra alle kjeder</span></a>
      <a href="/kiwi-vs-rema.html"><span class="site-nav-label">Sammenlign</span><span class="site-nav-desc">Hvilken kjede er billigst?</span></a>
      <a href="/innsikter.html"><span class="site-nav-label">Innsikter</span><span class="site-nav-desc">Prisutvikling og sparedata</span></a>
      <a href="/prisportal-matvarer.html"><span class="site-nav-label">Prisportal</span><span class="site-nav-desc">Hvorfor trenger vi en prisportal?</span></a>
    </div>
  </nav>

  <nav class="site-breadcrumb" aria-label="Br\u00f8dsmuler">
    <div class="site-breadcrumb-inner">
      <a href="/">Forside</a><span class="site-bc-sep">/</span><a href="/produkt/">Produkter</a><span class="site-bc-sep">/</span><span class="site-bc-current">${escHtml(product.name)}</span>
    </div>
  </nav>

  <main class="px-5 pb-12 relative z-10">
    <div class="max-w-md mx-auto">
      <div class="text-center mb-4">${imgHtml}
        <h1 class="text-xl font-bold text-slate-900 mb-1">${escHtml(product.name)}</h1>
        ${product.brand ? `<p class="text-xs text-slate-500">${escHtml(product.brand)}</p>` : ''}
      </div>

      <div class="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 mb-4 text-center">
        <p class="text-xs text-slate-500 mb-1">Billigst hos</p>
        <p class="text-lg font-bold text-sesum">${escHtml(cheapest.chain)} \u2013 ${fmtKr(cheapest.price)} kr</p>
      </div>

      <div class="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
        <h2 class="text-sm font-semibold text-slate-900 mb-3">Pris per butikkjede</h2>
        <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
          <thead>
            <tr style="border-bottom:2px solid #e2e8f0">
              <th style="text-align:left;padding:0.5rem;font-size:0.7rem;font-weight:600;color:#64748b;text-transform:uppercase">Kjede</th>
              <th style="text-align:right;padding:0.5rem;font-size:0.7rem;font-weight:600;color:#64748b;text-transform:uppercase">Pris</th>
              <th style="text-align:right;padding:0.5rem;font-size:0.7rem;font-weight:600;color:#64748b;text-transform:uppercase">Sist sett</th>
            </tr>
          </thead>
          <tbody>
${priceRows}
          </tbody>
        </table>
      </div>

      <!-- AI-crawlable prose (hidden visually, readable by crawlers) -->
      <div class="insight-prose" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden" aria-hidden="false">
        <p><strong>Hva koster ${escHtml(product.name)}?</strong> Billigst hos ${cheapest.chain} til ${fmtKr(cheapest.price)} kr${cheapest.is_on_sale ? ' (tilbudspris)' : ''}. ${mostExpensive.chain} er dyrest med ${fmtKr(mostExpensive.price)} kr - en forskjell p\u00e5 ${fmtKr(Number(mostExpensive.price) - Number(cheapest.price))} kr.</p>
        <p>Priser: ${priceListProse}. Sist oppdatert ${today}. Prisdata fra SeSum sin prisportal for matvarer.</p>
      </div>

      <div class="text-center pt-2 mb-4">
        <p class="text-sm text-slate-600 mb-3">Se alle priser og tilbud i SeSum-appen</p>
        <a href="/" class="inline-block bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]">
          Pr\u00f8v SeSum gratis
        </a>
      </div>

      <p class="text-[10px] text-slate-400 text-center">Prisdata fra SeSum. Sist oppdatert ${today}. Priser kan variere mellom filialer. Feil kan forekomme - sjekk alltid prisen i butikk.</p>
    </div>
  </main>

  <footer class="site-footer">
    <div class="site-footer-inner">
      <div class="site-footer-links">
        <a href="/">Forside</a>
        <a href="/produkt/">Produkter</a>
        <a href="/tilbud/">Tilbud</a>
        <a href="/kiwi-vs-rema.html">Sammenlign</a>
        <a href="/innsikter.html">Innsikter</a>
        <a href="/prisportal-matvarer.html">Prisportal</a>
        <a href="/presse.html">Presse</a>
        <a href="/personvern.html">Personvern</a>
        <a href="/bruksvilkar.html">Bruksvilk\u00e5r</a>
        <a href="mailto:hei@sesum.no">Kontakt</a>
      </div>
      <p class="site-footer-copy">&copy; 2026 SeSum. Sammenlign dagligvarepriser i Norge. Laget i Norge.</p>
    </div>
  </footer>
</body>
</html>`;
}

function buildIndexPage(products) {
  const rows = products.map(p => {
    const slug = slugify(p.name);
    const cheapest = p.prices[0];
    return `        <a href="/produkt/${slug}.html" class="flex items-center justify-between py-3 border-b border-slate-100 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
          <div>
            <span class="text-sm font-medium text-slate-800">${escHtml(p.name)}</span>
            ${p.brand ? `<span class="text-xs text-slate-400 ml-1">${escHtml(p.brand)}</span>` : ''}
          </div>
          <span class="text-sm font-semibold text-[#2d6a4f] whitespace-nowrap ml-4">fra ${fmtKr(cheapest.price)} kr</span>
        </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="nb">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dagligvarepriser \u2013 Popul\u00e6re produkter | SeSum</title>
  <link rel="canonical" href="https://www.sesum.no/produkt/" />
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="description" content="Se priser p\u00e5 ${products.length} popul\u00e6re dagligvarer hos norske butikkjeder. Sammenlign priser mellom KIWI, REMA 1000, Meny, SPAR og flere." />
  <meta name="theme-color" content="#2d6a4f" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <script>
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(/\\/$/,"")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u._i.push([i,s,a]),o=0;o<n.length;o++)g(u,n[o])},n="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),e.init("phc_pLofO9zUaQZTqaXbr95KiLNAvZmj8ol0VkZH8bksJUo",{api_host:"https://eu.i.posthog.com",person_profiles:"always",capture_pageview:true,capture_pageleave:true}))}(document,window.posthog||[]);
  </script>
  <style>
    * { -webkit-tap-highlight-color: transparent; }
    body { font-family: 'DM Sans', sans-serif; background: #fafafa; -webkit-font-smoothing: antialiased; }
  </style>
</head>
<body class="min-h-screen overflow-x-hidden">
  <nav class="px-5 py-5 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2">
      <img src="/sesum-logo.png" alt="SeSum logo" class="h-9 w-auto rounded-xl" width="36" height="36" />
      <span class="text-xl font-bold tracking-tight text-slate-900">SeSum</span>
    </a>
    <a href="/priser.html" class="text-xs font-semibold text-slate-500 hover:text-slate-700">Priser</a>
  </nav>
  <main class="px-5 pb-12">
    <div class="max-w-md mx-auto">
      <h1 class="text-2xl font-bold text-slate-900 mb-1">Dagligvarepriser</h1>
      <p class="text-sm text-slate-500 mb-6">${products.length} popul\u00e6re produkter med priser fra flere butikkjeder. Oppdateres daglig.</p>
      <div>
${rows}
      </div>
    </div>
  </main>
  <footer class="px-5 pb-8">
    <div class="max-w-md mx-auto text-center space-y-3">
      <div class="flex justify-center flex-wrap gap-4 text-xs text-slate-500">
        <a href="/" class="hover:text-slate-700">Forside</a>
        <a href="/priser.html" class="hover:text-slate-700">Priser</a>
        <a href="/innsikter.html" class="hover:text-slate-700">Innsikter</a>
        <a href="mailto:hei@sesum.no" class="hover:text-slate-700">Kontakt</a>
      </div>
      <p class="text-[10px] text-slate-400">&copy; 2026 SeSum. Laget i Norge.</p>
    </div>
  </footer>
</body>
</html>`;
}

async function main() {
  const res = await fetch(API, {
    headers: { 'apikey': KEY, 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    console.error('API failed:', res.status);
    process.exit(1);
  }
  const products = await res.json();
  if (!products || !Array.isArray(products)) {
    console.error('Invalid response');
    process.exit(1);
  }

  console.log(`Generating ${products.length} product pages...`);

  // Clean and recreate output dir
  if (existsSync(OUT_DIR)) {
    const files = readdirSync(OUT_DIR);
    for (const f of files) rmSync(`${OUT_DIR}/${f}`);
  } else {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  // Generate individual pages
  const slugs = [];
  for (const p of products) {
    if (!p.prices || p.prices.length < 2) continue;
    const slug = slugify(p.name);
    writeFileSync(`${OUT_DIR}/${slug}.html`, buildProductPage(p, slug), 'utf-8');
    slugs.push(slug);
  }

  // Generate index page
  writeFileSync(`${OUT_DIR}/index.html`, buildIndexPage(products.filter(p => p.prices?.length >= 2)), 'utf-8');

  // Update sitemap
  const today = new Date().toISOString().slice(0, 10);
  const sitemapPath = 'sitemap.xml';
  let sitemap = readFileSync(sitemapPath, 'utf-8');

  // Remove old product entries
  sitemap = sitemap.replace(/\s*<url>\s*<loc>https:\/\/www\.sesum\.no\/produkt\/[^<]*<\/loc>[\s\S]*?<\/url>/g, '');

  // Add product index + individual pages before closing </urlset>
  const productEntries = [
    `  <url>\n    <loc>https://www.sesum.no/produkt/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`,
    ...slugs.map(s =>
      `  <url>\n    <loc>https://www.sesum.no/produkt/${s}.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.6</priority>\n  </url>`
    )
  ].join('\n');

  sitemap = sitemap.replace('</urlset>', `${productEntries}\n</urlset>`);
  writeFileSync(sitemapPath, sitemap, 'utf-8');

  console.log(`Generated ${slugs.length} product pages + index`);
  console.log(`Updated sitemap with ${slugs.length + 1} product URLs`);
}

main().catch(e => { console.error(e); process.exit(1); });
