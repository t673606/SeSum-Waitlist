(function () {
  // Hamburger menu toggle
  var toggle = document.querySelector('.site-nav-toggle');
  var mobile = document.querySelector('.site-nav-mobile');
  if (toggle && mobile) {
    toggle.addEventListener('click', function () {
      var opening = !mobile.classList.contains('is-open');
      mobile.classList.toggle('is-open');
      toggle.querySelector('.site-nav-icon-open').style.display = opening ? 'none' : '';
      toggle.querySelector('.site-nav-icon-close').style.display = opening ? '' : 'none';
      toggle.setAttribute('aria-expanded', String(opening));
    });
  }

  // Highlight active nav section
  var path = location.pathname;
  var active = null;
  if (path.startsWith('/produkt')) active = 'Produkter';
  else if (path.startsWith('/tilbud')) active = 'Tilbud';
  else if (path.indexOf('-vs-') !== -1) active = 'Sammenlign';
  else if (path.startsWith('/innsikter')) active = 'Innsikter';

  if (active) {
    document.querySelectorAll('.site-nav-links a, .site-nav-mobile a').forEach(function (a) {
      if (a.textContent.trim() === active) a.setAttribute('aria-current', 'page');
    });
  }
})();
