/**
 * Updates hardcoded fallback stats in index.html and index-v2.html
 * so that crawlers and no-JS users see current numbers.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const API = 'https://glpowwptzbokwtkbsnko.supabase.co/rest/v1/rpc/get_innsikter_stats';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdscG93d3B0emJva3d0a2JzbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMDY1MDUsImV4cCI6MjA3ODc4MjUwNX0.NCuL94b5hbGybvYHhGhk3ePpYfNK3KwaONRmDAr0MvM';

function fmt(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
}

function fmtRound(n) {
  // Round down to nearest 1000 for display like "23 000+"
  const rounded = Math.floor(n / 1000) * 1000;
  return fmt(rounded) + '+';
}

function updateDataLive(html, key, value) {
  const re = new RegExp(`(<[^>]+data-live="${key}"[^>]*>)[^<]*(</[^>]+>)`, 'g');
  return html.replace(re, `$1${value}$2`);
}

function updateReceiptText(html, receipts) {
  // Update "Basert på XX XXX+ kvitteringer" text
  const rounded = fmtRound(receipts);
  return html.replace(
    /Basert på [\d\s]+\+?\s*kvitteringer/g,
    `Basert på ${rounded} kvitteringer`
  );
}

async function main() {
  const res = await fetch(API, {
    headers: { 'apikey': KEY, 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    console.error('API fetch failed:', res.status);
    process.exit(1);
  }
  const d = await res.json();
  if (!d || !d.overview) {
    console.error('Invalid API response');
    process.exit(1);
  }

  const files = ['index.html', 'index-v2.html'];

  for (const file of files) {
    if (!existsSync(file)) continue;

    let html = readFileSync(file, 'utf-8');

    html = updateDataLive(html, 'total_receipts', fmt(d.overview.total_receipts) + '+');
    html = updateDataLive(html, 'price_changes', fmt(d.overview.price_changes_tracked));
    html = updateDataLive(html, 'products_tracked', fmt(d.overview.products_with_history));
    html = updateDataLive(html, 'chains_count', d.overview.chains_with_curves);
    html = updateReceiptText(html, d.overview.total_receipts);

    writeFileSync(file, html, 'utf-8');
    console.log(`Updated ${file}: ${d.overview.total_receipts} receipts, ${d.overview.price_changes_tracked} price changes, ${d.overview.products_with_history} products`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
