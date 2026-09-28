// Onglets accessibles (clavier : flèches, Début, Fin). Sans JavaScript, tous les panneaux restent visibles.
(function () {
  document.querySelectorAll('[data-tabs]').forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role=tab]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
      if (focus !== undefined) tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    root.classList.add('is-ready');
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (n === undefined) return;
        e.preventDefault();
        select(tabs[(n + tabs.length) % tabs.length], true);
      });
    });
    // Ouvre l'onglet visé par l'ancre (#p-loi, par exemple)
    var h = location.hash.slice(1), target = h && tabs.filter(function (t) { return t.getAttribute('aria-controls') === h; })[0];
    select(target || tabs[0]);
  });
})();
