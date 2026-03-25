#!/usr/bin/env python3
"""Update mobile nav descriptions."""
import os
import glob

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

REPLACEMENTS = [
    (
        '<span class="site-nav-desc">Om Norges prisportal for matvarer</span>',
        '<span class="site-nav-desc">Hvorfor trenger vi en prisportal?</span>',
    ),
    (
        '<span class="site-nav-desc">S\u00f8k opp priser p\u00e5 dagligvarer</span>',
        '<span class="site-nav-desc">Se priser p\u00e5 et utvalg dagligvarer</span>',
    ),
]


def main():
    files = sorted(glob.glob(os.path.join(REPO, '*.html')))
    files += sorted(glob.glob(os.path.join(REPO, 'produkt', '*.html')))
    files += sorted(glob.glob(os.path.join(REPO, 'tilbud', '*.html')))

    updated = 0
    for f in files:
        if os.path.getsize(f) < 500:
            continue
        with open(f, 'r', encoding='utf-8') as fh:
            content = fh.read()
        original = content
        for old, new in REPLACEMENTS:
            content = content.replace(old, new)
        if content != original:
            with open(f, 'w', encoding='utf-8') as fh:
                fh.write(content)
            updated += 1

    print(f'Done: {updated} files updated')


if __name__ == '__main__':
    main()
