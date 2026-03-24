/**
 * Fetches live price comparison data from get_kiwi_vs_rema_prices()
 * and updates hardcoded fallback values in kiwi-vs-rema.html.
 *
 * Curated product list: only products we've verified are correct matches.
 * Products are excluded if they have obvious data issues (wrong pack size,
 * EMV cross-contamination, non-products like pant/bærepose).
 */

import { readFileSync, writeFileSync } from 'fs';

const API = 'https://glpowwptzbokwtkbsnko.supabase.co/rest/v1/rpc/get_kiwi_vs_rema_prices';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdscG93d3B0emJva3d0a2JzbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMDY1MDUsImV4cCI6MjA3ODc4MjUwNX0.NCuL94b5hbGybvYHhGhk3ePpYfNK3KwaONRmDAr0MvM';
const FILE = 'kiwi-vs-rema.html';

// Products to EXCLUDE (known bad data)
const EXCLUDE = new Set([
  'Bærepose',
  'Pant stor flaske',
  'Pant liten flaske',
  'Smågodt løsvekt',
  'PRIMA KJØTTDEIG 14% 400G',  // EMV cross-contamination
  'Stabbur-Makrell i Tomat 110g Stabburet',  // REMA price is multi-pack
  'Tomater stk',  // per-kg vs per-stk mismatch
  'Mango stykk First Price',  // NG EMV at REMA
]);

// Curated products to FEATURE in the main table (recognizable everyday items)
const FEATURED = new Set([
  'Meierismør 500g Tine',
  'Coca-Cola Zero 0,5l flaske',
  'Coca-Cola Zero 1,5l flaske',
  'Pepsi Max 1,5l flaske',
  'Avocado 2pk',
  'Helmelk 1l Tine',
  'Lettmelk 1% 1,75l Q',
  'Kremfløte 37% 3dl Tine',
  'Kjøttdeig 14% 400g',
  'Wienerpølse 520g Gilde',
  'Big One Pizza American Classic 570g',
  'Melkesjokolade Kvikk Lunsj 200g Freia',
  'Melkesjokolade m/Daim 200g Freia',
  'Superchips Salt 130g Maarud',
  'Leverpostei Ovnsbakt Original 190g Gilde',
  'Stabbur-Makrell Finhakket 90g',
  'NUGATTI 500G',
  'Jordbærsyltetøy Hjemmelaget 400g Nora',
  'NATURELL KYLLINGFILET 480G',
  'Gulrot 750g beger',
  'Isbergsalat stk',
  'Farris Frus Bringebær 1,5l flaske',
  'Lettrømme 17% 300g Q',
  'Agurk stk',
]);

function fmt(n) {
  return String(n).replace('.', ',');
}

function fmtKr(n) {
  const num = Number(n);
  if (Number.isInteger(num)) return num + ',–';
  return fmt(num.toFixed(2));
}

function fmtMonth(iso) {
  const d = new Date(iso);
  const months = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember'];
  return months[d.getMonth()] + ' ' + d.getFullYear();
}

function updateDataLive(html, key, value) {
  const re = new RegExp(`(<[^>]+data-live="${key}"[^>]*>)[^<]*(</[^>]+>)`, 'g');
  return html.replace(re, `$1${value}$2`);
}

