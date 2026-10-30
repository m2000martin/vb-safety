// VB Safety · « Comment ça marche » : relie les étapes par un tracé qui serpente ; il se dessine au défilement et allume chaque étape atteinte.
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  Array.prototype.forEach.call(document.querySelectorAll('ol.etapes'), function (ol) {
    var items = Array.prototype.slice.call(ol.children); if (items.length !== 4) return;
    ol.classList.add('serp');
    items.forEach(function (li, i) {
      var c = document.createElement('div'); c.className = 'serp-c';
      while (li.firstChild) c.appendChild(li.firstChild);
      var pt = document.createElement('span'); pt.className = 'serp-pt'; pt.setAttribute('aria-hidden', 'true'); pt.textContent = '0' + (i + 1);
      c.appendChild(pt); li.appendChild(c);
      li.addEventListener('mouseenter', function () { li.classList.add('actif'); });
      li.addEventListener('mouseleave', function () { li.classList.remove('actif'); });
    });
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'serp-svg'); svg.setAttribute('aria-hidden', 'true');
    var fond = document.createElementNS(NS, 'path'); fond.setAttribute('class', 'fond');
    var trace = document.createElementNS(NS, 'path'); trace.setAttribute('class', 'trace');
    svg.appendChild(fond); svg.appendChild(trace); ol.insertBefore(svg, ol.firstChild);
    var pts = [], len = 0, marks = [];
    function centres() {
      var o = ol.getBoundingClientRect();
      return items.map(function (li) { var r = li.querySelector('.serp-pt').getBoundingClientRect(); return { x: r.left + r.width / 2 - o.left, y: r.top + r.height / 2 - o.top }; });
    }
    function construire() {
      pts = centres(); var d = 'M' + pts[0].x + ' ' + pts[0].y;
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y;
        if (Math.abs(dx) > 20) d += ' C' + (a.x + dx * .5) + ' ' + a.y + ' ' + (b.x - dx * .5) + ' ' + b.y + ' ' + b.x + ' ' + b.y;
        else { var s = i % 2 ? 1 : -1, w = 26 * s; d += ' C' + (a.x + w) + ' ' + (a.y + dy * .35) + ' ' + (b.x + w) + ' ' + (b.y - dy * .35) + ' ' + b.x + ' ' + b.y; }
      }
      fond.setAttribute('d', d); trace.setAttribute('d', d);
      len = trace.getTotalLength();
      // Position de chaque étape le long du tracé
      marks = pts.map(function (p) { var best = 0, bd = Infinity; for (var l = 0; l <= len; l += 4) { var q = trace.getPointAtLength(l), dd = (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y); if (dd < bd) { bd = dd; best = l; } } return best; });
      trace.style.strokeDasharray = len + ' ' + len; maj();
    }
    function maj() {
      var p;
      if (reduce) p = 1;
      else { var r = ol.getBoundingClientRect(), vh = window.innerHeight; p = (vh * .78 - r.top) / (r.height + vh * .2); p = Math.max(0, Math.min(1, p)); }
      var l = p * len; trace.style.strokeDashoffset = len - l;
      items.forEach(function (li, i) { li.classList.toggle('on', l >= marks[i] - 2); });
    }
    var raf = 0;
    window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; maj(); }); }, { passive: true });
    window.addEventListener('resize', function () { construire(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(construire);
    construire();
  });
})();
