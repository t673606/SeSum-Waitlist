/**
 * SeSum Signup Widget
 * Injects inline signup form + sticky mobile CTA on content pages.
 * Usage: <script src="/signup-widget.js" defer></script>
 */
(function () {
  var SUPABASE_URL = 'https://glpowwptzbokwtkbsnko.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdscG93d3B0emJva3d0a2JzbmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMDY1MDUsImV4cCI6MjA3ODc4MjUwNX0.NCuL94b5hbGybvYHhGhk3ePpYfNK3KwaONRmDAr0MvM';
  var client = null;

  function getClient() {
    if (!client && typeof supabase !== 'undefined') {
      client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return client;
  }

  // Load Supabase SDK if not already present
  if (!document.querySelector('script[src*="supabase"]')) {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.defer = true;
    document.head.appendChild(s);
  }

  async function handleSubmit(form, formId) {
    var emailInput = form.querySelector('input[type="email"]');
    var btn = form.querySelector('button');
    var errorEl = form.querySelector('.sw-error');
    var email = emailInput.value.trim();

    btn.disabled = true;
    btn.textContent = 'Sender...';
    if (errorEl) errorEl.style.display = 'none';

    var c = getClient();
    if (!c) {
      btn.disabled = false;
      btn.textContent = 'Prøv SeSum gratis';
      return;
    }

    try {
      var result = await c.from('waitlist').insert([{ email: email }]);
      if (result.error && result.error.code !== '23505') throw result.error;
      showSuccess(form, formId);
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = 'Noe gikk galt. Prøv igjen.';
        errorEl.style.display = 'block';
      }
      btn.disabled = false;
      btn.textContent = 'Prøv SeSum gratis';
    }
  }

  function showSuccess(form, formId) {
    var wrapper = form.closest('.sw-wrapper');
    if (wrapper) {
      var successEl = wrapper.querySelector('.sw-success');
      form.style.display = 'none';
      if (successEl) successEl.style.display = 'block';
    }
    if (window.posthog) {
      posthog.capture('waitlist_signup', { source: formId });
    }
    // Also hide sticky bar if inline form was used
    var sticky = document.getElementById('sw-sticky');
    if (sticky) sticky.style.display = 'none';
  }

  // --- Hide existing CTA buttons that link to homepage ---
  function hideExistingCTAs() {
    // Remove "Prøv SeSum gratis" link buttons that just point to homepage
    document.querySelectorAll('a[href="/"]').forEach(function (a) {
      if (a.textContent.trim() === 'Prøv SeSum gratis') {
        var parent = a.closest('.text-center, div');
        if (parent && parent.querySelector('p')) {
          parent.style.display = 'none';
        } else {
          a.style.display = 'none';
        }
      }
    });
  }

  // --- Inline signup form ---
  function injectInlineForm() {
    hideExistingCTAs();

    var target = document.querySelector('[data-signup-inline]');
    if (!target) {
      // Auto-inject before footer if no explicit target
      var footer = document.querySelector('.site-footer');
      if (!footer) return;
      target = document.createElement('div');
      target.setAttribute('data-signup-inline', '');
      footer.parentNode.insertBefore(target, footer);
    }

    var page = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || 'home';
    var pageName = page.split('/').pop() || 'home';

    // Contextual headline per page type
    var headline = 'Sammenlign priser på hele handlelisten din';
    var subtext = 'Få tilgang til appen og se priser fra 14 butikkjeder, basert på ekte kvitteringsdata.';

    if (pageName.indexOf('-vs-') !== -1) {
      headline = 'Vil du sammenligne hele handlelisten?';
      subtext = 'Med SeSum-appen ser du totalprisen for handlelisten din hos alle kjeder.';
    } else if (pageName === 'innsikter') {
      headline = 'Følg din egen prisutvikling';
      subtext = 'Koble til Trumf eller Rema og se hva du faktisk bruker på mat.';
    } else if (pageName === 'prisportal-matvarer') {
      headline = 'Prøv Norges prisportal for matvarer';
      subtext = 'Søk opp varer, sammenlign priser og følg prisutvikling hos 14 butikkjeder.';
    } else if (page.indexOf('/produkt') !== -1) {
      headline = 'Se priser på 9 400+ produkter i appen';
      subtext = 'Søk opp varer, lag handlelister og finn billigste butikk.';
    } else if (page.indexOf('/tilbud') !== -1) {
      headline = 'Få varsel når favorittvarene dine er på tilbud';
      subtext = 'Med SeSum-appen får du push-varsel når prisene faller.';
    }

    target.innerHTML =
      '<div class="sw-wrapper" style="max-width:28rem;margin:2rem auto 2.5rem;padding:0 1.25rem">' +
        '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:1rem;padding:1.5rem;text-align:center">' +
          '<p style="font-size:1.0625rem;font-weight:700;color:#0f172a;margin:0 0 0.375rem;line-height:1.3">' + headline + '</p>' +
          '<p style="font-size:0.8125rem;color:#64748b;margin:0 0 1rem;line-height:1.5">' + subtext + '</p>' +
          '<form class="sw-form" onsubmit="return false" style="display:flex;gap:0.5rem;max-width:22rem;margin:0 auto">' +
            '<input type="email" required placeholder="E-post" autocomplete="email" ' +
              'style="flex:1;min-width:0;padding:0.75rem 1rem;border-radius:0.75rem;border:1px solid #e2e8f0;font-size:0.875rem;font-family:inherit;outline:none;transition:border-color 0.15s" ' +
              'onfocus="this.style.borderColor=\'#2d6a4f\'" onblur="this.style.borderColor=\'#e2e8f0\'" />' +
            '<button type="submit" ' +
              'style="background:#2d6a4f;color:#fff;padding:0.75rem 1.25rem;border-radius:0.75rem;font-size:0.8125rem;font-weight:600;border:none;cursor:pointer;white-space:nowrap;font-family:inherit;transition:opacity 0.15s" ' +
              'onmouseover="this.style.opacity=\'0.9\'" onmouseout="this.style.opacity=\'1\'">Prøv SeSum gratis</button>' +
          '</form>' +
          '<p class="sw-error" style="display:none;color:#ef4444;font-size:0.75rem;margin:0.5rem 0 0;text-align:center"></p>' +
          '<p style="font-size:0.625rem;color:#94a3b8;margin:0.75rem 0 0">Du får nedlastingslenke på e-post med en gang. Gratis for iPhone.</p>' +
          '<div class="sw-success" style="display:none">' +
            '<div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-bottom:0.25rem">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
              '<span style="font-size:0.9375rem;font-weight:700;color:#0f172a">Sjekk e-posten din!</span>' +
            '</div>' +
            '<p style="font-size:0.8125rem;color:#64748b;margin:0">Vi har sendt deg en nedlastingslenke.</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    var form = target.querySelector('.sw-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      handleSubmit(form, 'inline_' + pageName);
    });
  }

  // --- Sticky mobile CTA bar ---
  function injectStickyBar() {
    // Don't show on homepage (already has form)
    if (location.pathname === '/' || location.pathname === '/index.html') return;

    var bar = document.createElement('div');
    bar.id = 'sw-sticky';
    bar.innerHTML =
      '<div class="sw-wrapper" style="display:flex;align-items:center;gap:0.5rem;max-width:28rem;margin:0 auto">' +
        '<form class="sw-form" onsubmit="return false" style="display:flex;gap:0.5rem;flex:1">' +
          '<input type="email" required placeholder="E-post" autocomplete="email" ' +
            'style="flex:1;min-width:0;padding:0.625rem 0.75rem;border-radius:0.625rem;border:1px solid #e2e8f0;font-size:0.8125rem;font-family:inherit;outline:none" />' +
          '<button type="submit" ' +
            'style="background:#2d6a4f;color:#fff;padding:0.625rem 1rem;border-radius:0.625rem;font-size:0.8125rem;font-weight:600;border:none;cursor:pointer;white-space:nowrap;font-family:inherit">Få tilgang</button>' +
        '</form>' +
        '<p class="sw-error" style="display:none;color:#ef4444;font-size:0.6875rem;margin:0;text-align:center"></p>' +
        '<div class="sw-success" style="display:none;text-align:center;font-size:0.8125rem;font-weight:600;color:#2d6a4f">Sjekk e-posten!</div>' +
      '</div>';

    // Styling
    bar.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;z-index:999;' +
      'background:#fff;border-top:1px solid #e2e8f0;' +
      'padding:0.625rem 1rem;' +
      'box-shadow:0 -2px 8px rgba(0,0,0,0.06);' +
      'transform:translateY(100%);transition:transform 0.3s ease;' +
      'display:none;';

    document.body.appendChild(bar);

    var form = bar.querySelector('.sw-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      handleSubmit(form, 'sticky');
    });

    // Show after 30% scroll, hide at top
    var shown = false;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var scrollPct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
        if (scrollPct > 0.3 && !shown) {
          shown = true;
          bar.style.display = 'block';
          // Trigger reflow then animate
          bar.offsetHeight;
          bar.style.transform = 'translateY(0)';
        } else if (scrollPct <= 0.1 && shown) {
          shown = false;
          bar.style.transform = 'translateY(100%)';
          setTimeout(function () { if (!shown) bar.style.display = 'none'; }, 300);
        }
      });
    });
  }

  // --- Init ---
  function init() {
    injectInlineForm();
    // Sticky bar only on mobile
    if (window.innerWidth <= 640) {
      injectStickyBar();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
