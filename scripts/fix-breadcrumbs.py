#!/usr/bin/env python3
"""Remove old breadcrumbs and add standardized ones to all pages."""
import re
import os
import glob

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get_h1(content):
    """Extract H1 text from HTML."""
    match = re.search(r'<h1[^>]*>(.*?)</h1>', content, re.DOTALL)
    if match:
        text = re.sub(r'<[^>]+>', '', match.group(1))
        return text.strip()
    return None


def make_breadcrumb(crumbs):
    """Generate breadcrumb HTML from list of (href_or_None, text) tuples.
    Last item is always plain text (current page)."""
    parts = []
    for i, (href, text) in enumerate(crumbs):
        if i > 0:
            parts.append('<span class="site-bc-sep">/</span>')
        if href is not None:
            parts.append(f'<a href="{href}">{text}</a>')
        else:
            parts.append(f'<span class="site-bc-current">{text}</span>')

    inner = ''.join(parts)
    return (
        f'  <nav class="site-breadcrumb" aria-label="Br\u00f8dsmuler">\n'
        f'    <div class="site-breadcrumb-inner">\n'
        f'      {inner}\n'
        f'    </div>\n'
        f'  </nav>'
    )


def get_breadcrumb_for_file(rel_path, content):
    """Return breadcrumb HTML or None."""
    h1 = get_h1(content)

    # No breadcrumb
    if rel_path in ('index.html', '404.html'):
        return None

    # Root content pages
    mapping = {
        'innsikter.html': [('/', 'Forside'), (None, 'Innsikter')],
        'prisportal-matvarer.html': [('/', 'Forside'), (None, 'Prisportal for matvarer')],
        'presse.html': [('/', 'Forside'), (None, 'Presse')],
        'personvern.html': [('/', 'Forside'), (None, 'Personvern')],
        'bruksvilkar.html': [('/', 'Forside'), (None, 'Bruksvilk\u00e5r')],
    }
    if rel_path in mapping:
        return make_breadcrumb(mapping[rel_path])

    # Comparison pages
    comp = {
        'kiwi-vs-rema.html': h1 or 'KIWI vs REMA 1000',
        'coop-vs-kiwi.html': h1 or 'Coop Extra vs KIWI',
        'rema-vs-coop.html': h1 or 'REMA 1000 vs Coop Extra',
    }
    if rel_path in comp:
        return make_breadcrumb([
            ('/', 'Forside'),
            ('/kiwi-vs-rema.html', 'Sammenligning'),
            (None, comp[rel_path]),
        ])

    # Product pages
    if rel_path == 'produkt/index.html':
        return make_breadcrumb([('/', 'Forside'), (None, 'Produkter')])
    if rel_path.startswith('produkt/'):
        return make_breadcrumb([
            ('/', 'Forside'),
            ('/produkt/', 'Produkter'),
            (None, h1 or 'Produkt'),
        ])

    # Tilbud pages
    if rel_path == 'tilbud/index.html':
        return make_breadcrumb([('/', 'Forside'), (None, 'Tilbud')])
    if rel_path.startswith('tilbud/'):
        return make_breadcrumb([
            ('/', 'Forside'),
            ('/tilbud/', 'Tilbud'),
            (None, h1 or 'Tilbud'),
        ])

    return None


def remove_old_breadcrumbs(content):
    """Remove existing breadcrumb sections (div-wrapped and standalone)."""
    # Pattern: <div...><div...><nav aria-label="Brødsmuler">...</nav></div></div>
    content = re.sub(
        r'\s*(?:<!-- Breadcrumb -->)?\s*'
        r'<div[^>]*>\s*<div[^>]*>\s*'
        r'<nav[^>]*aria-label\s*=\s*"Br\u00f8dsmuler"[^>]*>.*?</nav>'
        r'\s*</div>\s*</div>',
        '',
        content,
        flags=re.DOTALL,
    )
    # Standalone breadcrumb comment
    content = re.sub(r'\s*<!-- Breadcrumb -->\s*', '\n', content)
    return content


def add_breadcrumb_after_nav(content, bc_html):
    """Insert breadcrumb right after the site-nav </nav>."""
    marker = 'class="site-nav"'
    pos = content.find(marker)
    if pos == -1:
        return content

    # Find the closing </nav> for the site-nav
    nav_close = content.find('</nav>', pos)
    if nav_close == -1:
        return content

    insert_at = nav_close + len('</nav>')
    return content[:insert_at] + '\n\n' + bc_html + '\n' + content[insert_at:]


def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    if len(content) < 500:
        return 'skip'

    rel = os.path.relpath(filepath, REPO).replace('\\', '/')
    bc = get_breadcrumb_for_file(rel, content)

    content = remove_old_breadcrumbs(content)

    if bc:
        content = add_breadcrumb_after_nav(content, bc)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return 'updated'
    return 'unchanged'


def main():
    files = sorted(glob.glob(os.path.join(REPO, '*.html')))
    files += sorted(glob.glob(os.path.join(REPO, 'produkt', '*.html')))
    files += sorted(glob.glob(os.path.join(REPO, 'tilbud', '*.html')))

    counts = {'updated': 0, 'unchanged': 0, 'skip': 0}
    for f in files:
        name = os.path.relpath(f, REPO)
        result = process_file(f)
        counts[result] = counts.get(result, 0) + 1
        if result == 'updated':
            print(f'  Updated: {name}')

    print(f'\nDone: {counts["updated"]} updated, {counts["unchanged"]} unchanged, '
          f'{counts["skip"]} skipped')


if __name__ == '__main__':
    main()
