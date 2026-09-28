// Page de connexion : choix du profil de démonstration, identifiants pré-remplis.
(function () {
  // Comptes de démonstration (données fictives). Ces identifiants sont publics par conception.
  var PROFILES = {
    agent:        { role: 'agent',        matricule: 'SP-0142',  password: 'Demo-Agent-2026',  name: 'Sap. J. Leroy' },
    cos:          { role: 'cos',          matricule: 'CA-0107',  password: 'Demo-CaCos-2026',  name: 'Adj. T. Bernard' },
    commandement: { role: 'commandement', matricule: 'CI-0021',  password: 'Demo-ChefCi-2026', name: 'Cne. M. Garnier' },
    sssm:         { role: 'sssm',         matricule: 'MED-0003', password: 'Demo-Sssm-2026',   name: 'Dr C. Roche' }
  };

  var form = document.getElementById('login-form');
  var mat = document.getElementById('matricule');
  var pwd = document.getElementById('password');
  var btn = document.getElementById('login-btn');
  var msg = document.getElementById('login-msg');
  var offline = document.getElementById('offline-link');
  var codeField = document.getElementById('code-field'), codeInput = document.getElementById('code');
  var qc = new URLSearchParams(location.search).get('code');
  if (qc) { codeInput.value = qc; codeField.hidden = false; }

  function current() {
    var r = form.querySelector('input[name="role"]:checked');
    return PROFILES[r ? r.value : 'agent'];
  }
  function fill() {
    var p = current();
    mat.value = p.matricule;
    pwd.value = p.password;
    msg.hidden = true; offline.hidden = true;
  }

  // Profil passé dans l'adresse : connexion.html?profil=sssm
  var q = new URLSearchParams(location.search).get('profil');
  if (q && PROFILES[q]) form.querySelector('input[value="' + q + '"]').checked = true;
  fill();
  form.addEventListener('change', function (e) { if (e.target.name === 'role') fill(); });

  function show(text, kind) { msg.textContent = text; msg.className = 'login-msg ' + kind; msg.hidden = false; }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var p = current();
    btn.disabled = true; btn.firstElementChild.textContent = 'Connexion…';
    try {
      var s = await VBS.login(p.matricule, p.password, p.role, codeField.hidden ? '' : codeInput.value);
      location.href = VBS.HOME[s.role];
    } catch (err) {
      var em = String(err.message || '').toLowerCase();
      if (em.indexOf('code_requis') !== -1) {
        codeField.hidden = false; codeInput.focus();
        show("Cette démonstration est réservée : saisissez le code d'accès qui vous a été transmis.", 'warn');
      } else if (em.indexOf('code_invalide') !== -1) {
        codeField.hidden = false; codeInput.select();
        show("Code d'accès inconnu ou expiré. Vérifiez-le ou demandez-en un.", 'error');
      } else if (err.status === 400 || err.status === 403) {
        show('Identifiants refusés par le serveur de démonstration.', 'error');
      } else {
        show('Le serveur de démonstration ne répond pas pour le moment.', 'warn');
        offline.hidden = false;
      }
    } finally {
      btn.disabled = false; btn.firstElementChild.textContent = 'Se connecter';
    }
  });

  offline.addEventListener('click', function () {
    var s = VBS.offlinePreview(current());
    location.href = VBS.HOME[s.role];
  });
})();
