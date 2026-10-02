// VB Safety · page Innovation : mise en avant de la carte survolée, léger déplacement du système central.
(function () {
  var map = document.getElementById('innovationMap'), system = document.getElementById('imSystem');
  if (!map || !system) return;
  var cards = Array.prototype.slice.call(map.querySelectorAll('.node-card'));
  function on(card) { map.classList.add('focus'); cards.forEach(function (c) { c.classList.toggle('active', c === card); }); }
  function off(card) { map.classList.remove('focus'); card.classList.remove('active'); }
  cards.forEach(function (card) {
    card.addEventListener('mouseenter', function () { on(card); });
    card.addEventListener('mouseleave', function () { off(card); });
    card.addEventListener('focusin', function () { on(card); });
    card.addEventListener('focusout', function () { off(card); });
  });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var small = window.matchMedia('(max-width: 900px)');
  map.addEventListener('pointermove', function (e) {
    if (small.matches || e.pointerType === 'touch') return;
    var r = map.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    system.style.transform = 'translate(calc(-50% + ' + (x * 7) + 'px), calc(-50% + ' + (y * 5) + 'px))';
  });
  map.addEventListener('pointerleave', function () { system.style.transform = ''; });
})();
