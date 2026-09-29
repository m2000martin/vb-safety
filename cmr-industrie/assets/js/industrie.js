// Onglet de chapitre actif selon la section visible. Aucun traceur.
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.chapters a'));
  var map = links.map(function (a) { return { a: a, el: document.querySelector(a.getAttribute('href')) }; }).filter(function (x) { return x.el; });
  if (!('IntersectionObserver' in window) || !map.length) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      map.forEach(function (x) {
        var on = x.el === e.target;
        x.a.classList.toggle('on', on);
        if (on) x.a.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  map.forEach(function (x) { io.observe(x.el); });
})();
