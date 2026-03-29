/**
 * Fetches live stats from get_innsikter_stats() and updates
 * all hardcoded fallback values in innsikter.html so that
 * AI crawlers and no-JS users see current numbers.
 */

import { readFileSync, writeFileSync } from 'fs';

const API = 'https://glpowwptzbokwtkbsnko.supabase.co/rest/v1/rpc/get_innsikter_stats';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdscG93d3B0emJva3d0a2JzbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMDY1MDUsImV4cCI6MjA3ODc4MjUwNX0.NCuL94b5hbGybvYHhGhk3ePpYfNK3KwaONRmDAr0MvM';
const FILE = 'innsikter.html';

function fmt(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
}

function fmtComma(n) {
  return String(n).replace('.', ',');
}

function fmtMonth(iso) {
  const d = new Date(iso);
  const months = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember'];
  return months[d.getMonth()] + ' ' + d.getFullYear();
}

// Update all <span data-live="key">old value</span> occurrences
function updateDataLive(html, key, value) {
  const re = new RegExp(`(<[^>]+data-live="${key}"[^>]*>)[^<]*(</[^>]+>)`, 'g');
  return html.replace(re, `$1${value}$2`);
}

// Update a meta tag's content attribute
function updateMeta(html, selector, value) {
  if (selector.startsWith('meta[name=')) {
    const name = selector.match(/meta\[name="([^"]+)"\]/)[1];
    const re = new RegExp(`(<meta\\s+name="${name}"\\s+content=")[^"]*"`, 'g');
    return html.replace(re, `$1${value}"`);
  }
  if (selector.startsWith('meta[property=')) {
    const prop = selector.match(/meta\[property="([^"]+)"\]/)[1];
    const re = new RegExp(`(<meta\\s+property="${prop}"\\s+content=")[^"]*"`, 'g');
    return html.replace(re, `$1${value}"`);
  }
  return html;
}

