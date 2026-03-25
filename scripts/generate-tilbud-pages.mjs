/**
 * Generates daily deal pages per chain: /tilbud/kiwi.html, /tilbud/rema-1000.html, etc.
 * Plus an index page at /tilbud/index.html.
 * Targets high-volume keywords: "kiwi tilbud", "rema 1000 tilbud", "meny tilbud" (5000/mnd each).
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync, rmSync } from 'fs';

const API = 'https://glpowwptzbokwtkbsnko.supabase.co/rest/v1/rpc/get_tilbud_pages_data';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdscG93d3B0emJva3d0a2JzbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMDY1MDUsImV4cCI6MjA3ODc4MjUwNX0.NCuL94b5hbGybvYHhGhk3ePpYfNK3KwaONRmDAr0MvM';
const OUT_DIR = 'tilbud';

function slugifyChain(chain) {
  return chain.toLowerCase().replace(/\s+/g, '-');
}

function fmtKr(n) {
  const num = Number(n);
  if (Number.isInteger(num)) return num + ',\u2013';
  return num.toFixed(2).replace('.', ',');
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(d) {
  const parts = String(d).split('-');
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function weekLabel() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const f = d => `${d.getDate()}.${d.getMonth()+1}`;
  return `${f(start)}\u2013${f(end)}.${end.getFullYear()}`;
}

function buildChainPage(chain, deals, allChains, totalDeals) {
  const slug = slugifyChain(chain);
  const today = new Date().toISOString().slice(0, 10);
  const week = weekLabel();

  function renderDeal(d) {
    const discount = d.discount_percent ? `-${Math.round(d.discount_percent)}%` : '';
    const origPrice = d.original_price ? `<span style="text-decoration:line-through;color:#94a3b8;font-size:0.7rem;margin-right:0.3rem">${fmtKr(d.original_price)}</span>` : '';
    return `          <div style="display:flex;align-items:center;padding:0.7rem 0;border-bottom:1px solid #f1f5f9;gap:0.75rem">
            ${d.image ? `<img src="${escHtml(d.image)}" alt="" style="width:44px;height:44px;object-fit:contain;border-radius:0.5rem;flex-shrink:0" loading="lazy" />` : '<div style="width:44px;height:44px;background:#f1f5f9;border-radius:0.5rem;flex-shrink:0"></div>'}
            <div style="flex:1;min-width:0">
              <div style="font-size:0.82rem;font-weight:500;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(d.product_name)}</div>
              <div style="font-size:0.68rem;color:#94a3b8">Gyldig til ${fmtDate(d.valid_until)}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-family:'DM Mono',monospace;font-size:0.85rem;font-weight:600;color:#2d6a4f">${origPrice}${fmtKr(d.promo_price)}</div>
              ${discount ? `<div style="font-size:0.65rem;font-weight:700;color:#dc2626;background:#fef2f2;padding:0.1rem 0.35rem;border-radius:0.2rem;display:inline-block">${discount}</div>` : ''}
            </div>
          </div>`;
  }
  const topDeals = deals.slice(0, 10).map(renderDeal).join('\n');
  const restDeals = deals.slice(10).map(renderDeal).join('\n');

  const otherChains = allChains.filter(c => c !== chain).map(c =>
    `            <a href="/tilbud/${slugifyChain(c)}.html" style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;font-size:0.85rem;color:#334155;text-decoration:none;border-bottom:1px solid #f1f5f9">${escHtml(c)} tilbud <span style="color:#94a3b8">\u203a</span></a>`
  ).join('\n');

  const proseDeals = deals.slice(0, 5).map(d =>
    `${d.product_name} til ${fmtKr(d.promo_price)} kr (${d.discount_percent ? `-${Math.round(d.discount_percent)}%` : 'tilbud'})`
  ).join(', ');

  const description = `${chain} tilbud denne uken (${week}): ${deals.length} varer p\u00e5 tilbud. ${proseDeals}. Se alle tilbud fra ${chain} p\u00e5 SeSum.`;

  const faqLd = {
    '@type': 'FAQPage',
    'mainEntity': [
      {
        '@type': 'Question',
        'name': `Hva er p\u00e5 tilbud hos ${chain} denne uken?`,
        'acceptedAnswer': { '@type': 'Answer', 'text': `${chain} har ${deals.length} varer p\u00e5 tilbud denne uken (${week}). Blant de st\u00f8rste rabattene: ${proseDeals}. Se alle tilbud p\u00e5 SeSum.` }
      },
      {
        '@type': 'Question',
        'name': 'Hva er forskjellen p\u00e5 SeSum og en tilbudsavis-app?',
        'acceptedAnswer': { '@type': 'Answer', 'text': 'Tilbudsavis-apper viser kun ukens kampanjer fra reklameaviser. SeSum er en prisportal \u2013 du ser b\u00e5de tilbudspriser og vanlige priser p\u00e5 alle varer, slik at du kan sjekke om et \u00abtilbud\u00bb faktisk er billig. Du kan ogs\u00e5 sammenligne priser p\u00e5 tvers av alle kjeder.' }
      },
      {
        '@type': 'Question',
        'name': 'Hvordan f\u00e5r SeSum prisene sine?',
        'acceptedAnswer': { '@type': 'Answer', 'text': 'SeSum bygger prisene fra kvitteringsdata som brukerne deler. N\u00e5r du bruker appen og deler kvitteringene dine, bidrar du til \u00e5 bygge Norges f\u00f8rste ekte prisportal for matvarer. Jo flere som bruker SeSum, jo bedre og mer n\u00f8yaktige blir prisene for alle.' }
      },
      {
        '@type': 'Question',
        'name': `N\u00e5r oppdateres ${chain} tilbud?`,
        'acceptedAnswer': { '@type': 'Answer', 'text': `SeSum henter nye tilbud fra butikkenes reklameaviser daglig. Vanlige priser oppdateres l\u00f8pende basert p\u00e5 kvitteringsdata fra brukerne.` }
      }
    ]
  };

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        'name': `${chain} tilbud denne uken`,
        'description': description,
        'dateModified': today,
        'speakable': { '@type': 'SpeakableSpecification', 'cssSelector': ['h1', '.insight-prose'] }
      },
      faqLd,
      {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Forside', 'item': 'https://www.sesum.no/' },
          { '@type': 'ListItem', 'position': 2, 'name': 'Tilbud', 'item': 'https://www.sesum.no/tilbud/' },
          { '@type': 'ListItem', 'position': 3, 'name': `${chain} tilbud` }
        ]
      }
    ]
  };

  return `<!DOCTYPE html>
<html lang="nb">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(chain)} tilbud denne uken (${week}) | SeSum</title>
  <link rel="canonical" href="https://www.sesum.no/tilbud/${slug}.html" />
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="description" content="${escHtml(description)}" />
  <meta name="theme-color" content="#2d6a4f" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.sesum.no/tilbud/${slug}.html" />
  <meta property="og:title" content="${escHtml(chain)} tilbud denne uken \u2013 SeSum" />
  <meta property="og:description" content="${escHtml(description)}" />
  <meta property="og:site_name" content="SeSum" />
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
  </style>
</head>
<body class="min-h-screen overflow-x-hidden">
  <nav class="px-5 py-5 flex items-center justify-between relative z-10">
    <a href="/" class="flex items-center gap-2">
      <img src="/sesum-logo.png" alt="SeSum logo" class="h-9 w-auto rounded-xl" width="36" height="36" />
      <span class="text-xl font-bold tracking-tight text-slate-900">SeSum</span>
    </a>
    <a href="/tilbud/" class="text-xs font-semibold text-slate-500 hover:text-slate-700">Alle tilbud</a>
  </nav>

  <div class="px-5">
    <div class="max-w-md mx-auto">
      <nav class="text-[11px] text-slate-400 mb-4" aria-label="Br\u00f8dsmuler">
        <a href="/" class="hover:text-slate-600">Forside</a>
        <span class="mx-1">/</span>
        <a href="/tilbud/" class="hover:text-slate-600">Tilbud</a>
        <span class="mx-1">/</span>
        <span class="text-slate-600">${escHtml(chain)}</span>
      </nav>
    </div>
  </div>

  <main class="px-5 pb-12">
    <div class="max-w-md mx-auto">
      <h1 class="text-2xl font-bold text-slate-900 mb-1">${escHtml(chain)} tilbud</h1>
      <p class="text-sm text-slate-500 mb-4">Viser ${deals.length} av ${totalDeals} tilbud denne uken (${week})</p>

      <!-- AI-crawlable prose (visually hidden, readable by crawlers) -->
      <div class="insight-prose" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">
        <p>Hva er p\u00e5 tilbud hos ${escHtml(chain)} denne uken? ${escHtml(chain)} har ${deals.length} varer p\u00e5 tilbud med opptil ${deals[0]?.discount_percent ? Math.round(deals[0].discount_percent) : '?'}% rabatt. Blant de beste tilbudene: ${proseDeals}. Sist oppdatert ${today}.</p>
      </div>

      <div class="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
${topDeals}
      </div>

      <!-- App pitch - after 10 deals, before the rest -->
      <div style="background:linear-gradient(135deg,#2d6a4f 0%,#1b4332 100%);border-radius:1rem;padding:1.5rem;margin-bottom:1rem;color:white">
        <div style="font-size:0.65rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;opacity:0.7;margin-bottom:0.5rem">Norges prisportal for matvarer</div>
        <h3 style="font-size:1.15rem;font-weight:700;margin:0 0 0.5rem 0;line-height:1.3">Du ser ${deals.length} av ${totalDeals} tilbud</h3>
        <p style="font-size:0.8rem;opacity:0.85;margin:0 0 1rem 0;line-height:1.6">I SeSum-appen ser du alle ${totalDeals} tilbudene fra ${escHtml(chain)}, sammenligner p\u00e5 tvers av kjeder, og sjekker om tilbudsprisen faktisk er billig. Bygget p\u00e5 ekte kvitteringsdata fra norske forbrukere.</p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem">
          <span style="font-size:0.7rem;background:rgba(255,255,255,0.15);padding:0.3rem 0.6rem;border-radius:999px">\u2713 Alle priser, ikke bare tilbud</span>
          <span style="font-size:0.7rem;background:rgba(255,255,255,0.15);padding:0.3rem 0.6rem;border-radius:999px">\u2713 Sammenlign priser og tilbud p\u00e5 tvers av alle kjeder</span>
          <span style="font-size:0.7rem;background:rgba(255,255,255,0.15);padding:0.3rem 0.6rem;border-radius:999px">\u2713 14 butikkjeder</span>
          <span style="font-size:0.7rem;background:rgba(255,255,255,0.15);padding:0.3rem 0.6rem;border-radius:999px">\u2713 Prishistorikk</span>
          <span style="font-size:0.7rem;background:rgba(255,255,255,0.15);padding:0.3rem 0.6rem;border-radius:999px">\u2713 Varsler p\u00e5 favoritter</span>
        </div>
        <a href="/" style="display:block;background:white;color:#2d6a4f;font-weight:700;font-size:0.875rem;padding:0.85rem 1.5rem;border-radius:0.75rem;text-decoration:none;text-align:center">Bli med \u00e5 teste SeSum</a>
      </div>

      ${restDeals ? `<div class="bg-white rounded-2xl border border-slate-100 p-4 mb-4">\n${restDeals}\n      </div>` : ''}

      <!-- FAQ (first Q hidden visually, visible to crawlers) -->
      <div style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">
        <h2>Hva er p\u00e5 tilbud hos ${escHtml(chain)} denne uken?</h2>
        <p>${escHtml(chain)} har ${deals.length} varer p\u00e5 tilbud denne uken. St\u00f8rste rabatter: ${proseDeals}.</p>
      </div>
      <div class="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
        <h2 class="text-sm font-semibold text-slate-900 mb-3">Vanlige sp\u00f8rsm\u00e5l</h2>
        <details style="border-bottom:1px solid #f1f5f9;padding-bottom:0.5rem;margin-bottom:0.5rem">
          <summary style="font-size:0.85rem;font-weight:600;color:#1e293b;cursor:pointer;padding:0.25rem 0;list-style:none;display:flex;justify-content:space-between;align-items:center">Hva er forskjellen p\u00e5 SeSum og en tilbudsavis-app?<span style="color:#2d6a4f;font-weight:700;font-size:1.1rem">+</span></summary>
          <p style="font-size:0.78rem;color:#64748b;line-height:1.6;padding:0.25rem 0">Tilbudsavis-apper viser kun ukens kampanjer fra reklameaviser. SeSum er en prisportal \u2013 du ser b\u00e5de tilbudspriser og vanlige priser p\u00e5 alle varer, slik at du kan sjekke om et \u00abtilbud\u00bb faktisk er billig. Du kan ogs\u00e5 sammenligne priser p\u00e5 tvers av alle kjeder, ikke bare se \u00e9n kjede om gangen.</p>
        </details>
        <details style="border-bottom:1px solid #f1f5f9;padding-bottom:0.5rem;margin-bottom:0.5rem">
          <summary style="font-size:0.85rem;font-weight:600;color:#1e293b;cursor:pointer;padding:0.25rem 0;list-style:none;display:flex;justify-content:space-between;align-items:center">Hvordan f\u00e5r SeSum prisene sine?<span style="color:#2d6a4f;font-weight:700;font-size:1.1rem">+</span></summary>
          <p style="font-size:0.78rem;color:#64748b;line-height:1.6;padding:0.25rem 0">SeSum bygger prisene fra kvitteringsdata som brukerne deler. N\u00e5r du bruker appen og deler kvitteringene dine, bidrar du til \u00e5 bygge Norges f\u00f8rste ekte prisportal for matvarer. Jo flere som bruker SeSum, jo bedre og mer n\u00f8yaktige blir prisene for alle.</p>
        </details>
        <details>
          <summary style="font-size:0.85rem;font-weight:600;color:#1e293b;cursor:pointer;padding:0.25rem 0;list-style:none;display:flex;justify-content:space-between;align-items:center">N\u00e5r oppdateres tilbudene?<span style="color:#2d6a4f;font-weight:700;font-size:1.1rem">+</span></summary>
          <p style="font-size:0.78rem;color:#64748b;line-height:1.6;padding:0.25rem 0">SeSum henter nye tilbud fra butikkenes reklameaviser daglig. Vanlige priser oppdateres l\u00f8pende basert p\u00e5 kvitteringsdata fra brukerne.</p>
        </details>
      </div>

      <div class="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
        <h2 class="text-sm font-semibold text-slate-900 mb-3">Tilbud fra andre kjeder</h2>
${otherChains}
      </div>

      <p class="text-[10px] text-slate-400 text-center">Tilbudsdata fra butikkenes reklameaviser. Sist oppdatert ${today}.</p>
    </div>
  </main>

  <footer class="px-5 pb-8">
    <div class="max-w-md mx-auto text-center space-y-3">
      <div class="flex justify-center flex-wrap gap-4 text-xs text-slate-500">
        <a href="/" class="hover:text-slate-700">Forside</a>
        <a href="/priser.html" class="hover:text-slate-700">Priser</a>
        <a href="/tilbud/" class="hover:text-slate-700">Tilbud</a>
        <a href="/produkt/" class="hover:text-slate-700">Produkter</a>
        <a href="/innsikter.html" class="hover:text-slate-700">Innsikter</a>
        <a href="mailto:hei@sesum.no" class="hover:text-slate-700">Kontakt</a>
      </div>
      <p class="text-[10px] text-slate-400">&copy; 2026 SeSum. Laget i Norge.</p>
    </div>
  </footer>
</body>
</html>`;
}

function buildIndexPage(chains) {
  const today = new Date().toISOString().slice(0, 10);
  const week = weekLabel();
  const totalDeals = chains.reduce((sum, c) => sum + (c.deals?.length || 0), 0);

  const chainCards = chains.map(c => {
    const slug = slugifyChain(c.chain);
    const topDeal = c.deals?.[0];
    return `        <a href="/tilbud/${slug}.html" class="block bg-white rounded-2xl border border-slate-100 p-4 hover:border-emerald-200 transition-colors">
          <div class="flex items-center justify-between mb-2">
            <span class="text-base font-bold text-slate-900">${escHtml(c.chain)}</span>
            <span class="text-xs font-semibold text-[#2d6a4f] bg-emerald-50 px-2 py-0.5 rounded-full">${c.deals?.length || 0} tilbud</span>
          </div>
          ${topDeal ? `<p class="text-xs text-slate-500">Beste: ${escHtml(topDeal.product_name)} til ${fmtKr(topDeal.promo_price)} kr ${topDeal.discount_percent ? `(-${Math.round(topDeal.discount_percent)}%)` : ''}</p>` : ''}
        </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="nb">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dagligvaretilbud denne uken \u2013 KIWI, REMA 1000, Meny, SPAR | SeSum</title>
  <link rel="canonical" href="https://www.sesum.no/tilbud/" />
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="description" content="Se ukens beste tilbud p\u00e5 dagligvarer fra KIWI, REMA 1000, Meny, SPAR og Joker. ${totalDeals} varer p\u00e5 tilbud denne uken. Oppdateres daglig." />
  <meta name="theme-color" content="#2d6a4f" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "name": "Dagligvaretilbud denne uken",
        "description": "${totalDeals} varer p\u00e5 tilbud hos norske dagligvarekjeder denne uken.",
        "dateModified": "${today}"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Hvilke dagligvaretilbud gjelder denne uken?",
            "acceptedAnswer": { "@type": "Answer", "text": "Denne uken (${week}) er det ${totalDeals} varer p\u00e5 tilbud hos KIWI, REMA 1000, Meny, SPAR og Joker. SeSum henter tilbud daglig fra butikkenes reklameaviser." }
          }
        ]
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Forside", "item": "https://www.sesum.no/" },
          { "@type": "ListItem", "position": 2, "name": "Tilbud" }
        ]
      }
    ]
  }
  </script>
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
      <h1 class="text-2xl font-bold text-slate-900 mb-1">Dagligvaretilbud</h1>
      <p class="text-sm text-slate-500 mb-6">${totalDeals} varer p\u00e5 tilbud denne uken (${week}). Oppdateres daglig.</p>
      <div class="space-y-3">
${chainCards}
      </div>
      <div class="text-center pt-6 mb-4">
        <p class="text-sm text-slate-600 mb-3">F\u00e5 varsel n\u00e5r favorittvaren din er p\u00e5 tilbud</p>
        <a href="/" class="inline-block bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]">
          F\u00e5 tidlig tilgang til SeSum
        </a>
      </div>
    </div>
  </main>
  <footer class="px-5 pb-8">
    <div class="max-w-md mx-auto text-center space-y-3">
      <div class="flex justify-center flex-wrap gap-4 text-xs text-slate-500">
        <a href="/" class="hover:text-slate-700">Forside</a>
        <a href="/priser.html" class="hover:text-slate-700">Priser</a>
        <a href="/produkt/" class="hover:text-slate-700">Produkter</a>
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
  if (!res.ok) { console.error('API failed:', res.status); process.exit(1); }
  const data = await res.json();
  const chains = data.chains || [];

  console.log(`Generating tilbud pages for ${chains.length} chains...`);

  // Clean and recreate
  if (existsSync(OUT_DIR)) {
    for (const f of readdirSync(OUT_DIR)) rmSync(`${OUT_DIR}/${f}`);
  } else {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  const allChainNames = chains.map(c => c.chain);

  for (const c of chains) {
    if (!c.deals || c.deals.length === 0) continue;
    const slug = slugifyChain(c.chain);
    writeFileSync(`${OUT_DIR}/${slug}.html`, buildChainPage(c.chain, c.deals, allChainNames, c.total_deals || c.deals.length), 'utf-8');
    console.log(`  ${c.chain}: ${c.deals.length} deals`);
  }

  writeFileSync(`${OUT_DIR}/index.html`, buildIndexPage(chains), 'utf-8');

  // Update sitemap
  const today = new Date().toISOString().slice(0, 10);
  let sitemap = readFileSync('sitemap.xml', 'utf-8');
  sitemap = sitemap.replace(/\s*<url>\s*<loc>https:\/\/www\.sesum\.no\/tilbud\/[^<]*<\/loc>[\s\S]*?<\/url>/g, '');

  const tilbudEntries = [
    `  <url>\n    <loc>https://www.sesum.no/tilbud/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>`,
    ...chains.filter(c => c.deals?.length > 0).map(c =>
      `  <url>\n    <loc>https://www.sesum.no/tilbud/${slugifyChain(c.chain)}.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`
    )
  ].join('\n');

  sitemap = sitemap.replace('</urlset>', `${tilbudEntries}\n</urlset>`);
  writeFileSync('sitemap.xml', sitemap, 'utf-8');

  console.log(`Generated ${chains.filter(c => c.deals?.length > 0).length} chain pages + index`);
}

main().catch(e => { console.error(e); process.exit(1); });
