/* VB Safety · page scannée — fond de braises.
   Reprise autonome de l'effet de la page d'accueil : quelques points qui montent,
   une partie couleur braise. Aucune dépendance, et rien ne tourne si l'appareil
   demande à limiter les animations ou si l'onglet passe en arrière-plan. */

(function () {
  'use strict';

  var toile = document.getElementById('fond');
  if (!toile || !toile.getContext) return;

  var limite = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx = toile.getContext('2d'), L = 0, H = 0, pts = [], t = 0;

  function dimensionner(force) {
    var w = window.innerWidth, h = window.innerHeight;
    // Sur téléphone, la barre d'adresse fait varier la hauteur : on ignore les petits écarts.
    if (!force && w === L && Math.abs(h - H) < 160) return;
    L = w; H = h;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    toile.width = w * dpr; toile.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = w <= 700 ? 26 : 44;
    pts = Array.from({ length: n }, function () {
      return {
        braise: Math.random() < 0.35,
        a: 0.35 + Math.random() * 0.3,
        ph: Math.random() * 6.28,
        k: Math.random() * 0.4 + 0.15,
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.6,
        vx: 0, vy: 0
      };
    });
    dessiner();
  }

  function dessiner() {
    ctx.clearRect(0, 0, L, H);
    pts.forEach(function (p) {
      ctx.fillStyle = p.braise
        ? 'rgba(234, 122, 68, ' + p.a.toFixed(2) + ')'
        : 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function animer() {
    if (!document.hidden) {
      t += 0.016;
      pts.forEach(function (p) {
        var vx = Math.sin(t * 1.3 + p.ph) * 0.12, vy = -p.k;
        p.vx += (vx - p.vx) * 0.025;
        p.vy += (vy - p.vy) * 0.025;
        p.x += p.vx; p.y += p.vy;
        if (p.y < -4) { p.y = H + 4; p.x = Math.random() * L; }
        if (p.x < -4) p.x = L + 4; else if (p.x > L + 4) p.x = -4;
      });
      dessiner();
    }
    requestAnimationFrame(animer);
  }

  dimensionner(true);
  window.addEventListener('resize', function () { dimensionner(false); });
  if (!limite) requestAnimationFrame(animer);
})();
