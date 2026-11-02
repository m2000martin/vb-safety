/* VB Safety · la mise en avant passe d'une carte d'offre à la suivante toutes les six secondes,
   et suit la souris dès qu'un visiteur survole une carte. Seules la lumière et la bordure
   bougent : aucun contenu n'est masqué ni révélé. */
(function () {
  'use strict';

  var PAS = 6000;

  function tour(grille) {
    var cartes = Array.prototype.slice.call(grille.querySelectorAll('.offre'));
    if (cartes.length < 2) return;

    grille.style.setProperty('--tour', (PAS / 1000) + 's');

    // en dessous de 980 px les cartes passent dans le sélecteur mobile existant :
    // le tour s'efface et tous les points redeviennent visibles.
    var large = window.matchMedia('(min-width: 980px)');
    function appliquer() {
      if (large.matches) {
        grille.setAttribute('data-tour', '');
        battre();
      } else {
        arreter();
        grille.removeAttribute('data-tour');
      }
    }
    var redim;
    window.addEventListener('resize', function () {
      window.clearTimeout(redim);
      redim = window.setTimeout(appliquer, 200);
    });
    if (large.addEventListener) large.addEventListener('change', appliquer);

    var lent = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var i = Math.max(0, cartes.findIndex(function (c) { return c.classList.contains('vedette'); }));
    var minuteur = null, visible = false, gele = false;

    function montrer(n) {
      i = (n + cartes.length) % cartes.length;
      cartes.forEach(function (c, k) { c.classList.toggle('vedette', k === i); });
    }
    montrer(i);

    function battre() {
      arreter();
      if (lent || gele || !visible || !large.matches) return;
      minuteur = window.setInterval(function () { montrer(i + 1); }, PAS);
    }
    function arreter() {
      if (minuteur) { window.clearInterval(minuteur); minuteur = null; }
    }

    // le survol prend la main : la carte pointée devient la carte active
    function saisir(e) {
      var carte = e.target.closest ? e.target.closest('.offre') : null;
      if (!carte) return;
      var n = cartes.indexOf(carte);
      if (n < 0) return;
      gele = true;
      arreter();
      if (n !== i) montrer(n);
    }
    grille.addEventListener('mouseover', saisir);
    grille.addEventListener('focusin', saisir);

    function rendre() {
      gele = false;
      battre();
    }
    grille.addEventListener('mouseleave', rendre);
    grille.addEventListener('focusout', function (e) {
      if (!grille.contains(e.relatedTarget)) rendre();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) arreter(); else battre();
    });

    appliquer();

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
