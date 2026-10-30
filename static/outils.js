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
  Array.prototype.forEach.call(els, function (el) { if (el.closest('.locked-ghost, .roles, .frise')) return; el.classList.add('app-o'); io.observe(el); });
})();
