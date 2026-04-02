/**
 * SeSum Shared Navigation Component
 * Single source of truth for nav across all pages.
 *
 * Usage: Place <div id="site-nav"></div> where the nav should render,
 * then <script src="/nav-component.js" defer></script>
 */
(function () {
  var NAV_HTML =
    '<nav class="site-nav" aria-label="Hovednavigasjon">' +
      '<div class="site-nav-inner">' +
        '<a href="/" class="site-nav-logo">' +
          '<img src="/sesum-logo.png" alt="SeSum logo" width="36" height="36" />' +
          '<span>SeSum</span>' +
        '</a>' +
        '<div class="site-nav-links">' +
          '<a href="/produkt/">Produkter</a>' +
          '<a href="/tilbud/">Tilbud</a>' +
          '<a href="/kiwi-vs-rema.html">Sammenlign</a>' +
          '<a href="/innsikter.html">Innsikter</a>' +
          '<a href="/prisportal-matvarer.html">Prisportal</a>' +
          '<a href="/" class="site-nav-cta">Prøv gratis</a>' +
        '</div>' +
        '<a href="/" class="site-nav-cta-mobile">Prøv gratis</a>' +
        '<button class="site-nav-toggle" aria-label="Meny" aria-expanded="false">' +
          '<svg class="site-nav-icon-open" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
          '<svg class="site-nav-icon-close" style="display:none" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="site-nav-mobile">' +
        '<a href="/produkt/"><span class="site-nav-label">Produkter</span><span class="site-nav-desc">Se priser på et utvalg dagligvarer</span></a>' +
        '<a href="/tilbud/"><span class="site-nav-label">Tilbud</span><span class="site-nav-desc">Ukens beste tilbud fra alle kjeder</span></a>' +
        '<a href="/kiwi-vs-rema.html"><span class="site-nav-label">Sammenlign</span><span class="site-nav-desc">Hvilken kjede er billigst?</span></a>' +
        '<a href="/innsikter.html"><span class="site-nav-label">Innsikter</span><span class="site-nav-desc">Prisutvikling og sparedata</span></a>' +
        '<a href="/prisportal-matvarer.html"><span class="site-nav-label">Prisportal</span><span class="site-nav-desc">Hvorfor trenger vi en prisportal?</span></a>' +
        '<a href="/"><span class="site-nav-label" style="color:#2d6a4f">Prøv SeSum gratis</span><span class="site-nav-desc">Gratis for iPhone</span></a>' +
      '</div>' +
    '</nav>';

  function init() {
    // Inject nav into placeholder
    var placeholder = document.getElementById('site-nav');
    if (placeholder) {
      placeholder.outerHTML = NAV_HTML;
    }

    // --- Hamburger toggle ---
    var toggle = document.querySelector('.site-nav-toggle');
    var mobile = document.querySelector('.site-nav-mobile');
    if (toggle && mobile) {
      var iconOpen = toggle.querySelector('.site-nav-icon-open');
      var iconClose = toggle.querySelector('.site-nav-icon-close');
      toggle.addEventListener('click', function () {
        var opening = !mobile.classList.contains('is-open');
        mobile.classList.toggle('is-open');
        iconOpen.style.display = opening ? 'none' : 'inline';
        iconClose.style.display = opening ? 'inline' : 'none';
        toggle.setAttribute('aria-expanded', String(opening));
      });
    }

    // --- Highlight active nav section ---
    var path = location.pathname;
    var active = null;
    if (path.startsWith('/produkt')) active = 'Produkter';
    else if (path.startsWith('/tilbud')) active = 'Tilbud';
    else if (path.indexOf('-vs-') !== -1) active = 'Sammenlign';
    else if (path.startsWith('/innsikter')) active = 'Innsikter';
    else if (path.startsWith('/prisportal')) active = 'Prisportal';

    if (active) {
      document.querySelectorAll('.site-nav-links a, .site-nav-mobile a').forEach(function (a) {
        if (a.textContent.trim() === active) a.setAttribute('aria-current', 'page');
      });
    }

    // --- Hide desktop nav CTA on homepage (already has its own form) ---
    // Mobile CTA button stays visible on all pages including homepage
    if (path === '/' || path === '/index.html') {
      var cta = document.querySelector('.site-nav-cta');
      if (cta) cta.style.display = 'none';
      var ctaMobile = document.querySelector('.site-nav-cta-mobile');
      if (ctaMobile) ctaMobile.style.display = 'none';
      var navToggle = document.querySelector('.site-nav-toggle');
      if (navToggle) navToggle.style.marginLeft = 'auto';
      var mobileCta = document.querySelector('.site-nav-mobile a:last-child');
      if (mobileCta && mobileCta.textContent.indexOf('Prøv SeSum') !== -1) {
        mobileCta.style.display = 'none';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
