/**
 * Updates hardcoded fallback stats in prisportal-matvarer.html
 * from the same get_innsikter_stats() RPC used by innsikter.html.
 */

import { readFileSync, writeFileSync } from 'fs';

const API = 'https://glpowwptzbokwtkbsnko.supabase.co/rest/v1/rpc/get_innsikter_stats';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdscG93d3B0emJva3d0a2JzbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMDY1MDUsImV4cCI6MjA3ODc4MjUwNX0.NCuL94b5hbGybvYHhGhk3ePpYfNK3KwaONRmDAr0MvM';
const FILE = 'prisportal-matvarer.html';

function fmt(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
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
    console.error('API fetch failed:', res.status);
    process.exit(1);
  }
  const d = await res.json();
  if (!d || !d.overview) {
    console.error('Invalid API response');
    process.exit(1);
  }

  console.log('Updating prisportal-matvarer.html:');
  console.log(`  Receipts: ${d.overview.total_receipts}`);
  console.log(`  Price changes: ${d.overview.price_changes_tracked}`);
  console.log(`  Chains: ${d.overview.chains_with_curves}`);
  if (d.savings) console.log(`  Avg diff: ${d.savings.avg_price_diff_pct}%`);

  let html = readFileSync(FILE, 'utf-8');

  html = updateDataLive(html, 'pp_total_receipts', fmt(d.overview.total_receipts) + '+');
  html = updateDataLive(html, 'pp_price_changes', fmt(d.overview.price_changes_tracked));
  html = updateDataLive(html, 'pp_chains', d.overview.chains_with_curves);

  if (d.savings) {
    html = updateDataLive(html, 'pp_avg_diff_pct', String(d.savings.avg_price_diff_pct).replace('.', ',') + ' %');
  }

  writeFileSync(FILE, html, 'utf-8');
  console.log('Updated', FILE);
}

main().catch(e => { console.error(e); process.exit(1); });
