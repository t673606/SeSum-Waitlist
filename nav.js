(function () {
  // Hamburger menu toggle
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

  // Highlight active nav section
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
})();
