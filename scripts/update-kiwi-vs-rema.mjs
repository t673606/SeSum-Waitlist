/**
 * Fetches live price comparison from get_kiwi_vs_rema_prices()
 * and updates kiwi-vs-rema.html with fresh data.
 * Only shows products where BOTH chains have prices from the last 7 days.
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
  'PRIMA KJØTTDEIG 14% 400G',
  'Mango stykk First Price',
]);

function fmt(n) { return String(n).replace('.', ','); }

function fmtKr(n) {
  const num = Number(n);
  if (Number.isInteger(num)) return num + ',\u2013';
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

  const products = (d.products || []).filter(p => !EXCLUDE.has(p.product_name));
  const total = products.length;
  const remaWins = products.filter(p => p.cheapest === 'REMA 1000').length;
  const kiwiWins = products.filter(p => p.cheapest === 'KIWI').length;
  const same = total - remaWins - kiwiWins;

  console.log('Fetched data:');
  console.log(`  Products (both fresh this week): ${total}`);
  console.log(`  REMA cheaper: ${remaWins}`);
  console.log(`  KIWI cheaper: ${kiwiWins}`);
  console.log(`  Same price: ${same}`);

  let html = readFileSync(FILE, 'utf-8');

  // Update summary
  html = updateDataLive(html, 'total_compared', total);
  html = updateDataLive(html, 'rema_cheaper_count', remaWins);
  html = updateDataLive(html, 'kiwi_cheaper_count', kiwiWins);
  html = updateDataLive(html, 'same_price_count', same);

  // Build price table — sort by absolute diff (biggest differences first), then same-price at end
  const saleTag = ' <span class="sale-badge">tilbud</span>';
  const sorted = products.sort((a, b) => {
    const aDiff = Math.abs(Number(a.diff_kr));
    const bDiff = Math.abs(Number(b.diff_kr));
    if (aDiff === 0 && bDiff === 0) return a.product_name.localeCompare(b.product_name);
    if (aDiff === 0) return 1;
    if (bDiff === 0) return -1;
    return bDiff - aDiff;
  });

  const tableRows = sorted.map(p => {
    const rp = Number(p.rema_price);
    const kp = Number(p.kiwi_price);
    const diff = Number(p.diff_kr);
    const rClass = rp < kp ? 'price-cheap' : rp === kp ? '' : '';
    const kClass = kp < rp ? 'price-cheap' : kp === rp ? '' : '';
    const rSale = p.rema_on_sale ? saleTag : '';
    const kSale = p.kiwi_on_sale ? saleTag : '';
    let diffStr, diffClass;
    if (diff === 0) {
      diffStr = 'lik'; diffClass = '';
    } else if (diff > 0) {
      diffStr = `+${Math.round(diff)} kr`; diffClass = 'diff-rema';
    } else {
      diffStr = `${Math.round(diff)} kr`; diffClass = 'diff-kiwi';
    }
    return `            <tr>
              <td class="pl-4">${p.product_name}</td>
              <td class="text-right ${rClass}">${fmtKr(rp)}${rSale}</td>
              <td class="text-right ${kClass}">${fmtKr(kp)}${kSale}</td>
              <td class="text-right pr-4"><span class="diff-badge ${diffClass}">${diffStr}</span></td>
            </tr>`;
  }).join('\n');

  html = html.replace(
    /(<tbody id="price-table-body">)[\s\S]*?(<\/tbody>)/,
    `$1\n${tableRows}\n          $2`
  );

  // Update FAQ with specific product prices
  const melk = products.find(p => p.product_name.match(/Lettmelk.*1,75l/i) || p.product_name.match(/Helmelk.*1,75l/i));
  const kjottdeig = products.find(p => p.product_name === 'Kjøttdeig 14% 400g');

  html = updateDataLive(html, 'faq_total', total);
  html = updateDataLive(html, 'faq_kiwi_count', kiwiWins);
  html = updateDataLive(html, 'faq_rema_count', remaWins);
  html = updateDataLive(html, 'faq_same_count', same);

  if (melk) {
    html = updateDataLive(html, 'faq_melk_rema', fmtKr(Number(melk.rema_price)));
    html = updateDataLive(html, 'faq_melk_kiwi', fmtKr(Number(melk.kiwi_price)));
    html = updateDataLive(html, 'faq_melk_name', melk.product_name);
  }
  if (kjottdeig) {
    html = updateDataLive(html, 'faq_kjottdeig_rema', fmtKr(Number(kjottdeig.rema_price)));
    html = updateDataLive(html, 'faq_kjottdeig_kiwi', fmtKr(Number(kjottdeig.kiwi_price)));
  }

  html = updateDataLive(html, 'last_updated', fmtMonth(d.generated_at));

  // Update JSON-LD
  html = html.replace(
    /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,
    (match, open, jsonStr, close) => {
      try {
        const ld = JSON.parse(jsonStr);
        const graph = ld['@graph'] || [ld];
        const article = graph.find(g => g['@type'] === 'Article');
        if (article) article.dateModified = new Date().toISOString().slice(0, 10);
        const faq = graph.find(g => g['@type'] === 'FAQPage');
        if (faq && faq.mainEntity) {
          if (faq.mainEntity[0]) {
            faq.mainEntity[0].acceptedAnswer.text = `Basert p\u00e5 ${total} produkter med ferske priser i begge kjeder denne uken: KIWI er billigst p\u00e5 ${kiwiWins}, REMA 1000 p\u00e5 ${remaWins}, og ${same} produkter har lik pris. Hvem som er billigst varierer fra uke til uke avhengig av tilbud og prisendringer.`;
          }
          if (faq.mainEntity[1] && melk) {
            faq.mainEntity[1].acceptedAnswer.text = `${melk.product_name} koster ${fmtKr(Number(melk.rema_price))} p\u00e5 REMA 1000 og ${fmtKr(Number(melk.kiwi_price))} p\u00e5 KIWI denne uken. Prisene oppdateres daglig fra SeSum sin prisportal.`;
          }
          if (faq.mainEntity[2] && kjottdeig) {
            faq.mainEntity[2].acceptedAnswer.text = `Kj\u00f8ttdeig 14 % 400 g koster ${fmtKr(Number(kjottdeig.rema_price))} p\u00e5 REMA 1000 og ${fmtKr(Number(kjottdeig.kiwi_price))} p\u00e5 KIWI denne uken.`;
          }
        }
        return open + '\n  ' + JSON.stringify(ld, null, 2).split('\n').join('\n  ') + '\n  ' + close;
      } catch (e) {
        console.error('Failed to update JSON-LD:', e.message);
        return match;
      }
    }
  );

  // Update meta
  html = html.replace(
    /(<meta\s+name="description"\s+content=")[^"]*"/,
    `$1Prissammenligning KIWI vs REMA 1000: Se faktiske priser p\u00e5 ${total} dagligvarer denne uken. Oppdateres daglig fra SeSum."`
  );

  writeFileSync(FILE, html, 'utf-8');
  console.log('Updated', FILE);
}

main().catch(e => { console.error(e); process.exit(1); });
