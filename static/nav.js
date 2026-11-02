// VB Safety · menu principal : ouverture du sous-menu « Solutions de suivi CMR » au clic et au clavier (ordinateur).
(function () {
  'use strict';
  var groupes = document.querySelectorAll('.nav-groupe');
  if (!groupes.length) return;
  function fermer(sauf) {
    Array.prototype.forEach.call(groupes, function (g) {
      if (g === sauf) return;
      g.classList.remove('ouvert');
      var b = g.querySelector('.nav-sous'); if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  Array.prototype.forEach.call(groupes, function (g) {
    var b = g.querySelector('.nav-sous'); if (!b) return;
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var o = !g.classList.contains('ouvert');
      fermer(g); g.classList.toggle('ouvert', o); b.setAttribute('aria-expanded', o ? 'true' : 'false');
    });
    g.addEventListener('mouseenter', function () { b.setAttribute('aria-expanded', 'true'); });
    g.addEventListener('mouseleave', function () { if (!g.classList.contains('ouvert')) b.setAttribute('aria-expanded', 'false'); });
  });
  var surTel = function () { return window.matchMedia('(max-width: 900px)').matches; };
  // Sur ordinateur, un clic en dehors referme le sous-menu. Sur téléphone le menu est un
  // accordéon dans un panneau : on garde le métier ouvert.
  document.addEventListener('click', function (e) {
    if (surTel()) return;
    if (!e.target.closest('.nav-groupe')) fermer(null);
  });
  // Téléphone : le menu est un accordéon, un seul métier ouvert à la fois.
  // Celui de la page en cours s'ouvre d'emblée ; les autres se déplient au toucher.
  (function () {
    var tel = window.matchMedia('(max-width: 900px)');
    function etat() {
      if (!tel.matches) return;
      var a = document.querySelector('.nav-metier.actif');
      if (!a || a.classList.contains('ouvert')) return;
      fermer(a);
      a.classList.add('ouvert');
      var b = a.querySelector('.nav-sous'); if (b) b.setAttribute('aria-expanded', 'true');
    }
    etat();
    if (tel.addEventListener) tel.addEventListener('change', etat);
    var btn = document.querySelector('#menu-btn, .menu-btn, .mm-btn');
    if (btn) btn.addEventListener('click', function () { window.setTimeout(etat, 0); });
  })();
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var g = document.activeElement && document.activeElement.closest && document.activeElement.closest('.nav-groupe');
    fermer(null);
    if (g) { var b = g.querySelector('.nav-sous'); if (b) b.focus(); }
  });
})();

// Menus métier : « Capteur de contamination » existe dans chaque métier (même page) ; on n'allume que celui du métier d'où l'on vient.
(function () {
  'use strict';
  var KEY = 'vb-metier', CLES = ['sapeurs-pompiers', 'industrie', 'btp'];
  var groupes = document.querySelectorAll('.nav-metier');
  if (!groupes.length) return;
  // On retient le métier du lien cliqué
  Array.prototype.forEach.call(groupes, function (g, i) {
    Array.prototype.forEach.call(g.querySelectorAll('.nav-metiers a'), function (a) {
      a.addEventListener('click', function () { try { sessionStorage.setItem(KEY, CLES[i]); } catch (e) {} });
    });
    if (g.classList.contains('actif')) { try { sessionStorage.setItem(KEY, CLES[i]); } catch (e) {} }
  });
  if (!/\/innovation\/$/.test(location.pathname)) return;
  // Le capteur est la même page pour les trois métiers : on n'allume que celui d'où l'on vient,
  // et on suit les changements d'ancre (clic sur un autre métier, sans rechargement de page).
  function surligner() {
    var cle = (location.hash || '').slice(1);
    if (CLES.indexOf(cle) < 0) { try { cle = sessionStorage.getItem(KEY); } catch (e) { cle = null; } }
    var i = CLES.indexOf(cle);
    Array.prototype.forEach.call(groupes, function (g, k) {
      g.classList.toggle('actif', k === i);
      var a = g.querySelector('a[href*="innovation/#"]');
      if (a) { if (k === i) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
    });
  }
  window.addEventListener('hashchange', surligner);
  surligner();
})();
