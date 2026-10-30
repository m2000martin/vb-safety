// VB Safety · pages intérieures : animations de l'accueil (en-tête qui monte, titres et blocs qui apparaissent au défilement).
(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  // 1. En-tête de page
  var h = document.querySelector('main .hero .wrap > div:first-child, main .capt-txt, main .hero .container > div:first-child, main .ih-grid > div:first-child, main .epi-hero-grid > div:first-child, main .g-hero-grid > div:first-child');
  if (h) h.classList.add('an-hero');
  var cote = document.querySelector('main .bref, main .preview-wrap, main .capt-vis, main .dash, main .laptop, main .g-figures');
  if (cote) cote.classList.add('an-cote');
  // 2. Titres de section
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('an-vu'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  Array.prototype.forEach.call(document.querySelectorAll('main .sec-tete, main .section-head, main .ob-head, main .res-groupe > .kicker'), function (t) {
    if (t.closest('.epingle, .serp-epingle, .fr-pin')) return;
    t.classList.add('an-tete'); io.observe(t);
  });
  // 3. Blocs, par groupe, avec un léger décalage
  var GROUPES = 'main .offres, main .res-grille, main .faq, main .autres, main .pillars, main .oblig, main .roles, main .ob-grid, main .feat-grid, main .pillars4, main .g-cards, main .lab-list';
  var BLOCS = '.offre, .res, .faq details, .autres > *, .card, .ob, .feat, .pillar, .lab-item';
  Array.prototype.forEach.call(document.querySelectorAll(GROUPES), function (g) {
    if (g.closest('.locked-ghost, .epingle, .a-bascule')) return;
    var items = Array.prototype.filter.call(g.children, function (c) { return c.matches(BLOCS) && !c.classList.contains('app-o') && !c.closest('.apparition'); });
    items.forEach(function (c, i) {
      c.classList.add('an-bloc'); if (!c.matches('.faq details')) c.classList.add('an-trait');
      c.style.setProperty('--an-d', (i % 4) * 0.09 + 's'); io.observe(c);
    });
  });
})();
