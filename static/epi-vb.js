// Page Module EPI : « Quels EPI sont concernés ? » en bandeau qui défile sans fin.
// La liste est doublée pour que le retour au début soit invisible ; le défilement s'arrête au survol.
(function () {
  var ul = document.querySelector('.p-epi .epi-kinds ul.kinds5');
  if (!ul || ul.classList.contains('defile')) return;

  var cadre = document.createElement('div');
  cadre.className = 'epi-cadre';
  ul.parentNode.insertBefore(cadre, ul);
  cadre.appendChild(ul);

  var copies = Array.prototype.map.call(ul.children, function (li) {
    var c = li.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    return c;
  });
  copies.forEach(function (c) { ul.appendChild(c); });
  ul.classList.add('defile');
})();
