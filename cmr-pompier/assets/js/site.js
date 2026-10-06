// Menu mobile + année du pied de page. Aucun traceur, aucun appel externe.
(function () {
  var EN = document.documentElement.lang === 'en';
  // Choix de langue mémorisé pour l'application (connexion, espace)
  document.querySelectorAll('[data-set-lang]').forEach(function (a) {
    a.addEventListener('click', function () { try { localStorage.setItem('vbs-lang', a.getAttribute('data-set-lang')); } catch (e) {} });
  });
  var header = document.querySelector('.site-header');
  var btn = document.querySelector('.menu-btn');
  if (header && btn) {
    btn.addEventListener('click', function () {
      var open = header.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? (EN ? 'Close menu' : 'Fermer le menu') : (EN ? 'Open menu' : 'Ouvrir le menu'));
    });
    header.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        header.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
