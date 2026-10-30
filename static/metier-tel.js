// VB Safety · pages métier sur téléphone : « Les enjeux » en questions dépliables (comme la FAQ),
// « Avec ou sans » et « Ce que nous faisons » en bascule : un seul bloc à la fois, on change par les boutons ou en glissant.
(function () {
  'use strict';
  var EN = (document.documentElement.lang || '').indexOf('en') === 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Les enjeux : chaque titre devient un bouton qui déplie son texte
  Array.prototype.forEach.call(document.querySelectorAll('.enjeu'), function (a, i) {
    var h = a.querySelector('h3'), p = a.querySelector('p'); if (!h || !p) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'ej-btn'; b.setAttribute('aria-expanded', 'false');
    p.id = p.id || 'enjeu-' + i; b.setAttribute('aria-controls', p.id);
    while (h.firstChild) b.appendChild(h.firstChild); h.appendChild(b); a.classList.add('repli');
    b.addEventListener('click', function () { b.setAttribute('aria-expanded', a.classList.toggle('ouvert') ? 'true' : 'false'); });
  });

  // 2. Bascule générique : boutons au-dessus, un panneau visible, glissement du doigt pour passer au suivant
  function bascule(conteneur, panneaux, libelles, nom) {
    if (panneaux.length < 2) return;
    conteneur.classList.add('a-bascule');
    var seg = document.createElement('div'); seg.className = 'bascule'; seg.setAttribute('role', 'tablist'); seg.setAttribute('aria-label', nom);
    seg.style.setProperty('--n', panneaux.length);
    var actif = 0;
    var boutons = panneaux.map(function (pn, i) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = libelles[i];
      b.addEventListener('click', function () { aller(i); }); seg.appendChild(b); return b;
    });
    var curseur = document.createElement('span'); curseur.className = 'bascule-curseur'; curseur.setAttribute('aria-hidden', 'true'); seg.appendChild(curseur);
    conteneur.insertAdjacentElement('beforebegin', seg);
    function aller(i) {
      if (i < 0 || i >= panneaux.length) return;
      var dir = i > actif ? 'de-droite' : 'de-gauche';
      panneaux.forEach(function (pn, k) { pn.classList.toggle('actif', k === i); pn.classList.remove('de-droite', 'de-gauche'); });
      if (!reduce && i !== actif) { void panneaux[i].offsetWidth; panneaux[i].classList.add(dir); }
      boutons.forEach(function (b, k) { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      seg.style.setProperty('--i', i); actif = i;
    }
    var x0 = null, y0 = null;
    conteneur.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    conteneur.addEventListener('touchend', function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) aller(actif + (dx < 0 ? 1 : -1));
    }, { passive: true });
    aller(0);
  }

  // « Avec ou sans traçabilité »
  Array.prototype.forEach.call(document.querySelectorAll('[data-frise]'), function (f) {
    var rangs = Array.prototype.slice.call(f.querySelectorAll('.fr-row'));
    var lib = rangs.map(function (r) { var l = r.querySelector('.fr-lab'); return l ? (l.firstChild && l.firstChild.nodeValue || l.textContent).trim() : ''; });
    bascule(f, rangs, lib, EN ? 'With or without traceability' : 'Avec ou sans traçabilité');
  });
  // « Ce que nous faisons pour vous »
  Array.prototype.forEach.call(document.querySelectorAll('.offres'), function (o) {
    var cartes = Array.prototype.slice.call(o.querySelectorAll(':scope > .offre'));
    // La bascule remplace le « Voir plus » posé par menu.js
    cartes.forEach(function (c) { c.classList.remove('vp-cache'); });
    var vp = o.nextElementSibling; if (vp && vp.classList.contains('vp-btn')) vp.remove();
    bascule(o, cartes, cartes.map(function (c) { var h = c.querySelector('h3'); return h ? h.textContent.trim() : ''; }), EN ? 'Our offer' : 'Notre offre');
  });

  // « Ce que disent les textes » : grands blocs empilés qui apparaissent au défilement (plus de défilement de côté)
  Array.prototype.forEach.call(document.querySelectorAll('ol.textes'), function (ol) {
    ol.classList.add('pile-textes');
    if (reduce || !('IntersectionObserver' in window)) return;
    ol.classList.add('apparition');
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    Array.prototype.forEach.call(ol.children, function (li) { io.observe(li); });
  });
})();
