// VB Safety · pages de présentation VB CMR sur téléphone : blocs empilés qui apparaissent au défilement (comme les pages métier).
(function () {
  'use strict';
  var mq = window.matchMedia('(max-width: 700px)');
  if (!mq.matches) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Plus de « Voir plus » : tout est affiché, en grands blocs
  Array.prototype.forEach.call(document.querySelectorAll('.vp-cache'), function (x) { x.classList.remove('vp-cache'); });
  Array.prototype.forEach.call(document.querySelectorAll('.vp-btn'), function (b) { b.remove(); });
  if (reduce || !('IntersectionObserver' in window)) return;
  var SEL = 'main .card, main .ob, main .feat, main .pillar, main .hier-row, main .epi-line, main .demo-band, main .tool-band, main .eh-block, main .reg-list li, main .steps4 li, main .g-key, main .g-callout';
  var els = document.querySelectorAll(SEL);
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vu-o'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  Array.prototype.forEach.call(els, function (el) { if (el.closest('.locked-ghost, .roles, .frise, .pillars')) return; el.classList.add('app-o'); io.observe(el); });
})();

// Téléphone : points de position sous les cartes « Pourquoi / Comment / Vos données »
(function () {
  var t = document.querySelector('.pillars'); if (!t || !window.matchMedia('(max-width: 700px)').matches) return;
  var items = Array.prototype.slice.call(t.children); if (items.length < 2) return;
  var d = document.createElement('div'); d.className = 'pillars-points'; d.setAttribute('aria-hidden', 'true');
  items.forEach(function () { d.appendChild(document.createElement('span')); }); t.insertAdjacentElement('afterend', d);
  function maj() { var x = t.scrollLeft, best = 0, m = 1e9; items.forEach(function (it, i) { var v = Math.abs(it.offsetLeft - items[0].offsetLeft - x); if (v < m) { m = v; best = i; } }); Array.prototype.forEach.call(d.children, function (s, i) { s.classList.toggle('on', i === best); }); }
  t.addEventListener('scroll', maj, { passive: true }); maj();
})();
