// VB Safety · page Capteurs de contamination (téléphone) : points de position sous les cartes qui défilent de côté.
(function () {
  'use strict';
  var list = document.querySelector('.lab-list'); if (!list) return;
  var items = Array.prototype.slice.call(list.children); if (items.length < 2) return;
  var EN = (document.documentElement.lang || '').indexOf('en') === 0;
  var dots = document.createElement('div'); dots.className = 'lab-points';
  items.forEach(function (it, i) {
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', (EN ? 'Topic ' : 'Sujet ') + (i + 1) + '/' + items.length);
    b.addEventListener('click', function () { list.scrollTo({ left: it.offsetLeft - items[0].offsetLeft, behavior: 'smooth' }); });
    dots.appendChild(b);
  });
  list.insertAdjacentElement('afterend', dots);
  var raf = 0;
  function maj() {
    raf = 0; var x = list.scrollLeft, best = 0, d = Infinity;
    items.forEach(function (it, i) { var dd = Math.abs(it.offsetLeft - items[0].offsetLeft - x); if (dd < d) { d = dd; best = i; } });
    Array.prototype.forEach.call(dots.children, function (b, i) { b.setAttribute('aria-current', i === best ? 'true' : 'false'); });
  }
  list.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(maj); }, { passive: true });
  maj();
})();
