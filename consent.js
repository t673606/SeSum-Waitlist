(function () {
  var CONSENT_KEY = 'sesum_cookie_consent';
  var consent = localStorage.getItem(CONSENT_KEY);
  var PH_KEY = 'phc_pLofO9zUaQZTqaXbr95KiLNAvZmj8ol0VkZH8bksJUo';
  var PH_HOST = 'https://eu.i.posthog.com';

  // --- PostHog loader snippet (shared) ---
  function loadPostHogLib(config) {
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(/\/$/,"")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u._i.push([i,s,a]),o=0;o<n.length;o++)g(u,n[o])},n="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),e.init(PH_KEY, config))}(document,window.posthog||[]);
  }

  // --- Always load: cookieless anonymous analytics (legitimate interest) ---
  // No cookies, no localStorage, no IP, no autocapture, no session replay.
  // Legal basis: GDPR Art. 6(1)(f) legitimate interest for aggregated traffic stats.
  function loadAnonymousAnalytics() {
    loadPostHogLib({
      api_host: PH_HOST,
      persistence: 'memory',
      ip: false,
      property_denylist: ['$ip'],
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: true,
      person_profiles: 'identified_only'
    });
    attachEventTracking();
  }

  // --- Full analytics with consent (cookies, person profiles, session tracking) ---
  function upgradeToFullAnalytics() {
    loadPostHogLib({
      api_host: PH_HOST,
      person_profiles: 'always',
      capture_pageview: true,
      capture_pageleave: true
    });
    attachEventTracking();
  }

  // --- Register UTMs, scroll depth, CTA clicks ---
  function attachEventTracking() {
    // UTM params
    var params = new URLSearchParams(window.location.search);
    var utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    var hasUtm = false;
    var utm = {};
    utmKeys.forEach(function(k) {
      var v = params.get(k);
      if (v) { utm[k] = v; hasUtm = true; }
    });
    if (hasUtm && window.posthog && window.posthog.register) {
      window.posthog.register(utm);
    }

    // Scroll depth
    var depths = [25, 50, 75, 100];
    var fired = {};
    var ticking = false;
    window.addEventListener('scroll', function() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function() {
        ticking = false;
        var scrollPct = Math.round(
          (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        depths.forEach(function(d) {
          if (scrollPct >= d && !fired[d]) {
            fired[d] = true;
            if (window.posthog) {
              posthog.capture('scroll_depth', { depth: d, page: location.pathname });
            }
          }
        });
      });
    });

    // CTA click tracking
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a');
      if (!link) return;
      var isCta = link.classList.contains('site-nav-cta') ||
                  link.classList.contains('site-nav-cta-mobile') ||
                  link.classList.contains('cta-btn');
      if (isCta && window.posthog) {
        posthog.capture('cta_click', { cta_text: link.textContent.trim(), source_page: location.pathname });
      }
    });
  }

  function showBanner() {
    var banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.setAttribute('style',
      'position:fixed;bottom:0;left:0;right:0;z-index:9999;' +
      'background:#1b4332;color:white;' +
      'padding:0.875rem 1rem;' +
      'display:flex;align-items:center;justify-content:center;gap:0.75rem;flex-wrap:wrap;' +
      'font-family:"DM Sans",sans-serif;font-size:0.8rem;'
    );
    banner.innerHTML =
      '<span>Vi bruker cookies for bedre analyse. <a href="/personvern.html" style="color:#a7f3d0;text-decoration:underline">Les mer</a></span>' +
      '<div style="display:flex;gap:0.5rem">' +
        '<button id="cookie-ok" style="background:white;color:#1b4332;font-weight:700;font-size:0.75rem;padding:0.4rem 1rem;border-radius:0.5rem;border:none;cursor:pointer">OK</button>' +
        '<button id="cookie-no" style="background:transparent;color:rgba(255,255,255,0.7);font-weight:600;font-size:0.75rem;padding:0.4rem 0.75rem;border-radius:0.5rem;border:1px solid rgba(255,255,255,0.3);cursor:pointer">Nei takk</button>' +
      '</div>';
    document.body.appendChild(banner);

    document.getElementById('cookie-ok').addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'yes');
      banner.remove();
      // Reinitialize with full tracking
      if (window.posthog && window.posthog.set_config) {
        window.posthog.set_config({ persistence: 'localStorage+cookie', person_profiles: 'always', ip: true });
      }
    });
    document.getElementById('cookie-no').addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'no');
      banner.remove();
      // Stay in anonymous mode -- already loaded
    });
  }

  // --- Init ---
  if (consent === 'yes') {
    // Full tracking with cookies
    upgradeToFullAnalytics();
  } else if (consent === 'no') {
    // User said no -- anonymous only
    loadAnonymousAnalytics();
  } else {
    // No choice yet -- start anonymous, show banner
    loadAnonymousAnalytics();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();
