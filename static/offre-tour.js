/* VB Safety · la mise en avant passe d'une carte d'offre à la suivante toutes les six secondes,
   et suit la souris dès qu'un visiteur survole une carte.
   La carte active montre tous ses points ; les autres n'en montrent que deux, avec un repère
   « +N ». La hauteur est réservée au chargement pour qu'aucun bloc ne saute pendant le tour. */
(function () {
  'use strict';

  var PAS = 6000;
  var VISIBLES = 2;

  function tour(grille) {
    var cartes = Array.prototype.slice.call(grille.querySelectorAll('.offre'));
    if (cartes.length < 2) return;

    grille.style.setProperty('--tour', (PAS / 1000) + 's');

    // points au-delà des deux premiers : masqués, et comptés dans un repère
    cartes.forEach(function (carte) {
      var pts = Array.prototype.slice.call(carte.querySelectorAll('ul > li'));
      var sup = pts.slice(VISIBLES);
      sup.forEach(function (li) { li.classList.add('sup'); });
      if (!sup.length) return;
      var plus = document.createElement('span');
      plus.className = 'offre-plus';
      plus.setAttribute('aria-hidden', 'true');
      plus.textContent = '+' + sup.length;
      carte.querySelector('ul').insertAdjacentElement('afterend', plus);
    });

    // hauteur réservée : on mesure une fois toutes cartes dépliées
    function reserver() {
      cartes.forEach(function (c) { c.style.minHeight = ''; c.classList.add('deplie'); });
      var max = cartes.reduce(function (m, c) { return Math.max(m, c.offsetHeight); }, 0);
      cartes.forEach(function (c) { c.classList.remove('deplie'); c.style.minHeight = max + 'px'; });
    }
    // en dessous de 980 px les cartes passent dans le sélecteur mobile existant :
    // le tour s'efface et tous les points redeviennent visibles.
    var large = window.matchMedia('(min-width: 980px)');
    function appliquer() {
      if (large.matches) {
        grille.setAttribute('data-tour', '');
        reserver();
        battre();
      } else {
        arreter();
        grille.removeAttribute('data-tour');
        cartes.forEach(function (c) { c.style.minHeight = ''; });
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
