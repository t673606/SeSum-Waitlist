#!/usr/bin/env python3
"""Fix close icon initial visibility and add Prisportal to nav."""
import os
import glob

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. Hide close icon on initial load (add style="display:none")
    content = content.replace(
        '<svg class="site-nav-icon-close" xmlns=',
        '<svg class="site-nav-icon-close" style="display:none" xmlns='
    )

    # 2. Add Prisportal to desktop nav links
    content = content.replace(
        '        <a href="/innsikter.html">Innsikter</a>\n      </div>\n      <button class="site-nav-toggle"',
        '        <a href="/innsikter.html">Innsikter</a>\n        <a href="/prisportal-matvarer.html">Prisportal</a>\n      </div>\n      <button class="site-nav-toggle"'
    )

    # 3. Add Prisportal to mobile nav
    content = content.replace(
        '      <a href="/innsikter.html">Innsikter</a>\n    </div>\n  </nav>',
        '      <a href="/innsikter.html">Innsikter</a>\n      <a href="/prisportal-matvarer.html">Prisportal</a>\n    </div>\n  </nav>'
    )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False


def main():
    files = sorted(glob.glob(os.path.join(REPO, '*.html')))
    files += sorted(glob.glob(os.path.join(REPO, 'produkt', '*.html')))
    files += sorted(glob.glob(os.path.join(REPO, 'tilbud', '*.html')))

    updated = 0
    for f in files:
        if os.path.getsize(f) < 500:
            continue
        if process_file(f):
            updated += 1
            print(f'  Updated: {os.path.relpath(f, REPO)}')

    print(f'\nDone: {updated} files updated')


if __name__ == '__main__':
    main()
