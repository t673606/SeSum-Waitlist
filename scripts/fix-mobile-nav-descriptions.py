#!/usr/bin/env python3
"""Add subtitles to mobile nav links."""
import os
import glob

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

OLD_MOBILE = '''    <div class="site-nav-mobile">
      <a href="/produkt/">Produkter</a>
      <a href="/tilbud/">Tilbud</a>
      <a href="/kiwi-vs-rema.html">Sammenlign</a>
      <a href="/innsikter.html">Innsikter</a>
      <a href="/prisportal-matvarer.html">Prisportal</a>
    </div>'''

NEW_MOBILE = '''    <div class="site-nav-mobile">
      <a href="/produkt/"><span class="site-nav-label">Produkter</span><span class="site-nav-desc">S\u00f8k opp priser p\u00e5 dagligvarer</span></a>
      <a href="/tilbud/"><span class="site-nav-label">Tilbud</span><span class="site-nav-desc">Ukens beste tilbud fra alle kjeder</span></a>
      <a href="/kiwi-vs-rema.html"><span class="site-nav-label">Sammenlign</span><span class="site-nav-desc">Hvilken kjede er billigst?</span></a>
      <a href="/innsikter.html"><span class="site-nav-label">Innsikter</span><span class="site-nav-desc">Prisutvikling og sparedata</span></a>
      <a href="/prisportal-matvarer.html"><span class="site-nav-label">Prisportal</span><span class="site-nav-desc">Om Norges prisportal for matvarer</span></a>
    </div>'''


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
        if OLD_MOBILE in content:
            content = content.replace(OLD_MOBILE, NEW_MOBILE)
            with open(f, 'w', encoding='utf-8') as fh:
                fh.write(content)
            updated += 1

    print(f'Done: {updated} files updated')


if __name__ == '__main__':
    main()
