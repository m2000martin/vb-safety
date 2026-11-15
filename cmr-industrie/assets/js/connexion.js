// Connexion à la démo Industrie & BTP : simple barrière d'accès, pas une authentification.
// Le code est vérifié dans le navigateur (déchiffrement d'un témoin) ; la démo ne contient que des données fictives.
(function () {
  var form = document.getElementById('login-form'), code = document.getElementById('code');
  var btn = document.getElementById('login-btn'), msg = document.getElementById('login-msg');
  function show(t, kind) { msg.textContent = t; msg.className = 'login-msg ' + kind; msg.hidden = false; }
  // Vérification du code sans empreinte publiée : on tente de déchiffrer un témoin (PBKDF2-SHA256 300 000 itérations, AES-GCM)
  var CHECK = 'gMsXeRN/yCsN/E1Iie9/wh+mGMQ7SFVJQOgWCQbdTfMDMWlqjZDH4Ii49nw1k1dg/hA=';
  async function codeOk(code) { try { var raw = Uint8Array.from(atob(CHECK), function (c) { return c.charCodeAt(0); }), salt = raw.slice(0, 16), iv = raw.slice(16, 28), ct = raw.slice(28);
    var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(code || '').replace(/\s+/g, '').toUpperCase()), 'PBKDF2', false, ['deriveKey']);
    var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 300000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct)) === 'vbs-ok'; } catch (e) { return false; } }
  var qc = new URLSearchParams(location.search).get('code'); if (qc) code.value = qc;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = code.value.trim().toUpperCase().replace(/\s+/g, '');
    if (!v) { show("Saisissez le code d'accès qui vous a été transmis.", 'warn'); code.setAttribute('aria-invalid', 'true'); code.focus(); return; }
    if (!window.crypto || !crypto.subtle) { show('Votre navigateur ne permet pas de vérifier le code. Ouvrez la page en https.', 'error'); return; }
    btn.disabled = true; btn.firstElementChild.textContent = 'Connexion…';
    codeOk(v).then(function (okc) {
      if (!okc) {
        btn.disabled = false; btn.firstElementChild.textContent = 'Se connecter';
        code.setAttribute('aria-invalid', 'true'); code.select();
        show("Code d'accès incorrect. Vérifiez-le ou demandez un accès.", 'error'); return;
      }
      try { localStorage.setItem('vbs-duerp-acces', '1'); } catch (x) {}
      var suite = new URLSearchParams(location.search).get('suite') || '';
      // Retour vers la page demandée, uniquement vers l'espace Industrie & BTP ou la page DUERP
      if (/^\/(cmr-industrie\/[^\/]|duerp\/)/.test(suite) && suite.indexOf('//') === -1 && suite.indexOf('/cmr-industrie/outil') !== 0) { location.href = suite; return; }
      if (form.getAttribute('data-suite')) { location.href = form.getAttribute('data-suite'); return; }
      try { sessionStorage.setItem('vbs-ind-demo', '1'); } catch (x) {}
      try { sessionStorage.setItem('vbs-ind-demo-start', '1'); } catch (x) {}
      location.href = '/cmr-industrie/outil/';
    });
  });
})();
