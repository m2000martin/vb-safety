/* VB Safety · la mise en avant passe d'une carte d'offre à la suivante toutes les six secondes.
   Le tour ne démarre que lorsque la section est visible, s'arrête au survol, au focus clavier
   et quand l'onglet passe en arrière-plan. Aucune information n'est masquée : seules
   la bordure et l'ombre se déplacent. */
(function () {
  'use strict';

  var PAS = 6000;

  function tour(grille) {
    var cartes = Array.prototype.slice.call(grille.querySelectorAll('.offre'));
    if (cartes.length < 2) return;

    grille.setAttribute('data-tour', '');
    grille.style.setProperty('--tour', (PAS / 1000) + 's');

    var lent = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var i = Math.max(0, cartes.findIndex(function (c) { return c.classList.contains('vedette'); }));
    var minuteur = null, visible = false, gele = false;

    function montrer(n) {
      i = (n + cartes.length) % cartes.length;
      cartes.forEach(function (c, k) {
        c.classList.toggle('vedette', k === i);
        // on relance l'animation de jauge sur la carte qui prend la main
        if (k === i) { c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; }
      });
    }

    function battre() {
      arreter();
      if (lent || gele || !visible) return;
      minuteur = window.setInterval(function () { montrer(i + 1); }, PAS);
    }
    function arreter() {
      if (minuteur) { window.clearInterval(minuteur); minuteur = null; }
    }

    ['mouseenter', 'focusin'].forEach(function (e) {
      grille.addEventListener(e, function () { gele = true; arreter(); });
    });
    ['mouseleave', 'focusout'].forEach(function (e) {
      grille.addEventListener(e, function () { gele = false; battre(); });
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) arreter(); else battre();
    });

    if (!('IntersectionObserver' in window)) { visible = true; battre(); return; }
    new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) { visible = e.isIntersecting; });
      battre();
    }, { threshold: 0.25 }).observe(grille);
  }

  function demarrer() {
    Array.prototype.forEach.call(document.querySelectorAll('.offres'), tour);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }
})();
