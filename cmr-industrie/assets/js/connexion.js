// Connexion à la démo Industrie & BTP : simple barrière d'accès, pas une authentification.
// Le code est vérifié dans le navigateur par son empreinte ; la démo ne contient que des données fictives.
(function () {
  var CODE_HASH = '1f25a3f79dc7cbc6a54cd05250b81875c13d1f455bbeb72d926f96e347d01ac3';
  var form = document.getElementById('login-form'), code = document.getElementById('code');
  var btn = document.getElementById('login-btn'), msg = document.getElementById('login-msg');
  function show(t, kind) { msg.textContent = t; msg.className = 'login-msg ' + kind; msg.hidden = false; }
  function sha256(t) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    });
  }
  var qc = new URLSearchParams(location.search).get('code'); if (qc) code.value = qc;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = code.value.trim().toUpperCase().replace(/\s+/g, '');
    if (!v) { show("Saisissez le code d'accès qui vous a été transmis.", 'warn'); code.setAttribute('aria-invalid', 'true'); code.focus(); return; }
    if (!window.crypto || !crypto.subtle) { show('Votre navigateur ne permet pas de vérifier le code. Ouvrez la page en https.', 'error'); return; }
    btn.disabled = true; btn.firstElementChild.textContent = 'Connexion…';
    sha256(v).then(function (h) {
      if (h !== CODE_HASH) {
        btn.disabled = false; btn.firstElementChild.textContent = 'Se connecter';
        code.setAttribute('aria-invalid', 'true'); code.select();
        show("Code d'accès incorrect. Vérifiez-le ou demandez un accès.", 'error'); return;
      }
      try { localStorage.setItem('vbs-duerp-acces', '1'); } catch (x) {}
      var suite = new URLSearchParams(location.search).get('suite') || '';
      // Retour vers la page demandée, uniquement à l'intérieur de l'espace Industrie & BTP
      if (/^\/cmr-industrie\/[^\/]/.test(suite) && suite.indexOf('//') === -1 && suite.indexOf('/cmr-industrie/outil') !== 0) { location.href = suite; return; }
      if (form.getAttribute('data-suite')) { location.href = form.getAttribute('data-suite'); return; }
      try { sessionStorage.setItem('vbs-ind-demo', '1'); } catch (x) {}
      try { sessionStorage.setItem('vbs-ind-demo-start', '1'); } catch (x) {}
      location.href = '/cmr-industrie/outil/';
    });
  });
})();
