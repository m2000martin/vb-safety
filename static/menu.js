// VB Safety · téléphone : menu déroulant, liens du site dans le menu des outils, listes longues repliées.
(function () {
  'use strict';
  var EN = (document.documentElement.lang || '').indexOf('en') === 0;
  var T = EN ? { menu: 'Menu', more: 'Show more ({n})', less: 'Show less', other: 'VB Safety' } : { menu: 'Menu', more: 'Voir plus ({n})', less: 'Voir moins', other: 'Autres pages VB Safety' };

  // 1. En-tête .top : bouton Menu, panneau déroulant par-dessus la page
  var top = document.querySelector('header.top'), ong = top && top.querySelector('.onglets');
  if (top && ong) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'mm-btn'; btn.setAttribute('aria-expanded', 'false');
    if (!ong.id) ong.id = 'onglets'; btn.setAttribute('aria-controls', ong.id);
    btn.innerHTML = '<span class="mm-ico" aria-hidden="true"></span><span>' + T.menu + '</span>';
    top.querySelector('.wrap').appendChild(btn);
    var cta = top.querySelector('.ecrire');
    if (cta) { var c = cta.cloneNode(true); c.className = 'mm-cta'; ong.appendChild(c); }
    var set = function (o) { top.classList.toggle('mm-open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); };
    btn.addEventListener('click', function () { set(!top.classList.contains('mm-open')); });
    ong.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && top.classList.contains('mm-open')) { set(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (top.classList.contains('mm-open') && !top.contains(e.target)) set(false); });
  }

  // 2. Pages outils : les liens de la barre VB Safety passent dans le menu de l'en-tête
  var barre = document.querySelector('.vbs-barre nav'), nav = document.querySelector('.site-header .nav');
  if (barre && nav && !nav.querySelector('.nav-autres')) {
    var g = document.createElement('div'); g.className = 'nav-autres';
    g.innerHTML = '<span>' + T.other + '</span>';
    Array.prototype.forEach.call(barre.querySelectorAll('a'), function (a) { g.appendChild(a.cloneNode(true)); });
    nav.appendChild(g);
  }

  // 3. « Voir plus » : sur téléphone, une liste plus haute qu'un écran ne montre que ses premiers éléments
  var SEL = '.grille-3, .offres, .etapes, .textes, .res-grille, .autres, .feat-grid, .ob-grid, .cd-grid, .pillars4, .pillars, .roles, .hier, .reg-list, .ev-sources, .ev-method';
  var mq = window.matchMedia('(max-width: 700px)');
  function plier() {
    if (!mq.matches) return;
    Array.prototype.forEach.call(document.querySelectorAll(SEL), function (grid) {
      if (grid.dataset.vp) return;
      var items = Array.prototype.filter.call(grid.children, function (x) { return !x.classList.contains('vp-btn'); });
      var vh = window.innerHeight || 800;
      if (items.length < 3 || grid.offsetHeight < vh * 0.9) return;
      var keep = 0, cum = 0;
      while (keep < items.length && (keep === 0 || cum + items[keep].offsetHeight <= vh * 0.6)) { cum += items[keep].offsetHeight; keep++; }
      var hidden = items.slice(keep);
      if (!hidden.length) return;
      grid.dataset.vp = '1';
      hidden.forEach(function (x) { x.classList.add('vp-cache'); });
      var b = document.createElement('button'); b.type = 'button'; b.className = 'vp-btn'; b.setAttribute('aria-expanded', 'false');
      b.textContent = T.more.replace('{n}', hidden.length);
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') !== 'true';
        hidden.forEach(function (x) { x.classList.toggle('vp-cache', !open); });
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
        b.textContent = open ? T.less : T.more.replace('{n}', hidden.length);
        if (!open) grid.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
      grid.insertAdjacentElement('afterend', b);
    });
  }
  plier(); if (mq.addEventListener) mq.addEventListener('change', plier);
})();