async function main() {
  const res = await fetch(API, {
    headers: { 'apikey': KEY, 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    console.error('API fetch failed:', res.status, await res.text());
    process.exit(1);
  }
  const d = await res.json();
  if (!d || !d.summary) {
    console.error('Invalid API response');
    process.exit(1);
  }

  // Filter exact matches
  const exactMatches = (d.exact_matches || []).filter(p => !EXCLUDE.has(p.product_name));
  const featured = exactMatches.filter(p => FEATURED.has(p.product_name));

  // Recalculate summary from clean data only
  const clean = exactMatches.concat(d.category_matches || []);
  const remaWins = clean.filter(p => Number(p.rema_price || p.rema_price) < Number(p.kiwi_price || p.kiwi_price)).length;
  const kiwiWins = clean.filter(p => Number(p.kiwi_price || p.kiwi_price) < Number(p.rema_price || p.rema_price)).length;
  const same = clean.length - remaWins - kiwiWins;
  const total = clean.length;

  console.log('Fetched data:');
  console.log(`  Total clean comparisons: ${total}`);
  console.log(`  REMA cheaper: ${remaWins} (${(remaWins/total*100).toFixed(1)}%)`);
  console.log(`  KIWI cheaper: ${kiwiWins} (${(kiwiWins/total*100).toFixed(1)}%)`);
  console.log(`  Same price: ${same}`);
  console.log(`  Featured products: ${featured.length}`);

  let html = readFileSync(FILE, 'utf-8');

  // Update summary stats
  html = updateDataLive(html, 'total_compared', total);
  html = updateDataLive(html, 'rema_cheaper_count', remaWins);
  html = updateDataLive(html, 'kiwi_cheaper_count', kiwiWins);
  html = updateDataLive(html, 'same_price_count', same);
  html = updateDataLive(html, 'rema_cheaper_pct', (remaWins/total*100).toFixed(1).replace('.', ','));
  html = updateDataLive(html, 'kiwi_cheaper_pct', (kiwiWins/total*100).toFixed(1).replace('.', ','));

  // Build price table HTML (with sale badges)
  const saleTag = ' <span class="sale-badge">tilbud</span>';
  const tableRows = featured.sort((a, b) => Math.abs(Number(b.diff_kr)) - Math.abs(Number(a.diff_kr))).map(p => {
    const rp = Number(p.rema_price);
    const kp = Number(p.kiwi_price);
    const diff = Number(p.diff_kr);
    const rClass = rp <= kp ? 'price-cheap' : '';
    const kClass = kp <= rp ? 'price-cheap' : '';
    const rSale = p.rema_on_sale ? saleTag : '';
    const kSale = p.kiwi_on_sale ? saleTag : '';
    const diffStr = diff > 0 ? `+${fmt(diff.toFixed(0))} kr` : diff < 0 ? `${fmt(diff.toFixed(0))} kr` : 'lik';
    const diffClass = diff === 0 ? '' : diff > 0 ? 'diff-rema' : 'diff-kiwi';
    return `            <tr>
              <td class="pl-4">${p.product_name}</td>
              <td class="text-right ${rClass}">${fmtKr(rp)}${rSale}</td>
              <td class="text-right ${kClass}">${fmtKr(kp)}${kSale}</td>
              <td class="text-right pr-4"><span class="diff-badge ${diffClass}">${diffStr}</span></td>
            </tr>`;
  }).join('\n');

  // Replace table body
  html = html.replace(
    /(<tbody id="price-table-body">)[\s\S]*?(<\/tbody>)/,
    `$1\n${tableRows}\n          $2`
  );

  // Update FAQ answers with fresh numbers
  const kiwiPctStr = (kiwiWins/total*100).toFixed(0);
  const remaPctStr = (remaWins/total*100).toFixed(0);

  // Find specific product prices for FAQ
  const melk = exactMatches.find(p => p.product_name === 'Lettmelk 1% 1,75l Q');
  const kjottdeig = exactMatches.find(p => p.product_name === 'Kjøttdeig 14% 400g');
  const smor = exactMatches.find(p => p.product_name === 'Meierismør 500g Tine');

  html = updateDataLive(html, 'faq_total', total);
  html = updateDataLive(html, 'faq_kiwi_pct', kiwiPctStr);
  html = updateDataLive(html, 'faq_rema_pct', remaPctStr);

  if (melk) {
    html = updateDataLive(html, 'faq_melk_rema', fmtKr(Number(melk.rema_price)));
    html = updateDataLive(html, 'faq_melk_kiwi', fmtKr(Number(melk.kiwi_price)));
  }
  if (kjottdeig) {
    html = updateDataLive(html, 'faq_kjottdeig_rema', fmtKr(Number(kjottdeig.rema_price)));
    html = updateDataLive(html, 'faq_kjottdeig_kiwi', fmtKr(Number(kjottdeig.kiwi_price)));
  }

  // Update date
  html = updateDataLive(html, 'last_updated', fmtMonth(d.generated_at));

  // Update JSON-LD
  html = html.replace(
    /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,
    (match, open, jsonStr, close) => {
      try {
        const ld = JSON.parse(jsonStr);
        const graph = ld['@graph'] || [ld];
        // Update Article dateModified
        const article = graph.find(g => g['@type'] === 'Article');
        if (article) article.dateModified = new Date().toISOString().slice(0, 10);
        // Update FAQPage answers
        const faq = graph.find(g => g['@type'] === 'FAQPage');
        if (faq && faq.mainEntity) {
          // FAQ 1: Er REMA billigere enn KIWI?
          if (faq.mainEntity[0]) {
            faq.mainEntity[0].acceptedAnswer.text = `Basert p\u00e5 ${total} produkter med priser i begge kjeder er KIWI billigst p\u00e5 ${kiwiPctStr} % av produktene, REMA 1000 p\u00e5 ${remaPctStr} %, og ${same} produkter har lik pris. Prisforskjellene varierer mye mellom kategorier \u2013 sjekk tabellen for spesifikke produkter.`;
          }
          // FAQ 2: Hva koster melk?
          if (faq.mainEntity[1] && melk) {
            faq.mainEntity[1].acceptedAnswer.text = `Lettmelk 1 % 1,75 l (Q) koster ${fmtKr(Number(melk.rema_price))} p\u00e5 REMA 1000 og ${fmtKr(Number(melk.kiwi_price))} p\u00e5 KIWI. Prisene er normalpriser (ikke tilbud) fra SeSum sin prisportal.`;
          }
          // FAQ 3: Hva koster kjøttdeig?
          if (faq.mainEntity[2] && kjottdeig) {
            faq.mainEntity[2].acceptedAnswer.text = `Kj\u00f8ttdeig 14 % 400 g koster ${fmtKr(Number(kjottdeig.rema_price))} p\u00e5 REMA 1000 og ${fmtKr(Number(kjottdeig.kiwi_price))} p\u00e5 KIWI. Begge kjedene har ogs\u00e5 billigere EMV-alternativer (Prima hos REMA, First Price hos KIWI).`;
          }
        }
        return open + '\n  ' + JSON.stringify(ld, null, 2).split('\n').join('\n  ') + '\n  ' + close;
      } catch (e) {
        console.error('Failed to update JSON-LD:', e.message);
        return match;
      }
    }
  );

  // Update meta description
  html = html.replace(
    /(<meta\s+name="description"\s+content=")[^"]*"/,
    `$1Sammenligning av KIWI og REMA 1000: Basert p\u00e5 ${total} produkter er KIWI billigst p\u00e5 ${kiwiPctStr} % og REMA p\u00e5 ${remaPctStr} %. Se faktiske priser p\u00e5 hverdagsvarer."`
  );
  html = html.replace(
    /(<meta\s+property="og:description"\s+content=")[^"]*"/,
    `$1KIWI vs REMA 1000: Hvem er billigst? Se faktiske priser p\u00e5 ${total} produkter."`
  );

  writeFileSync(FILE, html, 'utf-8');
  console.log('Updated', FILE);
}

main().catch(e => { console.error(e); process.exit(1); });
