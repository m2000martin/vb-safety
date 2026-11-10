// VB Safety · compteur de visites hébergé sur notre serveur (France). Aucun cookie, aucun service tiers.
// Envoie : page, site d'origine, fuseau horaire, largeur d'écran, langue. Respecte « Ne pas me pister ».
(function () {
  var API = 'https://api.vb-safety.com/api/vbs/hit', off = false;
  try { off = !!localStorage.getItem('vbs-no-stats'); } catch (e) {}

  // Bouton d'opposition (page Confidentialité)
  var opt = document.querySelector('[data-stats-optout]');
  if (opt) {
    var etat = function () { opt.textContent = off ? 'Mes visites ne sont plus comptées sur cet appareil. Annuler' : 'Ne plus compter mes visites sur cet appareil'; opt.setAttribute('aria-pressed', off ? 'true' : 'false'); };
    etat();
    opt.addEventListener('click', function () { off = !off; try { off ? localStorage.setItem('vbs-no-stats', '1') : localStorage.removeItem('vbs-no-stats'); } catch (e) {} etat(); });
  }

  if (off || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  if (location.protocol === 'file:' || /^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname)) return;

  function send(evt) {
    try {
      var ref = '', src = '';
      try { var u = new URL(document.referrer); if (u.hostname !== location.hostname) ref = u.hostname; } catch (e) {}
      try { src = new URLSearchParams(location.search).get('utm_source') || ''; } catch (e) {}
      var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
      var body = JSON.stringify({ p: location.pathname, r: ref, s: src, tz: tz, w: window.innerWidth, l: document.documentElement.lang || '', e: evt || 'vue' });
      if (navigator.sendBeacon) navigator.sendBeacon(API, new Blob([body], { type: 'text/plain' }));
      else fetch(API, { method: 'POST', body: body, keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain' } }).catch(function () {});
    } catch (e) {}
  }
  window.vbsEvt = send;
  send('vue');

  // Clics suivis : uniquement les boutons qui comptent pour nous
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('a[href], [data-evt]') : null; if (!a) return;
    var n = a.getAttribute('data-evt'), h = a.getAttribute('href') || '';
    if (!n) {
      if (/evaluation\.html/.test(h)) n = 'outil-duerp';
      else if (/connexion\.html/.test(h)) n = 'demo-pompier';
      else if (/\/devis\/$/.test(h)) n = 'devis';
      else if (/\.(xlsx|pdf)$/.test(h)) n = 'telechargement';
      else if (/^mailto:/.test(h)) n = 'email';
      else if (/#contact$/.test(h)) n = 'contact';
    }
    if (n) send('clic:' + n);
  }, true);
})();
