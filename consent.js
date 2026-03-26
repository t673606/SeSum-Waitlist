(function () {
  var CONSENT_KEY = 'sesum_cookie_consent';
  var consent = localStorage.getItem(CONSENT_KEY);

  function loadPostHog() {
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(/\/$/,"")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u._i.push([i,s,a]),o=0;o<n.length;o++)g(u,n[o])},n="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),e.init("phc_pLofO9zUaQZTqaXbr95KiLNAvZmj8ol0VkZH8bksJUo",{api_host:"https://eu.i.posthog.com",person_profiles:"always",capture_pageview:true,capture_pageleave:true}))}(document,window.posthog||[]);
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
      '<span>Vi bruker cookies for analyse av nettsiden. <a href="/personvern.html" style="color:#a7f3d0;text-decoration:underline">Les mer</a></span>' +
      '<div style="display:flex;gap:0.5rem">' +
        '<button id="cookie-ok" style="background:white;color:#1b4332;font-weight:700;font-size:0.75rem;padding:0.4rem 1rem;border-radius:0.5rem;border:none;cursor:pointer">OK</button>' +
        '<button id="cookie-no" style="background:transparent;color:rgba(255,255,255,0.7);font-weight:600;font-size:0.75rem;padding:0.4rem 0.75rem;border-radius:0.5rem;border:1px solid rgba(255,255,255,0.3);cursor:pointer">Nei takk</button>' +
      '</div>';
    document.body.appendChild(banner);

    document.getElementById('cookie-ok').addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'yes');
      banner.remove();
      loadPostHog();
    });
    document.getElementById('cookie-no').addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'no');
      banner.remove();
    });
  }

  if (consent === 'yes') {
    loadPostHog();
  } else if (consent !== 'no') {
    // No choice made yet
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();
