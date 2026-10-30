// VB Safety · pages métier : fond de particules (même rendu que l'accueil). Téléphone : braises, vapeur ou poussière selon le métier.
(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var p0 = location.pathname, mode = /pompier|firefighter/.test(p0) ? 'pompiers' : /industr/.test(p0) ? 'industrie' : /btp|construction/.test(p0) ? 'btp' : null;
  // Pages de lecture (guides, mentions) : particules plus discrètes pour ne pas gêner le texte
  var doux = /\/ressources\/.+|mentions-legales|confidentialite/.test(p0);
  var canvas = document.createElement('canvas'); canvas.id = 'fond-particules'; if (doux) canvas.style.opacity = '.4'; canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);
  var ctx = canvas.getContext('2d'), width = 0, height = 0, parts = [], t = 0;
  function resize(force) {
    var w = window.innerWidth, h = window.innerHeight;
    if (!force && w === width && Math.abs(h - height) < 160) return;
    width = w; height = h;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var tel = w <= 700, n = tel ? 26 : Math.round(Math.min(60, Math.max(24, (w * h) / 20000)));
    parts = Array.from({ length: n }, function () {
      return { tel: tel, e: tel && mode === 'pompiers' && Math.random() < 0.35, a: 0.35 + Math.random() * 0.3, ph: Math.random() * 6.28, k: Math.random() * 0.4 + 0.15,
        x: Math.random() * w, y: Math.random() * h, r: tel ? Math.random() * 1.5 + 0.6 : Math.random() * 1.8 + 0.8, vx: 0, vy: -(Math.random() * 0.4 + 0.15) };
    });
  }
  function frame() {
    if (!document.hidden) {
      t += 0.016; ctx.clearRect(0, 0, width, height);
      parts.forEach(function (p) {
        var tvx = 0, tvy = -p.k;
        if (p.tel && mode === 'btp') { tvx = 0.25 + p.k * 0.8; tvy = 0.05 + Math.sin(t + p.ph) * 0.08; }
        else if (p.tel && mode === 'industrie') { tvx = Math.sin(t * 0.6 + p.ph) * 0.3; tvy = -p.k * 0.45; }
        else if (p.tel) { tvx = Math.sin(t * 1.3 + p.ph) * 0.12; }
        p.vx += (tvx - p.vx) * 0.025; p.vy += (tvy - p.vy) * 0.025; p.x += p.vx; p.y += p.vy;
        if (p.y < -4) p.y = height + 4; else if (p.y > height + 4) p.y = -4;
        if (p.x < -4) p.x = width + 4; else if (p.x > width + 4) p.x = -4;
        ctx.fillStyle = !p.tel ? 'rgba(255, 255, 255, 0.9)' : p.e ? 'rgba(234, 122, 68, ' + p.a.toFixed(2) + ')' : 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('resize', function () { resize(false); });
  resize(true); requestAnimationFrame(frame);
})();