async function main() {
  // 1. Fetch live data
  const res = await fetch(API, {
    headers: { 'apikey': KEY, 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    console.error('API fetch failed:', res.status, await res.text());
    process.exit(1);
  }
  const d = await res.json();
  if (!d || !d.overview) {
    console.error('Invalid API response:', JSON.stringify(d).slice(0, 200));
    process.exit(1);
  }

  console.log('Fetched live stats:');
  console.log('  Receipts:', d.overview.total_receipts);
  console.log('  Users:', d.overview.total_users);
  console.log('  Price changes:', d.overview.price_changes_tracked);
  console.log('  Products:', d.overview.products_with_history);
  console.log('  Chains:', d.overview.chains_with_curves);
  if (d.savings) {
    console.log('  Avg/trip:', d.savings.avg_per_trip, 'kr');
    console.log('  Yearly:', d.savings.yearly_estimate, 'kr');
    console.log('  Avg diff:', d.savings.avg_price_diff_pct, '%');
    console.log('  Sample:', d.savings.sample_size);
  }

  let html = readFileSync(FILE, 'utf-8');

  // 2. Update data-live span fallbacks
  const r = fmt(d.overview.total_receipts);

  html = updateDataLive(html, 'total_receipts', r + '+');
  html = updateDataLive(html, 'total_receipts_badge', r + '+');
  html = updateDataLive(html, 'total_receipts_exact', r);
  html = updateDataLive(html, 'price_changes', fmt(d.overview.price_changes_tracked));
  html = updateDataLive(html, 'price_changes_method', fmt(d.overview.price_changes_tracked));
  html = updateDataLive(html, 'products_tracked', fmt(d.overview.products_with_history));
  html = updateDataLive(html, 'products_tracked_method', fmt(d.overview.products_with_history));
  html = updateDataLive(html, 'chains_count', d.overview.chains_with_curves + ' kjeder');
  html = updateDataLive(html, 'total_users', d.overview.total_users);
  html = updateDataLive(html, 'updated_at', 'Sist oppdatert: ' + fmtMonth(d.generated_at) + ' \u00b7 Oppdateres l\u00f8pende');

  if (d.savings) {
    html = updateDataLive(html, 'yearly_savings', fmt(d.savings.yearly_estimate) + ' kr');
    html = updateDataLive(html, 'yearly_savings_inline', fmt(d.savings.yearly_estimate));
    html = updateDataLive(html, 'avg_savings', d.savings.avg_per_trip + ' kr');
    html = updateDataLive(html, 'avg_savings_inline', d.savings.avg_per_trip);
    html = updateDataLive(html, 'avg_diff_pct', fmtComma(d.savings.avg_price_diff_pct) + ' %');
    html = updateDataLive(html, 'avg_diff_pct_inline', fmtComma(d.savings.avg_price_diff_pct));
    html = updateDataLive(html, 'sample_size', d.savings.sample_size);
  }

  if (d.price_changes_by_chain) {
    const parts = d.price_changes_by_chain.map(s => s.chain + ' (' + fmt(s.count) + ')');
    html = updateDataLive(html, 'store_breakdown', ' p\u00e5 tvers av ' + parts.join(', '));
  }

  // 3. Update <title>
  const titleStr = `Prisutvikling dagligvarer Norge 2026 | SeSum`;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${titleStr}</title>`);

  // 4. Update meta tags
  const pc = fmt(d.overview.price_changes_tracked);
  html = updateMeta(html, 'meta[name="description"]',
    `Hva koster dagligvarer i Norge? Se prisutvikling og prisforskjeller basert på ekte kvitteringsdata. Finn ut hvilken butikk som er billigst.`);
  html = updateMeta(html, 'meta[property="og:title"]',
    `Prisutvikling dagligvarer Norge 2026 | SeSum`);
  html = updateMeta(html, 'meta[property="og:description"]',
    `Hva koster dagligvarer i Norge? Se prisutvikling og prisforskjeller basert på ekte kvitteringsdata. Finn ut hvilken butikk som er billigst.`);
  html = updateMeta(html, 'meta[name="twitter:description"]',
    `Hva koster dagligvarer i Norge? Se prisutvikling og prisforskjeller basert på ekte kvitteringsdata. Finn ut hvilken butikk som er billigst.`);

  // 5. Update JSON-LD structured data
  html = html.replace(
    /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,
    (match, open, jsonStr, close) => {
      try {
        const ld = JSON.parse(jsonStr);
        const graph = ld['@graph'];
        if (!graph) return match;

        // WebPage
        graph[0].name = `Prisutvikling dagligvarer Norge 2026 | SeSum`;
        graph[0].description = `Hva koster dagligvarer i Norge? Se prisutvikling og prisforskjeller basert på ekte kvitteringsdata. Finn ut hvilken butikk som er billigst.`;
        graph[0].dateModified = new Date().toISOString().slice(0, 10);

        // Dataset
        const ds = graph[1];
        ds.description = `Prishistorikk og prissammenligninger for vanlige dagligvarer i Norge, basert p\u00e5 ${fmt(d.overview.total_receipts)} kvitteringer skannet av ${d.overview.total_users} betatestere via Trumf-integrasjon. Dekker ${fmt(d.overview.products_with_history)} produkter med ${pc} sporede prisendringer.`;
        ds.variableMeasured[1].value = String(d.overview.price_changes_tracked);
        ds.variableMeasured[2].value = String(d.overview.products_with_history);
        ds.variableMeasured[3].value = String(d.overview.total_receipts);

        // FAQ answers with dynamic numbers
        if (d.savings && graph[2]?.mainEntity) {
          const faq = graph[2].mainEntity;
          // FAQ 2: savings
          if (faq[1]) {
            faq[1].acceptedAnswer.text = `Basert p\u00e5 ${d.savings.sample_size} kvitteringer med tilstrekkelig kjedeoverlapp, kan en gjennomsnittlig norsk handleturt spare ca. ${d.savings.avg_per_trip} kr ved \u00e5 velge billigste butikk. Over 52 ukentlige handleturer tilsvarer det ca. ${fmt(d.savings.yearly_estimate)} kr spart per \u00e5r, uten \u00e5 endre hva du kj\u00f8per.`;
          }
          // FAQ 4: price diff
          if (faq[3]) {
            faq[3].acceptedAnswer.text = `Gjennomsnittlig prisforskjell mellom butikken du handler i og den billigste er ${fmtComma(d.savings.avg_price_diff_pct)} %, basert p\u00e5 SeSum-data fra ${fmt(d.overview.total_receipts)} kvitteringer. For enkeltprodukter kan forskjellen v\u00e6re mye st\u00f8rre \u2013 opptil 136 % for avocado og 117 % for Kvikk Lunsj.`;
          }
        }

        return open + '\n  ' + JSON.stringify(ld, null, 2).split('\n').join('\n  ') + '\n  ' + close;
      } catch (e) {
        console.error('Failed to update JSON-LD:', e.message);
        return match;
      }
    }
  );

  // 6. Write back
  writeFileSync(FILE, html, 'utf-8');
  console.log('Updated', FILE);
}

main().catch(e => { console.error(e); process.exit(1); });
