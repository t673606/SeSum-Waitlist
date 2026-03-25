#!/usr/bin/env python3
"""Batch-update all HTML files to use unified site navigation and footer."""
import re
import os
import glob

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NAV_HTML = '''  <nav class="site-nav" aria-label="Hovednavigasjon">
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
      </div>
      <button class="site-nav-toggle" aria-label="Meny" aria-expanded="false">
        <svg class="site-nav-icon-open" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        <svg class="site-nav-icon-close" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="site-nav-mobile">
      <a href="/produkt/">Produkter</a>
      <a href="/tilbud/">Tilbud</a>
      <a href="/kiwi-vs-rema.html">Sammenlign</a>
      <a href="/innsikter.html">Innsikter</a>
    </div>
  </nav>'''

FOOTER_HTML = '''  <footer class="site-footer">
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
        <a href="/bruksvilkar.html">Bruksvilk\\u00e5r</a>
        <a href="mailto:hei@sesum.no">Kontakt</a>
      </div>
      <p class="site-footer-copy">&copy; 2026 SeSum. Sammenlign dagligvarepriser i Norge. Laget i Norge.</p>
    </div>
  </footer>'''

HEAD_CSS = '  <link rel="stylesheet" href="/nav.css" />'
HEAD_JS = '  <script src="/nav.js" defer></script>'

# Fix the unicode escape in FOOTER_HTML
FOOTER_HTML = FOOTER_HTML.replace('\\u00e5', '\u00e5')


def add_head_links(content):
    """Add nav.css and nav.js to <head> if not already present."""
    if 'nav.css' not in content:
        content = content.replace('</head>', HEAD_CSS + '\n' + HEAD_JS + '\n</head>')
    return content


def replace_header_nav(content):
    """Replace the first <header> or <nav> after <body> with the new site nav."""
    body_match = re.search(r'<body[^>]*>', content)
    if not body_match:
        return content

    body_end = body_match.end()
    after_body = content[body_end:]

    # Find positions of first <header and first <nav after <body>
    header_idx = after_body.find('<header')
    nav_idx = after_body.find('<nav')

    # Determine which comes first
    if header_idx != -1 and (nav_idx == -1 or header_idx < nav_idx):
        # Replace <header>...</header>
        match = re.search(r'<header[^>]*>.*?</header>', after_body, re.DOTALL)
        if match:
            before = content[:body_end + match.start()]
            after = content[body_end + match.end():]
            return before + '\n' + NAV_HTML + '\n' + after
    elif nav_idx != -1:
        # Replace first <nav>...</nav> (not breadcrumb)
        match = re.search(r'<nav(?![^>]*aria-label\s*=\s*"Br\u00f8dsmuler")[^>]*>.*?</nav>',
                          after_body, re.DOTALL)
        if match:
            before = content[:body_end + match.start()]
            after = content[body_end + match.end():]
            return before + '\n' + NAV_HTML + '\n' + after

    return content


def replace_footer(content):
    """Replace the last <footer>...</footer> with the new site footer."""
    matches = list(re.finditer(r'<footer[^>]*>.*?</footer>', content, re.DOTALL))
    if matches:
        last = matches[-1]
        return content[:last.start()] + FOOTER_HTML + content[last.end():]
    return content


def process_file(filepath):
    """Process a single HTML file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Skip tiny files (redirects like metode.html, priser.html)
    if len(content) < 500:
        return 'skip-redirect'

    # Skip 404 (minimal error page, intentionally different)
    basename = os.path.basename(filepath)
    if basename == '404.html':
        # Still update 404 to add nav
        pass

    content = add_head_links(content)
    content = replace_header_nav(content)
    content = replace_footer(content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return 'updated'
    return 'unchanged'


def main():
    files = sorted(glob.glob(os.path.join(REPO, '*.html')))
    files += sorted(glob.glob(os.path.join(REPO, 'produkt', '*.html')))
    files += sorted(glob.glob(os.path.join(REPO, 'tilbud', '*.html')))

    counts = {'updated': 0, 'unchanged': 0, 'skip-redirect': 0}

    for f in files:
        name = os.path.relpath(f, REPO)
        result = process_file(f)
        counts[result] = counts.get(result, 0) + 1
        if result == 'updated':
            print(f'  Updated: {name}')
        elif result == 'skip-redirect':
            print(f'  Skipped (redirect): {name}')

    print(f'\nDone: {counts["updated"]} updated, {counts["unchanged"]} unchanged, '
          f'{counts["skip-redirect"]} skipped')


if __name__ == '__main__':
    main()
